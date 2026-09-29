import { minify } from "@node-minify/core";
import { esbuild } from "@node-minify/esbuild";
import { minifyHtml } from '@node-minify/minify-html';
import * as html from "node-html-parser";
import * as svgo from "svgo";

async function minifyJS (code: string) {
  try {
    // Sometimes we just get JSON??
    // And for some reason that crashes the minifier???
    try {
      JSON.parse(code.trim());
      return JSON.stringify(code);
    } catch (_) { }
    const minified = await minify({
      compressor: esbuild,
      type: "js",
      content: code
    });
    return minified;
  } catch (e) {
    console.error("Failed to minify JS:", e);
    return code;
  }
}

async function minifyCSS (code: string) {
  try {
    const minified = await minify({
      compressor: esbuild,
      type: "css",
      content: code
    });
    return minified;
  } catch (e) {
    console.error("Failed to minify CSS:", e);
    return code;
  }
}

async function minifySVG (code: string) {
  try {
    // Mostly default config with float precision 1
    const minified = svgo.optimize(code, {
      floatPrecision: 1,
      multipass: true,
      plugins: [
        {
          name: "cleanupListOfValues",
          params: {
            floatPrecision: 1
          }
        },
        {
          name: "preset-default",
          params: {
            overrides: {
              "cleanupNumericValues": {
                floatPrecision: 1
              },
              "mergePaths": {
                floatPrecision: 1
              },
              "convertShapeToPath": {
                floatPrecision: 1
              },
              "convertTransform": {
                floatPrecision: 1,
                degPrecision: 0
              },
              "convertPathData": {
                floatPrecision: 1,
                transformPrecision: 1
              }
            }
          }
        }
      ]
    });
    return minified.data;
  } catch (e) {
    console.error("Failed to minify SVG:", e);
    return code;
  }
}

async function minifyHTML (code: string, baseURL: string): Promise<{ code: string, links: string[] }> {
  try {
    const root = html.parse(code, {
      preserveTagNesting: true,
      parseNoneClosedTags: true
    });
    // Minify inlined JS/CSS/SVG
    const scripts = root.querySelectorAll("script");
    const stylesheets = root.querySelectorAll("style");
    const svgs = root.querySelectorAll("svg");
    for (const script of scripts) {
      if (!script.innerHTML.trim()) continue;
      script.innerHTML = await minifyJS(script.innerHTML);
    }
    code = root.outerHTML;
    for (const stylesheet of stylesheets) {
      if (!stylesheet.innerHTML.trim()) continue;
      stylesheet.innerHTML = await minifyCSS(stylesheet.innerHTML);
    }
    code = root.outerHTML;
    for (const svg of svgs) {
      if (!svg.innerHTML.trim()) continue;
      /**
       * Annoyingly, SVGO throws errors on attributes without a value.
       * To work around this, we temporarily give all empty attributes
       * a (hopefully) unique value, then remove it after optimizing.
       */
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
          if (element.getAttribute(attribute) == "////EMPTY////") {
            element.setAttribute(attribute, "");
          }
        }
      }
    }
    code = root.outerHTML;
    // Remove "integrity" attribute from existing script/link elements
    const imports = root.querySelectorAll("script, link");
    for (const element of imports) {
      if (!element.hasAttribute("integrity")) continue;
      element.removeAttribute("integrity");
    }
    // Inject script to prevent setting "integrity" programmatically
    const integrityHack = `<script>[HTMLScriptElement,HTMLLinkElement].forEach(e=>{Object.defineProperty(e.prototype,"integrity",{set:()=>{}})})</script>`;
    const headTag = root.querySelector("head");
    if (headTag) {
      headTag.innerHTML = integrityHack + headTag.innerHTML;
    } else {
      root.innerHTML = integrityHack + root.innerHTML;
    }
    code = root.outerHTML;
    code = await minify({
      compressor: minifyHtml,
      content: code
    });
    const links = root.querySelectorAll("[src]")
      .map(e => e.getAttribute("src") || "")
      .filter(v => v)
      .concat(
        root.querySelectorAll("link[href]")
          .map(e => e.getAttribute("href") || "")
          .filter(v => v)
      ).map(v => new URL(v, baseURL).toString());
    return { code, links };
  } catch (e) {
    console.error("Failed to remove integrity hashes:", e);
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
