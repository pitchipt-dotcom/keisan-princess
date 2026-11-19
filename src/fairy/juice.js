/* =====================================================================
   ジュースの泉 — かさ（L・dL・mL）（純粋関数。画面は JuiceSpring.jsx / PourScene.jsx）
   - りょうは ぜんぶ mL の 数で もつ（1dL＝100mL、1L＝1000mL）
   - 入れ物：type ごとに 入る りょう（cap）・目もり（marks）・すいつく 目もり（snaps）・そそぐ はやさ（rate）
   - そそぐ：かたむけた 角度で ながれる りょうが きまる。目もりの 線で かるく すいつく（少し 止まる）
   ===================================================================== */

export const ML_PER_DL = 100, ML_PER_L = 1000;
const range = (a, b, s) => { const r = []; for (let v = a; v <= b; v += s) r.push(v); return r; };

/* 入れ物の しゅるい（w,h は 絵の 大きさ。中の かさは 下から まっすぐ ふえる） */
export const TYPES = {
  pot:  { name: "ジュースの つぼ", cap: 2000, w: 74, h: 92,  rate: 220, marks: [], snaps: [], shape: "pot" },
  L:    { name: "1Lます",   cap: 1000, w: 78, h: 100, rate: 380, marks: range(100, 1000, 100), snaps: range(100, 1000, 100), shape: "masu" },
  dl:   { name: "1dLます",  cap: 100,  w: 40, h: 40,  rate: 90,  marks: [], snaps: [100], shape: "masu" },
  // だんかい4 の 1dLます：ふちに ちかい ところだけ 10mL の こまかい 目もり
  dlf:  { name: "1dLます",  cap: 100,  w: 64, h: 84,  rate: 70,  marks: [50, 60, 70, 80, 90], snaps: [50, 60, 70, 80, 90, 100], shape: "masu", fine: true },
  cup:  { name: "コップ",   cap: 400,  w: 38, h: 60,  rate: 140, marks: [100, 200, 300], snaps: [100, 200, 300], shape: "cup" },
  // 水そうと 1Lの けいりょうカップは たくさん いっきに そそぐので すいつかない（1Lの 線は 光る）
  tank: { name: "水そう",   cap: 2000, w: 124, h: 112, rate: 380, marks: range(100, 2000, 100), snaps: [], shape: "tank" },
  mcup: { name: "けいりょうカップ", cap: 500, w: 62, h: 120, rate: 160, marks: range(10, 500, 10), snaps: range(100, 500, 100), shape: "mcup" },
  mjug: { name: "1Lの けいりょうカップ", cap: 1000, w: 80, h: 128, rate: 300, marks: range(50, 1000, 50), snaps: [], shape: "mcup" },
};

/* ---------- あらわし方 ---------- */
export const splitLdL = (ml) => ({ L: Math.floor(Math.round(ml) / ML_PER_L), dL: Math.floor((Math.round(ml) % ML_PER_L) / ML_PER_DL) });
export function fmtLdL(ml) {
  const { L, dL } = splitLdL(ml);
  if (!L) return `${dL}dL`;
  return dL ? `${L}L${dL}dL` : `${L}L`;
}
export const fmtDL = (ml) => `${Math.round(ml / ML_PER_DL)}dL`;
export const fmtML = (ml) => `${Math.round(ml)}mL`;
/* こたえ（{ L, dL } や { mL }）→ mL。空の らんは 0 */
export function answerToML(ans) {
  const n = (v) => (v === "" || v == null ? 0 : Number(v));
  return n(ans.L) * ML_PER_L + n(ans.dL) * ML_PER_DL + n(ans.mL);
}

/* ---------- そそぐ ----------
   src から tgt へ、かたむき tilt（度）で dt 秒 そそぐ。now は ミリ秒（すいつきの 時間に つかう）
   かえりち：{ move（うつる mL）, stickUntil（tgt が すいついて 止まる 時こく。かわらなければ もとの 値） } */
