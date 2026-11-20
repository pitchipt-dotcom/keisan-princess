/* 妖精の国の 絵。名前で よぶ。同じ 名前の .webp → .png → .svg の じゅんに さがす
   fairy-<id>.webp … 全身（地図・エリアの 画面）、fairy-<id>-bust.webp … 上半身（セリフの よこ）、fairy-<id>-face.webp … 顔（地図の アイコン）
   もとの 絵：SHA の ~/moss-mcp/outputs/20261120_001〜004.png（白い 背景を 透過に して 余白を つめ、表示の 2ばい くらいに 縮小） */
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
// テーマ：<名前>_prince（例 fairy-mint-bust_prince.webp）が あれば それ、無ければ 共通の 絵
export const fairyArt = (name) => { const k = themedArtKey((x) => !!best[x], name, getTheme()); return k ? best[k].url : null; };
