/* =====================================================================
   妖精の国 — セーブと なかよし度（純粋関数）
   セーブ：kukumajo:save:v1 の fairy キー（ほかの キーは さわらない。無い セーブは ここで おぎなう）
     fairy: { friendship: { mint: 0 }, map: ["tsumiki"], cleared: { "tsumiki:2": "2026-11-19" } }
   ※ 今回は 仮で、案内役の 妖精は 3人の プリンセス みんなで 1人（mint）。
     friendship は 妖精ごとに もつので、あとで 1人ずつに ふやしても セーブは そのまま つかえる
   ===================================================================== */
export const FAIRIES = {
  mint: { name: "ミント", desc: "つみきの森に すむ 妖精" },
  ramune: { name: "ラムネ", desc: "ジュースの泉に すむ 妖精" },
};
export const GUIDE_FAIRY = "mint";
export const AREAS = [
  { id: "tsumiki", name: "つみきの森", icon: "🧊", desc: "つみきを ころがして もようを つくろう", ready: true, fairy: "mint" },
  { id: "juice", name: "ジュースの泉", icon: "🧃", desc: "ジュースを そそいで かさを はかろう", ready: true, fairy: "ramune" },
  { id: "masume", name: "ますめの花畑", icon: "🌷", desc: "じゅんびちゅう", ready: false },
];
export const FRIEND_LEVEL = 5;      // なかよし度 5 ごとに ハートが 1つ ふえる（地図の マスを ひらく 目安。地図は まだ 作らない）

export function normalizeFairy(f) {
  const fr = f && f.friendship && typeof f.friendship === "object" ? f.friendship : {};
  const friendship = {};
  for (const id of Object.keys(FAIRIES)) friendship[id] = Number.isInteger(fr[id]) && fr[id] > 0 ? fr[id] : 0;
  for (const [id, v] of Object.entries(fr)) if (!(id in friendship) && Number.isInteger(v) && v > 0) friendship[id] = v;   // 未来の 妖精を けさない
  const map = Array.isArray(f && f.map) ? f.map.filter((x) => typeof x === "string") : [];
  if (!map.includes("tsumiki")) map.unshift("tsumiki");
  for (const a of AREAS) if (a.ready && !map.includes(a.id)) map.push(a.id);     // できあがった エリアは ひらく
  const cleared = f && f.cleared && typeof f.cleared === "object" ? { ...f.cleared } : {};
  return { ...(f && typeof f === "object" ? f : {}), friendship, map, cleared };
}
export function addFriendship(f, id, n) {
  const nf = normalizeFairy(f);
  return { ...nf, friendship: { ...nf.friendship, [id]: (nf.friendship[id] || 0) + Math.max(0, n | 0) } };
}
export function markCleared(f, area, stage, date) {
  const nf = normalizeFairy(f);
  return { ...nf, cleared: { ...nf.cleared, [`${area}:${stage}`]: date } };
}
export const friendHearts = (n) => Math.floor(n / FRIEND_LEVEL);

/* 直方体（2こ つなげた つみき）は、立方体の だんかい3を 1かい クリアしたら 出る */
export const clearKey = (kind, stage) => (kind === "cuboid" ? "tsumiki-cuboid" : "tsumiki") + ":" + stage;
export const cuboidOpen = (f) => !!normalizeFairy(f).cleared["tsumiki:3"];