export const MAX_TILT = 115;
export const STICK_MS = 380;
export function lipAngle(v) {                    // この 角度を こえると ジュースが ふちに とどく
  const T = TYPES[v.type], fill = Math.max(0, Math.min(1, v.amount / T.cap));
  return T.shape === "pot" ? 14 + (1 - fill) * 40 : 12 + (1 - fill) * 68;
}
export function nextSnap(v) { return TYPES[v.type].snaps.find((s) => s > v.amount + 1e-6); }
export function flowStep(src, tgt, tilt, dt, now) {
  const S = TYPES[src.type], G = TYPES[tgt.type];
  const stickUntil = tgt.stickUntil || 0;
  if (now < stickUntil) return { move: 0, stickUntil };
  const th = lipAngle(src);
  if (tilt <= th || src.amount <= 1e-6) return { move: 0, stickUntil };
  const k = Math.min(1, (tilt - th) / 40);
  let move = Math.min(S.rate, G.cap * 1.2) * k * dt;
  const ns = nextSnap(tgt);
  if (ns != null && ns - tgt.amount < 15) move *= 0.35;          // 線の すこし 手まえで ゆっくり
  move = Math.min(move, src.amount, G.cap - tgt.amount);
  if (src.amount - move < 0.01) move = src.amount;                // からっぽは ぴったり 0 に
  if (G.cap - tgt.amount - move < 0.01) move = Math.min(src.amount, G.cap - tgt.amount);   // いっぱいは ぴったり cap に
  if (move <= 0) return { move: 0, stickUntil };
  if (ns != null && tgt.amount + move >= ns - 1e-6) return { move: ns - tgt.amount, stickUntil: now + STICK_MS };   // 線で すいつく
  return { move, stickUntil };
}
/* flowStep の けっかを あてはめる（小さな ごさは まるめる：からっぽ・線・いっぱいが ぴったりに なる） */
const tidy = (x) => Math.round(x * 1e6) / 1e6;
export function applyFlow(src, tgt, r) {
  return { src: { ...src, amount: tidy(src.amount - r.move) }, tgt: { ...tgt, amount: tidy(tgt.amount + r.move), stickUntil: r.stickUntil } };
}
/* ゆびを はなした とき：線の ±6mL いないなら 線に ぴったり あわせる（その ぶんは src と やりとり） */
export function releaseSnap(src, tgt) {
  const snaps = TYPES[tgt.type].snaps;
  let best = null;
  for (const s of snaps) if (Math.abs(s - tgt.amount) <= 6 && (best == null || Math.abs(s - tgt.amount) < Math.abs(best - tgt.amount))) best = s;
  if (best == null) return { src, tgt };
  const d = best - tgt.amount;                        // ＋なら src から もらう
  if (d > 0 && src.amount < d) return { src, tgt };
  if (d < 0 && src.amount - d > TYPES[src.type].cap) return { src, tgt };
  return { src: { ...src, amount: src.amount - d }, tgt: { ...tgt, amount: best } };
}

/* ---------- もんだい ---------- */
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const V = (id, type, amount, x, label) => ({ id, type, amount, x, label });

/* だんかい1：はかって いれよう「1Lますに ちょうど NdL いれよう」（つぼ → 1dLます → 1Lます） */
export function makeMeasure(level, r = Math.random) {
  const n = rnd(...[[2, 3], [4, 6], [7, 9]][level - 1], r);
  return {
    stage: 1, level, target: n * ML_PER_DL, into: "L",
    goal: `1Lますに ちょうど ${n}dL いれよう`,
    vessels: [V("pot", "pot", 1800, 52), V("dl", "dl", 0, 150), V("L", "L", 0, 262)],
    pours: { pot: ["dl"], dl: ["L", "pot"], L: ["dl"] },
  };
}

/* だんかい2：いくつ ぶん？ 2つの 1Lますを あわせると 何L何dL？ → 水そうに そそいで たしかめる */
export function makeSum(level, r = Math.random) {
  let a, b;
  if (level === 1) { a = 10; b = rnd(1, 9, r); if (r() < 0.5) [a, b] = [b, a]; }
  else if (level === 2) { do { a = rnd(3, 9, r); b = rnd(3, 9, r); } while (a + b <= 10 || a + b > 15); }
  else { do { a = rnd(5, 10, r); b = rnd(5, 10, r); } while (a + b < 12 || (a === 10 && b === 10)); }
  const total = (a + b) * ML_PER_DL;
  return {
    stage: 2, level, a: a * ML_PER_DL, b: b * ML_PER_DL, total, units: ["L", "dL"], answer: splitLdL(total),
    goal: "2つの 1Lますを あわせると、ぜんぶで 何L何dL？",
    vessels: [V("A", "L", a * ML_PER_DL, 50, "あ"), V("tank", "tank", 0, 180), V("B", "L", b * ML_PER_DL, 310, "い")],
    pours: { A: ["tank"], B: ["tank"] },
  };
}

/* だんかい3：ようせいに わけよう「N人の ようせいに s dLずつ わけよう」→ のこりを こたえる
   borrow：L・dL の ひき算で くり下がる（1Lますを 10dL に ばらす） */
