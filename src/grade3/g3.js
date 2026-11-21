/* =====================================================================
   3年生（わり算・小数・分数・毎日計算）— もんだいと セーブの ロジックだけ（画面は Grade3Unit.jsx / Daily3.jsx）
   - もんだいの かたち（どの 単元でも 共通）
       { unit:"div"|"dec"|"frac"|"g2"|"fairy", kind, ans（こたえの 文字列）, key（おなじ もんだいを 見わける）, … }
     こたえは 文字列で くらべる：わり算 "7" ／ "7r2"（7あまり2）、小数 "1.3"、分数 "3/5" ／ "1"
   - 三択 → 入力：単元ごとに 10もんの うち 8もん いじょう（1かいめで）せいかい が 2かい つづいたら 入力に する
     （入力に なったら もどさない。おうちの ひと・子どもが スタート画面で「えらぶ もんだいに する」で もどせる）
   - ヒントを つかっても ポイント（★）は かわらない
   - セーブ：grade3 = { units:{ div|dec|frac: { rounds, good, input, explored, best } },
                       daily:{ lastDate, bestSec, history, notebook } }
     ドラゴン・れんぞく日数・スタンプ（カレンダー）は 2年生と おなじ daily（dragon.js の applyCompletion）を つかう
     → 2年生版と 3年生版を 同じ日に やっても、そだつのは 1日1かい ぶん
   画面や JSX を ふくまないので、node から そのまま テストできる
   ===================================================================== */
import { todayStr, addDays } from "../dragon.js";
import { G2, makeOne } from "../dailyCore.js";
const REVIEW_MAX = 4;                   // 毎日計算：1日に まぜる ノートの おさらい（さいだい。2年生と おなじ）
import { growNet, pickDims, CUBE } from "../fairy/hako.js";

export const UNITS = ["div", "dec", "frac"];
export const UNIT_INFO = {
  div:  { label: "わり算", icon: "🍪", accent: "#F2B880", sub: "クッキーを おなじ数ずつ くばろう" },
  dec:  { label: "小数",   icon: "🧃", accent: "#FFA94D", sub: "0.1Lずつ ジュースを そそごう" },
  frac: { label: "分数",   icon: "🍰", accent: "#FF9EC4", sub: "ケーキを おなじ 大きさに わけよう" },
};
export const ROUND = 10;                // 1かいの もんだい数
export const GOOD_AT = 8;               // この数 いじょう（1かいめで）せいかい なら「よくできた」
export const INPUT_AFTER = 2;           // よくできた が この かい数 つづいたら 入力に する
export const STAR_PER_RIGHT_UNIT = 10;

const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
export const shuffle = (a, r = Math.random) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* ============================ わり算 ============================ */
// inv：九九の ぎゃく（あまり なし）  rem：あまりの ある わり算（わる数 2〜9、しょう 1〜9）
export function makeDiv(kind, r = Math.random) {
  const b = rnd(2, 9, r), q = rnd(1, 9, r);
  const rest = kind === "rem" ? rnd(1, b - 1, r) : 0;
  const a = b * q + rest;
  return { unit: "div", kind, a, b, q, r: rest, ans: divAns(q, rest), key: `${a}÷${b}` };
}
export const divAns = (q, r) => (r ? `${q}r${r}` : `${q}`);
export const parseDiv = (s) => { const [q, r] = String(s).split("r"); return { q: Number(q), r: Number(r || 0) }; };

