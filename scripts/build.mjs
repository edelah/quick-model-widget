import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/client.js");
const outputPath = resolve(root, "lib/client.js");
const source = await readFile(sourcePath, "utf8");
const body = source.replace(/\nexport \{[^}]+\};\s*$/u, "\n");

const bundle = `window.__ModuleLoader__.load({
  id: "quick-model-widget",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    const React = react;
${body.split("\n").map((line) => `    ${line}`).join("\n")}
    exports.apply = apply;
    exports.inject = inject;
    exports.QuickModelWidget = QuickModelWidget;
    exports.createModelStore = createModelStore;
    return module.exports;
  }
});
`;

await writeFile(outputPath, bundle, "utf8");
