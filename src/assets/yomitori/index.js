/* =====================================================================
   よみとりチェックの 場面イラストの 素材（人物・モノ）
   - この フォルダの ファイルを ファイル名（拡張子なし）で よぶ：asset("sticker")
   - いまは 仮の 簡単な SVG。あとで 同じ 名前の .webp／.png に さしかえれば そのまま つかえる
     （同じ 名前の ファイルが 2つ あるときは webp → png → svg の じゅんで つかう）
   - 「名前-10」は 10この まとまり（シール 10まい シート など）。無いときは 1こ分の 絵を わくで かこんで 代わりに する
   ===================================================================== */
const files = import.meta.glob("./*.{svg,png,webp}", { eager: true, query: "?url", import: "default" });
const RANK = { webp: 0, png: 1, svg: 2 };
const ASSETS = {};
for (const [path, url] of Object.entries(files)) {
  const m = /^\.\/(.+)\.(svg|png|webp)$/.exec(path);
  if (!m) continue;
  const prev = ASSETS[m[1]];
  if (!prev || RANK[m[2]] < prev.rank) ASSETS[m[1]] = { url, rank: RANK[m[2]] };
}
export const asset = (name) => (ASSETS[name] ? ASSETS[name].url : null);

// 人物（問題文での よびかた）
export const PEOPLE = {
  me: "わたし", sister: "おねえさん", brother: "おにいさん", friend: "ともだち", mom: "おかあさん",
};
// モノ（かぞえる たんいと、10この まとまりの よびかた）
export const OBJECTS = {
  sticker: { unit: "まい", pack: "10まい シート" },
  candy: { unit: "こ", pack: "10こ ふくろ" },
  pencil: { unit: "本", pack: "10本 たば" },
  book: { unit: "さつ", pack: "10さつ" },
  acorn: { unit: "こ", pack: "10こ ふくろ" },
  "flower-red": { unit: "本", pack: "10本 たば" },
  "flower-white": { unit: "本", pack: "10本 たば" },
  "flower-yellow": { unit: "本", pack: "10本 たば" },
};
