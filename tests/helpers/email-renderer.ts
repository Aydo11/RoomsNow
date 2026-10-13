import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { brand } from "../../src/brand.config";
import * as welcome from "../../src/lib/welcome-content";
import type * as Templates from "../../src/lib/email-template";

// Exercise the real server template outside Next's server-only module loader.
export function emailRenderer() {
 const source = readFileSync(new URL("../../src/lib/email-template.ts", import.meta.url), "utf8");
 const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const exports = {};
 runInNewContext(code, { exports, process: { env: { APP_URL: "https://www.roomsnow.co.uk" } }, require: (name: string) => {
   if (name === "server-only") return {};
   if (name === "@/brand.config") return { brand };
   if (name === "./welcome-content") return welcome;
   throw new Error(`Unexpected email dependency: ${name}`);
 } });
 return exports as typeof Templates;
}