/* ============================ 小数 ============================ */
// 0.1 の いくつ分（整数 t）で もつ。fmtDec(13) → "1.3"
export const fmtDec = (t) => (t % 10 === 0 ? String(t / 10) : `${Math.floor(t / 10)}.${t % 10}`);
// add1：くりあがり なし（0.3＋0.4／1.2＋0.5） add2：くりあがり（0.6＋0.7）／せいすう まじり（2＋0.4）
// sub1：くりさがり なし（0.8−0.3） sub2：くりさがり（1.2−0.5）／せいすうから（1−0.4・3−0.6）
export function makeDec(kind, r = Math.random) {
  for (let t = 0; t < 300; t++) {
    let x, y, op;
    if (kind === "add1") { op = "+"; x = rnd(1, 49, r); y = rnd(1, 49, r); if ((x % 10) + (y % 10) >= 10 || x % 10 === 0 || y % 10 === 0) continue; }
    else if (kind === "add2") {
      op = "+";
      if (r() < 0.3) { x = rnd(1, 5, r) * 10; y = rnd(1, 9, r); if (r() < 0.5) [x, y] = [y, x]; }
      else { x = rnd(1, 39, r); y = rnd(1, 39, r); if ((x % 10) + (y % 10) <= 10 || x % 10 === 0 || y % 10 === 0) continue; }
    } else if (kind === "sub1") { op = "-"; x = rnd(2, 59, r); y = rnd(1, x - 1, r); if ((x % 10) <= (y % 10) || y % 10 === 0) continue; }
    else {
      op = "-";
      if (r() < 0.35) { x = rnd(1, 5, r) * 10; y = rnd(1, 9, r) + (x > 10 && r() < 0.4 ? 10 : 0); if (y >= x) continue; }
      else { x = rnd(11, 59, r); y = rnd(1, x - 1, r); if ((x % 10) >= (y % 10) || y % 10 === 0) continue; }
    }
    const z = op === "+" ? x + y : x - y;
    if (z <= 0 || z >= 100) continue;
    return { unit: "dec", kind, x, y, op, z, ans: fmtDec(z), key: `${fmtDec(x)}${op}${fmtDec(y)}` };
  }
  return { unit: "dec", kind, x: 3, y: 4, op: "+", z: 7, ans: "0.7", key: "0.3+0.4" };
}

/* ============================ 分数 ============================ */
// 分母が おなじ。こたえは 1 いか（0 には しない）。one：1−□/○（1 を ○/○ と みる）
export const fmtFrac = (n, d) => (n === d ? "1" : `${n}/${d}`);
export function makeFrac(kind, r = Math.random) {
  for (let t = 0; t < 300; t++) {
    const d = pick([3, 4, 5, 6, 7, 8, 9, 10], r);
    let a, b, op, one = false;
    if (kind === "add") { op = "+"; a = rnd(1, d - 1, r); b = rnd(1, d - a, r); }
    else if (kind === "one") { op = "-"; one = true; a = d; b = rnd(1, d - 1, r); }
    else { op = "-"; a = rnd(2, d - 1, r); b = rnd(1, a - 1, r); }
    const n = op === "+" ? a + b : a - b;
    if (n <= 0 || n > d) continue;
    return { unit: "frac", kind, d, a, b, op, one, n, ans: fmtFrac(n, d), key: `${one ? "1" : a + "/" + d}${op}${b}/${d}` };
  }
  return { unit: "frac", kind: "add", d: 5, a: 1, b: 2, op: "+", one: false, n: 3, ans: "3/5", key: "1/5+2/5" };
}

/* ---------- 1かい（10もん）の ならび：かんたんな ものから ---------- */
export function makeRound(unit, r = Math.random) {
  const plan = {
    div: ["inv", "inv", "inv", "inv", "inv", "inv", "rem", "rem", "rem", "rem"],
    dec: ["add1", "add1", "add1", "add2", "add2", "add2", "sub1", "sub1", "sub2", "sub2"],
    frac: ["add", "add", "add", "add", "add", "sub", "sub", "sub", "one", "one"],
  }[unit];
  const used = new Set(), out = [];
  for (const kind of plan) {
    let q;
    for (let t = 0; t < 50; t++) { q = makeUnitQ(unit, kind, r); if (!used.has(q.key)) break; }
    used.add(q.key); out.push(q);
  }
  return out;
}
export function makeUnitQ(unit, kind, r = Math.random) {
  if (unit === "div") return makeDiv(kind || pick(["inv", "inv", "rem"], r), r);
  if (unit === "dec") return makeDec(kind || pick(["add1", "add2", "sub1", "sub2"], r), r);
  return makeFrac(kind || pick(["add", "add", "sub", "one"], r), r);
}

