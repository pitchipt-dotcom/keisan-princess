// npm test: tests/*.test.js(x) を esbuild で node 用に まとめてから、node --test で 走らせる。
// (App は import.meta.glob を使うので、テストは きまり・もんだい生成の モジュールだけを読む)
import { build } from "esbuild";
import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(here).filter((f) => /\.test\.jsx?$/.test(f)).map((f) => join(here, f));
// npm の パッケージ(react など)は まとめず、node_modules から読む。そのため 出力も node_modules の下に置く。
const out = join(here, "..", "node_modules", ".cache", "kp-test");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
try {
  await build({ entryPoints: tests, bundle: true, platform: "node", format: "esm", jsx: "automatic",
    outdir: out, outExtension: { ".js": ".mjs" }, packages: "external", logLevel: "warning" });
  const files = readdirSync(out).filter((f) => f.endsWith(".mjs")).map((f) => join(out, f));
  const run = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
