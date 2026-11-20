/* =====================================================================
   1ねんせい の あたらしい モード（純粋関数。画面は Grade1Modes.jsx と App.jsx の あそぶ 画面）
   - かずと すうじ（kazu）… ものの 数と 数字を むすびつける。段階 1〜4
       1 かぞえよう … 1〜10こ。数字を 3つから えらぶ（ものは タップで 1,2,3… と 番号）
       2 ならべよう … 数字の 数だけ ものを お皿に のせる
       3 どっちが おおい？ … 2つの まとまりを くらべる
       4 20までの かず … 10こ入りの ケース と ばら で 11〜20
     ならべ方は「きれいな 列」「ばらばら」「サイコロの 目」を まぜる（ならび方が かわっても 数は 同じ）
   - たしざん・ひきざん（10まで）（tashi10）… くりあがり・くりさがり の まえ。こたえは 0〜10
       たしざん：1けた ＋ 1けた（こたえ 10いか）／ひきざん：10いかの 数 − 1けた（こたえ 0いじょう）
       0 の たしざん・ひきざん も ときどき 入れる
   どちらも 1かい 10もん。星の 入り方は くりあがりの たしざん と 同じ（ヒントの 有無で かえない）
   ===================================================================== */

export const ROUND_SIZE = 10;
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const shuffle = (a, r = Math.random) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
let serial = 0;
const newId = () => `g1-${Date.now().toString(36)}-${serial++}`;

/* ---------------- ならべ方（0〜1 の わくの 中の いち） ---------------- */
export const LAYOUTS = ["line", "scatter", "dice"];
const DICE = {
  1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.22, 0.22], [0.5, 0.5], [0.78, 0.78]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.22, 0.22], [0.78, 0.22], [0.5, 0.5], [0.22, 0.78], [0.78, 0.78]],
  6: [[0.27, 0.2], [0.73, 0.2], [0.27, 0.5], [0.73, 0.5], [0.27, 0.8], [0.73, 0.8]],
};
export function arrange(n, kind, r = Math.random) {
  if (n <= 0) return [];
  if (kind === "line") {                         // 5こずつの 列
    const rows = Math.ceil(n / 5), out = [];
    for (let i = 0; i < n; i++) { const row = Math.floor(i / 5), col = i % 5; out.push({ x: 0.1 + col * 0.2, y: rows === 1 ? 0.5 : 0.3 + row * 0.4 }); }
    return out;
  }
  if (kind === "dice") {                         // サイコロの 目（7こ いじょうは サイコロ 2つ）
    if (n <= 6) return DICE[n].map(([x, y]) => ({ x: 0.25 + x * 0.5, y }));
    const left = DICE[5].map(([x, y]) => ({ x: 0.04 + x * 0.42, y })), right = DICE[n - 5].map(([x, y]) => ({ x: 0.54 + x * 0.42, y }));
    return [...left, ...right];
  }
  // ばらばら：かさならない ように ばらまく
  for (let t = 0; t < 400; t++) {
    const out = [];
    for (let i = 0; i < n && out.length === i; i++) {
      for (let k = 0; k < 60; k++) {
        const p = { x: 0.08 + r() * 0.84, y: 0.12 + r() * 0.76 };
        if (out.every((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 0.6) > 0.15)) { out.push(p); break; }
      }
    }
    if (out.length === n) return out;
  }
  return arrange(n, "line", r);
}

/* 数字を 3つ（こたえ ＋ ちかい 数） */
function numberOptions(ans, lo, hi, r) {
  const cand = shuffle([ans - 1, ans + 1, ans - 2, ans + 2, ans + 3, ans - 3].filter((v) => v >= lo && v <= hi && v !== ans), r);
  return shuffle([ans, cand[0], cand[1]], r);
}