/* ---------- 三択の えらぶ もの（まちがえ やすい ものを まぜる） ---------- */
export function makeChoices(q, r = Math.random) {
  const cand = [];
  if (q.unit === "div") {
    if (q.r) cand.push(divAns(q.q + 1, Math.max(0, q.r - q.b) || 0), divAns(q.q - 1 > 0 ? q.q - 1 : q.q + 2, q.r), divAns(q.q, q.r + 1 < q.b ? q.r + 1 : q.r - 1));
    else cand.push(divAns(q.q + 1, 0), divAns(q.q - 1 > 0 ? q.q - 1 : q.q + 2, 0), divAns(q.q + 2, 0));
  } else if (q.unit === "dec") {
    const wrongPlace = q.op === "+" ? (q.x % 10) + (q.y % 10) : null;       // 0.6＋0.7＝0.13 の まちがい
    if (wrongPlace != null && wrongPlace >= 10 && Math.floor(q.x / 10) + Math.floor(q.y / 10) === 0) cand.push(`0.${wrongPlace}`);
    cand.push(fmtDec(q.z + 1), q.z - 1 > 0 ? fmtDec(q.z - 1) : fmtDec(q.z + 2), q.z + 10 < 100 ? fmtDec(q.z + 10) : fmtDec(q.z - 10));
  } else if (q.unit === "frac") {
    if (q.op === "+") cand.push(`${q.n}/${q.d * 2}`);                       // 分母も たして しまう まちがい
    cand.push(q.n + 1 <= q.d ? fmtFrac(q.n + 1, q.d) : `${q.n - 2}/${q.d}`, q.n - 1 > 0 ? fmtFrac(q.n - 1, q.d) : fmtFrac(q.n + 2, q.d));
    if (q.n === q.d) cand.push(`${q.d}/${q.d * 2}`);
  } else if (q.unit === "g2") {
    cand.push(String(q.ans + 1), String(Math.max(0, q.ans - 1)), String(q.ans + 10));
  }
  const uniq = [];
  for (const c of cand) if (c !== q.ans && !uniq.includes(c) && !/^-|NaN|\/0$|^0\//.test(c) && c !== "0") uniq.push(c);
  return shuffle([q.ans, ...uniq.slice(0, 2)], r);
}

/* ---------- 入力の こたえあわせ ---------- */
// div：{ q, r }（あまりの らんは 空でも 0）  dec："1.3"（"1.30"・".5" も ゆるす）  frac：分子だけ（○/○ は 1 と おなじ）
export function checkInput(q, input) {
  if (q.unit === "div") {
    const qq = Number(input.q), rr = input.r === "" || input.r == null ? 0 : Number(input.r);
    return input.q !== "" && qq === q.q && rr === q.r;
  }
  if (q.unit === "dec") {
    if (!input || input === ".") return false;
    const t = Math.round(Number(input) * 10);
    return Number.isFinite(t) && Math.abs(Number(input) * 10 - t) < 1e-9 && t === q.z;
  }
  if (q.unit === "frac") return input !== "" && Number(input) === q.n;
  return Number(input) === q.ans;
}

/* ============================ ようせいの くに（1もんで おわる かんたんな かたち） ============================ */
// net：この 展開図を くみたてると どの かたち？（さいころ／はこ／くみたてられない）
// juice：1Lますに 入った ジュースは 何dL？（目もりを よむ）
export const FAIRY_NET_CHOICES = ["cube", "box", "none"];
export function makeFairy(r = Math.random) {
  if (r() < 0.5) {
    const kind = pick(["cube", "box", "none"], r);
    const dims = kind === "box" ? pickDims("box", r) : CUBE;
    let layout;
    try { layout = growNet(dims, { dup: kind === "none" }, r); }
    catch (e) { layout = growNet(CUBE, {}, r); return { unit: "fairy", kind: "net", layout, ans: "cube", key: "net-cube", choices: FAIRY_NET_CHOICES }; }
    return { unit: "fairy", kind: "net", layout, ans: kind, key: "net-" + kind, choices: FAIRY_NET_CHOICES };
  }
  const dl = rnd(2, 9, r);
  const choices = shuffle([dl, dl + 1 <= 10 ? dl + 1 : dl - 2, dl - 1 >= 1 ? dl - 1 : dl + 2].map(String), r);
  return { unit: "fairy", kind: "juice", dl, ans: String(dl), key: "juice-" + dl, choices };
}

/* ============================ セーブ ============================ */
const EMPTY_UNIT = { rounds: 0, good: 0, input: false, explored: false, best: null };
export const EMPTY_G3 = { units: {}, daily: { lastDate: null, bestSec: null, history: [], notebook: {} } };
// 古い セーブ・バックアップコード（grade3 が ない／こわれている）でも うごくように おぎなう
export function normalizeGrade3(g) {
  const src = g && typeof g === "object" ? g : {};
  const units = {};
  for (const u of UNITS) {
    const x = src.units && typeof src.units[u] === "object" && src.units[u] ? src.units[u] : {};
    units[u] = { ...EMPTY_UNIT, ...x, rounds: Number(x.rounds) || 0, good: Number(x.good) || 0, input: !!x.input, explored: !!x.explored };
  }
  const d = src.daily && typeof src.daily === "object" ? src.daily : {};
  return {
    units,
    daily: {
      lastDate: typeof d.lastDate === "string" ? d.lastDate : null,
      bestSec: typeof d.bestSec === "number" ? d.bestSec : null,
      history: Array.isArray(d.history) ? d.history : [],
      notebook: d.notebook && typeof d.notebook === "object" ? d.notebook : {},
    },
  };
}

/* 10もん おわった：三択 → 入力 の すすみを きめる */
export function applyUnitRound(g3, unit, res) {
  const g = normalizeGrade3(g3), u = g.units[unit];
  const correct = res.filter((x) => x.right).length;
  const isGood = correct >= GOOD_AT;
  const good = isGood ? u.good + 1 : 0;
  const unlock = !u.input && good >= INPUT_AFTER;
  const nu = { ...u, rounds: u.rounds + 1, good, input: u.input || unlock, explored: true, best: Math.max(u.best || 0, correct) };
  return { g3: { ...g, units: { ...g.units, [unit]: nu } }, unlock, correct, toUnlock: u.input ? 0 : Math.max(0, INPUT_AFTER - good) };
}
export function setUnitInput(g3, unit, input) {
  const g = normalizeGrade3(g3);
  return { ...g, units: { ...g.units, [unit]: { ...g.units[unit], input, good: 0 } } };
}
export function markExplored(g3, unit) {
  const g = normalizeGrade3(g3);
  return { ...g, units: { ...g.units, [unit]: { ...g.units[unit], explored: true } } };
}

/* ============================ 毎日計算（3年生） ============================ */
// 10もん：3年生 6（わり算・小数・分数 2もんずつ）／2年生 3（まいにち けいさんの しきの もんだい）／ようせいの くに 1
export const DAILY3_COUNT = 10;
export const DAILY3_MIX = { g3: 6, g2: 3, fairy: 1 };
const REVIEW_GAPS = [1, 3, 7];
export const g2Key = (q) => `${q.a}${q.op}${q.b}`;
export function toG2(q) { return { unit: "g2", kind: q.kind, a: q.a, b: q.b, op: q.op, ans: q.ans, key: g2Key(q) }; }

export function buildDaily3Set(g3, r = Math.random) {
  const g = normalizeGrade3(g3), today = todayStr();
  const due = Object.values(g.daily.notebook).filter((n) => n.due <= today).sort((x, y) => (x.due < y.due ? -1 : 1)).slice(0, REVIEW_MAX);
  const dueG3 = due.filter((n) => n.q.unit !== "g2").slice(0, DAILY3_MIX.g3).map((n) => ({ ...n.q, review: true }));
  const dueG2 = due.filter((n) => n.q.unit === "g2").slice(0, DAILY3_MIX.g2).map((n) => ({ ...n.q, review: true }));
  const used = new Set([...dueG3, ...dueG2].map((q) => q.key));
  const g3q = [...dueG3];
  const order = shuffle(["div", "div", "dec", "dec", "frac", "frac"], r);
  // おさらいで うまった ぶんは、その 単元から へらす
  for (const q of dueG3) { const i = order.indexOf(q.unit); if (i >= 0) order.splice(i, 1); else order.pop(); }
  for (const u of order) {
    let q;
    for (let t = 0; t < 50; t++) { q = makeUnitQ(u, null, r); if (!used.has(q.key)) break; }
    used.add(q.key); g3q.push(q);
  }
  const g2q = [...dueG2];
  for (let guard = 0; g2q.length < DAILY3_MIX.g2 && guard < 200; guard++) {
    const q = toG2(makeOne(G2));
    if (used.has(q.key)) continue;
    used.add(q.key); g2q.push(q);
  }
  const out = shuffle([...g3q, ...g2q, makeFairy(r)], r);
  return out;
}

export function noteWrong3(notebook, q) {
  if (q.unit === "fairy") return notebook;                  // ようせいの くには ノートに 入れない
  const { review, choices, ...plain } = q;
  const prev = notebook[q.key];
  return { ...notebook, [q.key]: { q: plain, level: 0, due: addDays(todayStr(), 1), miss: (prev ? prev.miss : 0) + 1 } };
}
export function noteRight3(notebook, q) {
  const n = notebook[q.key];
  if (!n || n.due > todayStr()) return notebook;
  const level = n.level + 1, next = { ...notebook };
  if (level >= REVIEW_GAPS.length) delete next[q.key];
  else next[q.key] = { ...n, level, due: addDays(todayStr(), REVIEW_GAPS[level]) };
  return next;
}
