/* 妖精の国の 絵（仮の SVG）。名前で よぶ。同じ 名前の .webp → .png → .svg の じゅんに さがす
   例：fairy-mint.svg を fairy-mint.webp に さしかえると、コードを かえずに 絵が かわる */
const files = import.meta.glob("./*.{svg,png,webp}", { eager: true, query: "?url", import: "default" });
const RANK = { webp: 3, png: 2, svg: 1 };
const best = {};
for (const [path, url] of Object.entries(files)) {
  const m = path.match(/^\.\/(.+)\.(svg|png|webp)$/);
  if (!m) continue;
  const [, name, ext] = m;
  if (!best[name] || RANK[ext] > best[name].rank) best[name] = { rank: RANK[ext], url };
}
export const fairyArt = (name) => (best[name] ? best[name].url : null);
