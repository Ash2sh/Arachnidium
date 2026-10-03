import { minify } from "@node-minify/core";
import { esbuild } from "@node-minify/esbuild";
import { minifyHtml } from '@node-minify/minify-html';
import * as html from "node-html-parser";
import * as svgo from "svgo";

async function minifyJS(code: string) {
  try {
    const trimmed = code.trim();

    // 1. Если это HTML (ошибка 503/404 от сервера), не передаем в esbuild
    if (trimmed.startsWith("<")) {
      return code;
    }

    // 2. Исправленный баг с JSON: если пришел JSON, минимизируем его, а не оборачиваем в кавычки
    try {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed);
    } catch (_) { }

    const minified = await minify({
      compressor: esbuild,
      type: "js",
      content: code
    });
    return minified;
  } catch (e) {
    // Не спамим длинными трейсами в консоль при ошибках синтаксиса
    return code;
  }
}

async function minifyCSS(code: string) {
  try {
    const trimmed = code.trim();
    if (trimmed.startsWith("<")) {
      return code;
    }

    const minified = await minify({
      compressor: esbuild,
      type: "css",
      content: code
    });
    return minified;
  } catch (e) {
    return code;
  }
}

async function minifySVG(code: string) {
  try {
    const minified = svgo.optimize(code, {
      floatPrecision: 1,
      multipass: true,
      plugins: [
        {
          name: "cleanupListOfValues",
          params: { floatPrecision: 1 }
        },
        {
          name: "preset-default",
          params: {
            overrides: {
              "cleanupNumericValues": { floatPrecision: 1 },
              "mergePaths": { floatPrecision: 1 },
              "convertShapeToPath": { floatPrecision: 1 },
              "convertTransform": { floatPrecision: 1, degPrecision: 0 },
              "convertPathData": { floatPrecision: 1, transformPrecision: 1 }
            }
          }
        }
      ]
    });
    return minified.data;
  } catch (e) {
    return code;
  }
}

async function minifyHTML(code: string, baseURL: string): Promise<{ code: string, links: string[] }> {
  try {
    const root = html.parse(code, {
      preserveTagNesting: true,
      parseNoneClosedTags: true
    });

    // 1. Минификация вложенных <script>
    const scripts = root.querySelectorAll("script");
    for (const script of scripts) {
      if (!script.innerHTML.trim()) continue;
      script.innerHTML = await minifyJS(script.innerHTML);
    }

    // 2. Минификация вложенных <style>
    const stylesheets = root.querySelectorAll("style");
    for (const stylesheet of stylesheets) {
      if (!stylesheet.innerHTML.trim()) continue;
      stylesheet.innerHTML = await minifyCSS(stylesheet.innerHTML);
    }

    // 3. Оптимизация SVG
    const svgs = root.querySelectorAll("svg");
    for (const svg of svgs) {
      if (!svg.innerHTML.trim()) continue;

      const elementsBefore = svg.querySelectorAll("*");
      for (const element of elementsBefore) {
        for (const attribute in element.attributes) {
          if (!element.getAttribute(attribute)) {
            element.setAttribute(attribute, "////EMPTY////");
          }
        }
      }

      const minified = await minifySVG(svg.innerHTML);
      svg.innerHTML = minified;

      const elementsAfter = svg.querySelectorAll("*");
      for (const element of elementsAfter) {
        for (const attribute in element.attributes) {
          if (element.getAttribute(attribute) === "////EMPTY////") {
            element.setAttribute(attribute, "");
          }
        }
      }
    }

    // 4. Удаление атрибутов integrity для предотвращения блокировок браузером
    const imports = root.querySelectorAll("script, link");
    for (const element of imports) {
      if (element.hasAttribute("integrity")) {
        element.removeAttribute("integrity");
      }
    }

    // 5. Внедрение скрипта-хака
    const integrityHack = `<script>[HTMLScriptElement,HTMLLinkElement].forEach(e=>{Object.defineProperty(e.prototype,"integrity",{set:()=>{}})})</script>`;
    const headTag = root.querySelector("head");
    if (headTag) {
      headTag.innerHTML = integrityHack + headTag.innerHTML;
    } else {
      root.innerHTML = integrityHack + root.innerHTML;
    }

    // 6. Безопасный сбор всех ссылок для speculative cache
    const rawLinks = [
      ...root.querySelectorAll("[src]").map(e => e.getAttribute("src")),
      ...root.querySelectorAll("link[href]").map(e => e.getAttribute("href"))
    ].filter((v): v is string => Boolean(v) && !v.startsWith("data:") && !v.startsWith("javascript:"));

    const links: string[] = [];
    for (const link of rawLinks) {
      try {
        links.push(new URL(link, baseURL).toString());
      } catch (_) {
        // Игнорируем невалидные URL
      }
    }

    // 7. Итоговая минификация HTML
    const minifiedCode = await minify({
      compressor: minifyHtml,
      content: root.outerHTML
    });

    return { code: minifiedCode, links };
  } catch (e) {
    console.error("Failed to minify HTML:", e);
    return { code, links: [] };
  }
}

Bun.serve({
  port: 3000,
  routes: {
    "/api/minify/html": async request => {
      const json = (await request.json()) as { code: string, url: string };
      return new Response(JSON.stringify(await minifyHTML(json.code, json.url)));
    },
    "/api/minify/js": async request => {
      const code = await request.text();
      return new Response(await minifyJS(code));
    },
    "/api/minify/css": async request => {
      const code = await request.text();
      return new Response(await minifyCSS(code));
    },
    "/api/minify/svg": async request => {
      const code = await request.text();
      return new Response(await minifySVG(code));
    },
  }
});