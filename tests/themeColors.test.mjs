// テーマの 色（src/themeColors.css・src/theme.js の themedColor）の テスト：npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { themedColor } from "../src/theme.js";

const css = readFileSync(new URL("../src/themeColors.css", import.meta.url), "utf8");
const block = (sel) => {
  const i = css.indexOf(sel + "{");
  assert.ok(i >= 0, sel + " が ある");
  return css.slice(i, css.indexOf("\n}", i));
};
const vars = (s) => Object.fromEntries([...s.matchAll(/--([\w-]+):([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const root = vars(block(":root"));
const prince = vars(block('html[data-theme="prince"]'));

// ピンク・紫（色相 250〜345°）か
function isPinkPurple(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) return false;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return s >= 0.12 && l <= 0.97 && h >= 250 && h <= 345;
}

test("themedColor：色を テーマの 変数に（無い ときの 色は もとの まま）", () => {
  assert.equal(themedColor("#FFC2DA"), "var(--tc-ffc2da, #FFC2DA)");
  assert.equal(themedColor("#C9A8F0"), "var(--lav, #C9A8F0)");
  assert.equal(themedColor("#C9A8F0", "text"), "var(--lav-text, var(--lav, #C9A8F0))");
  assert.equal(themedColor(undefined), undefined);
  assert.equal(themedColor("red"), "red");
});

test("プリンセス（:root）の --tc-xxxxxx は 名前の とおりの 色", () => {
  for (const [k, v] of Object.entries(root)) {
    const m = k.match(/^tc-([0-9a-f]{6})$/);
    if (m) assert.equal(v.toLowerCase(), "#" + m[1], k);
  }
});

test("プリンスは プリンセスの 色を ぜんぶ 上書きして いて、ピンク・紫が のこって いない", () => {
  for (const k of Object.keys(root)) {
    if (/^(gold|gold-deep|mint)$/.test(k)) continue;   // テーマで かわらない 色
    if (/^app-bg-/.test(k)) continue;                   // 背景は --tc-xxxxxx を さす だけ（プリンスでは さき の 色が かわる）
    assert.ok(k in prince, "プリンスに --" + k + " が ある");
  }
  for (const [k, v] of Object.entries(prince)) {
    if (v.startsWith("#")) assert.ok(!isPinkPurple(v), `--${k} ${v} が ピンク・紫`);
  }
});

test("画面の CSS に ピンク・紫の 色が 直書きされて いない（themeColors.css の 変数を つかう）", () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== "fonts") walk(p); } else if (p.endsWith(".css") && !p.endsWith("themeColors.css")) files.push(p); } };
  const src = new URL("../src", import.meta.url).pathname;
  walk(src);
  // App.jsx の <style> の 中も CSS
  const app = readFileSync(join(src, "App.jsx"), "utf8");
  const styleBlock = app.slice(app.indexOf("function Style()"), app.indexOf("`}</style>"));
  const sources = files.map((f) => [f, readFileSync(f, "utf8")]).concat([["App.jsx <style>", styleBlock]]);
  const bad = [];
  for (const [f, s] of sources) {
    for (const m of s.matchAll(/#([0-9a-fA-F]{6})\b/g)) if (isPinkPurple(m[0])) bad.push(`${f}: ${m[0]}`);
    for (const m of s.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      const hex = "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join("");
      if (isPinkPurple(hex)) bad.push(`${f}: ${m[0]}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("ゴリラの 背景：html[data-chara=\"gorilla\"] で 背景の 4色だけを 緑に", () => {
  const g = vars(block('html[data-chara="gorilla"]'));
  assert.deepEqual(Object.keys(g).sort(), ["app-bg-1", "app-bg-2", "app-bg-3", "app-bg-4"]);
  for (const v of Object.values(g)) assert.ok(!isPinkPurple(v), v);
  for (const k of Object.keys(g)) assert.ok(!(k in prince), "プリンスが --" + k + " を 上書きしない");
});
