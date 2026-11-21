/* 3年生（わり算・小数・分数）の 絵。名前で よぶ。同じ 名前の .webp → .png → .svg の じゅんに さがす
   いまは 絵が ないので、画面の ほうで かりの 絵（SVG）を かく。ここに ファイルを おけば じどうで さしかわる
   ほしい 絵の 一覧：docs/grade3-art.md（画像の 中に 日本語の 文字は 入れない） */
import { getTheme, themedArtKey } from "../../theme.js";
const files = import.meta.glob("./*.{svg,png,webp}", { eager: true, query: "?url", import: "default" });
const RANK = { webp: 3, png: 2, svg: 1 };
const best = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/^\.\/(.+)\.(svg|png|webp)$/);
  if (!m) continue;
  const [, name, ext] = m;
  if (!best[name] || RANK[ext] > best[name].rank) best[name] = { rank: RANK[ext], url };
}
export const g3Art = (name) => { const k = themedArtKey((x) => !!best[x], name, getTheme()); return k ? best[k].url : null; };