export function makeShare(level, r = Math.random) {
  let T, n, s;
  for (;;) {
    n = rnd(2, level === 1 ? 3 : 4, r); s = rnd(1, level === 1 ? 2 : 3, r);
    const G = n * s;
    if (level === 1) { T = rnd(G + 1, 9, r); if (G < T) break; }
    else if (level === 2) { const b = rnd(2, 9, r); if (G < b) { T = 10 + b; break; } }     // くり下がりなし（1L のこる）
    else { const b = rnd(1, 6, r); if (G > b && G < 10) { T = 10 + b; break; } }             // くり下がり（1L3dL − 5dL など）
  }
  const G = n * s, rest = (T - G) * ML_PER_DL;
  const tL = Math.floor(T / 10), tdl = T % 10;
  const vessels = [];
  const cupsX0 = tL ? 196 : 150;
  if (tL) { vessels.push(V("L1", "L", ML_PER_L, 46)); vessels.push(V("L2", "L", tdl * ML_PER_DL, 128)); }
  else vessels.push(V("L2", "L", tdl * ML_PER_DL, 62));
  const cups = [];
  for (let i = 0; i < n; i++) { const id = "c" + i; cups.push(id); vessels.push(V(id, "cup", 0, cupsX0 + i * 44 + (4 - n) * 10, String(i + 1))); }
  const srcs = vessels.filter((v) => v.type === "L").map((v) => v.id);
  const pours = {};
  for (const id of srcs) pours[id] = [...cups, ...srcs.filter((x) => x !== id)];
  for (const id of cups) pours[id] = [...srcs, ...cups.filter((x) => x !== id)];
  return {
    stage: 3, level, total: T * ML_PER_DL, n, each: s * ML_PER_DL, give: G * ML_PER_DL, rest, borrow: tL > 0 && tdl < G % 10,
    units: ["L", "dL"], answer: splitLdL(rest), cups,
    goal: `${n}人の ようせいに ${s}dLずつ わけよう`,
    vessels, pours,
  };
}

/* だんかい4：mLも つかおう（少なめ・3もん） */
export function makeML(kind, r = Math.random) {
  if (kind === "dl2ml") {            // 1dLますで k はい → けいりょうカップで 何mL？
    const k = rnd(1, 3, r);
    return { stage: 4, kind, k, units: ["mL"], answer: { mL: k * 100 }, total: k * 100,
      goal: `1dLますで ${k}はい いれると 何mL？`,
      vessels: [V("pot", "pot", 1800, 50), V("dl", "dl", 0, 150), V("mc", "mcup", 0, 262)],
      pours: { pot: ["dl"], dl: ["mc", "pot"], mc: ["dl"] } };
  }
  if (kind === "fine") {             // 1dLますの こまかい 目もり：ちょうど X mL
    const x = pick([60, 70, 80, 90], r);
    return { stage: 4, kind, target: x, into: "dl", total: x,
      goal: `1dLますに ちょうど ${x}mL いれよう`,
      vessels: [V("pot", "pot", 1800, 90), V("dl", "dlf", 0, 240)],
      pours: { pot: ["dl"], dl: ["pot"] } };
  }
  // 1L → 1Lの けいりょうカップ：1L は 何mL？
  return { stage: 4, kind: "l2ml", units: ["mL"], answer: { mL: 1000 }, total: 1000,
    goal: "1Lは 何mL？ けいりょうカップに うつして しらべよう",
    vessels: [V("L", "L", 1000, 100), V("mj", "mjug", 0, 250)],
    pours: { L: ["mj"], mj: ["L"] } };
}

export function makeSet(stage, r = Math.random) {
  if (stage === 1) return [1, 2, 3].map((lv) => makeMeasure(lv, r));
  if (stage === 2) return [1, 2, 3].map((lv) => makeSum(lv, r));
  if (stage === 3) return [1, 2, 3].map((lv) => makeShare(lv, r));
  return ["dl2ml", "fine", "l2ml"].map((k) => makeML(k, r));
}

/* ---------- こたえあわせ ---------- */
export const isExact = (amount, target) => Math.abs(amount - target) < 0.5;
export const answerOK = (p, ans) => answerToML(ans) === answerToML(p.answer);
/* コップが ぜんぶ s dL か（ちがう コップの ばんごう） */
export const badCups = (p, vessels) => p.cups.filter((id) => !isExact(vessels.find((v) => v.id === id).amount, p.each));
export const totalOf = (vessels) => vessels.reduce((s, v) => s + v.amount, 0);