/* ---------------- かずと すうじ ---------------- */
export const KAZU_STAGES = [
  { stage: 1, name: "かぞえよう", sub: "いくつ あるかな？ 数字を えらぼう", icon: "🍓" },
  { stage: 2, name: "ならべよう", sub: "数字の 数だけ お皿に のせよう", icon: "🍽️" },
  { stage: 3, name: "どっちが おおい？", sub: "2つの まとまりを くらべよう", icon: "⚖️" },
  { stage: 4, name: "20までの かず", sub: "10こ入りの ケースと ばらで かぞえよう", icon: "📦" },
];
export const KAZU_ITEMS = [
  { id: "strawberry", name: "いちご" }, { id: "star", name: "ほし" }, { id: "ribbon", name: "リボン" },
  { id: "apple", name: "りんご" }, { id: "flower", name: "おはな" },
];
export function makeKazu(stage, mastery = {}, lastWrongKey = null, r = Math.random) {
  const item = pick(KAZU_ITEMS, r);
  const base = { gameType: "kazu", id: newId(), stage, item: item.id, itemName: item.name };
  if (stage === 1) {
    // にがての 数を すこし 多めに
    const ns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], ws = ns.map((n) => { const k = `kz1:${n}`; let w = 1 / (1 + Math.max(0, mastery[k] || 0)); if (k === lastWrongKey) w *= 3; return w; });
    let t = r() * ws.reduce((s, w) => s + w, 0), n = 10; for (let i = 0; i < ns.length; i++) { t -= ws[i]; if (t <= 0) { n = ns[i]; break; } }
    const layout = pick(LAYOUTS, r);
    return { ...base, n, ans: n, layout, pos: arrange(n, layout, r), options: numberOptions(n, 1, 10, r), key: `kz1:${n}` };
  }
  if (stage === 2) {
    const n = rnd(1, 10, r);
    return { ...base, n, ans: n, pool: 12, key: `kz2:${n}` };
  }
  if (stage === 3) {
    let a, b; do { a = rnd(1, 10, r); b = rnd(1, 10, r); } while (a === b || Math.abs(a - b) > 5);
    // 多い ほうを ぎゅっと、少ない ほうを ひろく（見た目の 大きさで きめない）ことも ある
    const trick = r() < 0.5;
    const la = trick && a > b ? "line" : pick(LAYOUTS, r), lb = trick && b > a ? "line" : pick(LAYOUTS, r);
    const sa = trick && a < b ? 1 : trick && a > b ? 0.62 : 1, sb = trick && b < a ? 1 : trick && b > a ? 0.62 : 1;
    return { ...base, a, b, ans: a > b ? "L" : "R", groups: [{ n: a, layout: la, pos: arrange(a, la, r), scale: sa }, { n: b, layout: lb, pos: arrange(b, lb, r), scale: sb }], key: `kz3:${Math.min(a, b)}-${Math.max(a, b)}` };
  }
  const n = rnd(11, 20, r), ones = n - 10, layout = pick(LAYOUTS, r);
  return { ...base, n, ans: n, ones, layout, pos: arrange(ones, layout, r), options: numberOptions(n, 10, 20, r), key: `kz4:${n}` };
}

/* ---------------- たしざん・ひきざん（10まで） ---------------- */
export const TASHI_KINDS = [
  { kind: "add", name: "たしざん", sub: "あわせて いくつ？（こたえ 10まで）", icon: "➕" },
  { kind: "sub", name: "ひきざん", sub: "のこりは いくつ？（10から ひく まで）", icon: "➖" },
  { kind: "mix", name: "まぜて", sub: "たしざんと ひきざんを まぜて", icon: "🔀" },
];
const SCENES_T10 = {
  add: [
    { item: "star", text: (a, b) => `ほしが ${a}こ あるよ。${b}こ ふえたよ。` },
    { item: "cookie", text: (a, b) => `クッキーが ${a}こ あるよ。${b}こ もらったよ。` },
    { item: "flower", text: (a, b) => `はなが ${a}本 さいてるよ。${b}本 さいたよ。` },
  ],
  sub: [
    { item: "candy", text: (a, b) => `あめが ${a}こ あるよ。${b}こ たべたよ。` },
    { item: "cookie", text: (a, b) => `クッキーが ${a}こ あるよ。${b}こ あげたよ。` },
    { item: "star", text: (a, b) => `ほしが ${a}こ あるよ。${b}こ つかったよ。` },
  ],
};
export const T10_FACTS = { add: [], sub: [] };
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) if (a + b <= 10 && a + b > 0) T10_FACTS.add.push([a, b]);
for (let a = 1; a <= 10; a++) for (let b = 0; b <= 9; b++) if (b <= a) T10_FACTS.sub.push([a, b]);
const hasZero = (op, a, b) => a === 0 || b === 0 || (op === "-" && a === b);
export function makeTashi10(kind = "mix", mastery = {}, lastWrongKey = null, r = Math.random) {
  const k = kind === "mix" ? (r() < 0.5 ? "add" : "sub") : kind;
  const op = k === "add" ? "+" : "-";
  const zero = r() < 0.12;                       // 0 の もんだいを ときどき
  const facts = T10_FACTS[k].filter(([a, b]) => hasZero(op, a, b) === zero && (zero || (a >= 1 && b >= 1)));
  const ws = facts.map(([a, b]) => { const key = `t10:${a}${op}${b}`; let w = 1 / (1 + Math.max(0, mastery[key] || 0)); if (key === lastWrongKey) w *= 3.5; return w; });
  let t = r() * ws.reduce((s, w) => s + w, 0), [a, b] = facts[facts.length - 1];
  for (let i = 0; i < facts.length; i++) { t -= ws[i]; if (t <= 0) { [a, b] = facts[i]; break; } }
  const ans = op === "+" ? a + b : a - b;
  const seen = new Set([ans]), opts = [];
  for (const c of shuffle([ans - 1, ans + 1, ans - 2, ans + 2, a, b, ans + 3, ans - 3], r)) { if (c >= 0 && c <= 10 && !seen.has(c)) { seen.add(c); opts.push(c); } if (opts.length === 3) break; }
  for (let c = 0; opts.length < 3; c++) if (!seen.has(c)) { seen.add(c); opts.push(c); }
  const scene = pick(SCENES_T10[k], r);
  return { gameType: "tashi10", id: newId(), kind, op, a, b, ans, item: scene.item, text: scene.text(a, b),
    tail: op === "+" ? "ぜんぶで いくつ？" : "のこりは いくつ？", options: shuffle([ans, ...opts], r), key: `t10:${a}${op}${b}` };
}
