import type { BunPlugin } from "bun";

/**
 * css-tree/csso load their JSON data files via `createRequire(import.meta.url)`.
 * Bun's compiler doesn't statically bundle those calls (only actual `import`s),
 * so at runtime it tries to resolve the JSON relative to the compiled binary's
 * virtual filesystem root and fails with "Cannot find module '../data/patch.json'".
 * This plugin rewrites those specific files at build time (node_modules on disk
 * are left untouched) to use static `import`s instead, which Bun embeds correctly.
 */
const fixCreateRequireJson: BunPlugin = {
  name: "fix-createrequire-json",
  setup(build) {
    build.onLoad(
      { filter: /(?:css-tree[\/\\]lib[\/\\](?:data-patch|data|version)\.js|csso[\/\\]lib[\/\\]version\.js)$/ },
      async (args) => {
        const source = await Bun.file(args.path).text();
        const seen = new Map<string, string>();
        let transformed = source.replace(/require\((['"])([^'"]+)\1\)/g, (_match, _quote, path) => {
          let name = seen.get(path);
          if (!name) {
            name = `__patchedRequire${seen.size}`;
            seen.set(path, name);
          }
          return name;
        });
        transformed = transformed
          .replace(/import\s*\{\s*createRequire\s*\}\s*from\s*['"](?:node:)?module['"];?\n?/g, "")
          .replace(/const\s+require\s*=\s*createRequire\(import\.meta\.url\);?\n?/g, "");
        const imports = [...seen.entries()]
          .map(([path, name]) => `import ${name} from ${JSON.stringify(path)};`)
          .join("\n");
        return { contents: `${imports}\n${transformed}`, loader: "js" };
      }
    );
  }
};

const resultLinux = await Bun.build({
  entrypoints: ["./index.ts"],
  compile: {
    outfile: "./Arachnidium-api",
    target: "bun-linux-x64"
  },
  plugins: [fixCreateRequireJson]
});
if (!resultLinux.success) {
  for (const log of resultLinux.logs) console.error(log);
  process.exit(1);
}

const resultWindows = await Bun.build({
  entrypoints: ["./index.ts"],
  compile: {
    outfile: "./Arachnidium-api",
    target: "bun-windows-x64"
  },
  plugins: [fixCreateRequireJson]
});
if (!resultWindows.success) {
  for (const log of resultWindows.logs) console.error(log);
  process.exit(1);
}
