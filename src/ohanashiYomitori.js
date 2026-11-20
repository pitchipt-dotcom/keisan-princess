/* =====================================================================
   おはなし もんだい「むずかしい」— もんだいを つくる（純粋関数。画面は OhanashiHard.jsx）
   まいにち けいさん の よみとりチェック（yomitori.js）と 同じ 4つの かた で、ルナ・マリン・ロゼの お話に する
     one  … 1つの しき（よけいな 数が まざる ことも ある）。場面の 絵 つき
     two  … 2だんかい（しき ① → しき ②）
     edge … はしの 数え方（本だな／カレンダーの 絵）。「＋1」「−1」も しきに かく
     unit … たんい（cm・mm／L・dL）。ペンで かく ため、くりあがり・くりさがりの ない だんかい（1）だけ
   文の まとまり・マーカーの しるし（m1／m2）は yomitori.js の 部品を そのまま つかう
   もんだいの かたち：
     { wp:true, kind:"oh-…", speaker, segs, steps:[{ label, expr:{ a, op, b, r, chain }, use:[…], note, hint, fig }],
       answer:[{ ans, unit }], scenes?, pic?, unit? }
       expr  … ペンで かく しき（a op b ＝ r）。chain は「まえの しきの こたえ」を つかう ところ（"a"／"b"）
       use   … その しきで つかった 文の ことば（＝ マーカーを ひく ところの 文字。解説に 出す）
       note  … 文に 書いて いない ことば（「1週間は 7日」「ピンクの 本も 入れる」など）
       hint  … ことばの ヒント、fig … 図の ヒント
   ===================================================================== */
import { S, m1, m2, near, ask, rnd, pick, unitNumbers, fmtUnit, UNIT_SYS } from "./yomitori.js";

export const OPS = { "+": "＋", "-": "−", "×": "×" };
const calc = (a, op, b) => (op === "+" ? a + b : op === "-" ? a - b : a * b);
const E = (a, op, b, chain = null) => ({ a, op, b, r: calc(a, op, b), chain });
const st = (label, expr, use, hint, fig, note = null) => ({ label, expr, use, note, hint, fig });

// 場面の 絵に 出る 人（App の キャラクターの 絵を つかう）
export const OH_PEOPLE = { luna: "ルナ", marin: "マリン", rose: "ロゼ" };
export const SPEAKER = { luna: "witch", marin: "mermaid", rose: "princess" };

/* ------------------------------ one ------------------------------ */
const ONE = [
  () => {
    const a = rnd(12, 45), b = rnd(6, 19);
    return { speaker: "luna",
      segs: [S`ルナは ほしの かけらを ${m1(a + "こ")} もっています。`, S`マリンから ${m1(b + "こ")} もらいました。`, near("ほしの かけらは ぜんぶで"), ask("何こに なりましたか。")],
      steps: [st(null, E(a, "+", b), [a + "こ", b + "こ"], "もらうと ふえるね。「ぜんぶで」を もとめる ときは たしざん", { type: "join", a, b, unit: "こ", la: "もっている", lb: "もらった" })],
      answer: [{ ans: a + b, unit: "こ" }],
      scenes: [{ kind: "have", who: "luna", obj: "star", n: a, cap: "もっている" }, { kind: "move", from: "marin", to: "luna", obj: "star", n: b, cap: "もらう" }, { kind: "ask", who: "luna", cap: "ぜんぶで 何こ？" }] };
  },
  () => {
    const a = rnd(24, 58), b = rnd(6, a - 9);
    return { speaker: "marin",
      segs: [S`マリンは あめを ${m1(a + "こ")} もっています。`, S`ロゼに ${m1(b + "こ")} あげました。`, near("マリンの のこりの あめは"), ask("何こですか。")],
      steps: [st(null, E(a, "-", b), [a + "こ", b + "こ"], "あげると へるね。「のこり」を もとめる ときは ひきざん", { type: "take", a, b, unit: "こ", lb: "あげた" })],
      answer: [{ ans: a - b, unit: "こ" }],
      scenes: [{ kind: "have", who: "marin", obj: "candy", n: a, cap: "もっている" }, { kind: "move", from: "marin", to: "rose", obj: "candy", n: b, cap: "あげる" }, { kind: "ask", who: "marin", cap: "のこりは 何こ？" }] };
  },
  () => {
    const a = rnd(20, 45), b = rnd(8, a - 6);
    return { speaker: "rose",
      segs: [S`ロゼは 本を ${m1(a + "さつ")} よみました。`, S`ルナは ${m1(b + "さつ")} よみました。`, near("ロゼは ルナより"), ask("何さつ おおく よみましたか。")],
      steps: [st(null, E(a, "-", b), [a + "さつ", b + "さつ"], "「何さつ おおい」は ちがいを きいているよ。ちがいは ひきざん", { type: "compare", a, b, unit: "さつ", la: "ロゼ", lb: "ルナ" })],
      answer: [{ ans: a - b, unit: "さつ" }],
      scenes: [{ kind: "have", who: "rose", obj: "book", n: a, cap: "よんだ" }, { kind: "have", who: "luna", obj: "book", n: b, cap: "よんだ" }, { kind: "ask", cap: "ちがいは 何さつ？" }] };
  },
  () => {
    const a = rnd(13, 38), b = rnd(12, 35), c = rnd(5, 19);
    return { speaker: "rose",
      segs: [S`ロゼの おしろの にわに ${m1(`赤い 花が ${a}本`)}、`, S`${m1(`白い 花が ${b}本`)}、`, { t: `きいろい 花が ${c}本 さいています。` }, near("赤い 花と 白い 花は"), ask("あわせて 何本ですか。")],
      steps: [st(null, E(a, "+", b), [`赤い 花が ${a}本`, `白い 花が ${b}本`], "きかれているのは 赤と 白だけ。きいろい 花は 入れないよ", { type: "join", a, b, unit: "本", la: "赤", lb: "白" })],
      answer: [{ ans: a + b, unit: "本" }],
      scenes: [{ kind: "have", obj: "flower-red", n: a, cap: "赤い 花" }, { kind: "have", obj: "flower-white", n: b, cap: "白い 花" }, { kind: "have", obj: "flower-yellow", n: c, cap: "きいろい 花" }, { kind: "ask", cap: "赤と 白で 何本？" }] };
  },
  () => {
    const a = rnd(16, 47), b = rnd(14, 38);
    return { speaker: "luna",
      segs: [S`ルナは どんぐりを ${m1(a + "こ")}、`, S`マリンは ${m1(b + "こ")} ひろいました。`, near("2人 あわせて"), ask("何こ ひろいましたか。")],
      steps: [st(null, E(a, "+", b), [a + "こ", b + "こ"], "「あわせて」は たしざんだよ", { type: "join", a, b, unit: "こ", la: "ルナ", lb: "マリン" })],
      answer: [{ ans: a + b, unit: "こ" }],
      scenes: [{ kind: "have", who: "luna", obj: "acorn", n: a, cap: "ひろった" }, { kind: "have", who: "marin", obj: "acorn", n: b, cap: "ひろった" }, { kind: "ask", cap: "あわせて 何こ？" }] };
  },
];

/* ------------------------------ two ------------------------------ */
const TWO = [
  // くばった あとの のこりから、はじめの 数（かけざん → たしざん）
  () => {
    const p = rnd(2, 5), m = rnd(3, 6), r = rnd(3, 9), t = p * m;
    return { speaker: "luna",
      segs: [S`ルナは ほしの かけらを ${m1(`1人に ${p}こずつ`)}、`, S`${m1(m + "人に")} くばりました。`, S`まだ ${m2(`${r}こ のこって`)}います。`, near("ほしの かけらは はじめに"), ask("何こ ありましたか。")],
      steps: [
        st("① くばった かけらは ぜんぶで 何こ？", E(p, "×", m), [`1人に ${p}こずつ`, `${m}人に`], `${p}こずつが ${m}人ぶん。1つ分の 数 × いくつ分 だよ`, { type: "groups", a: p, b: m, unit: "こ" }),
        st("② はじめに あった かけらは 何こ？", E(t, "+", r, "a"), [`${r}こ のこって`], "くばった ぶんと のこりを あわせると、はじめの 数に なるよ", { type: "join", a: t, b: r, unit: "こ", la: "くばった", lb: "のこり" }),
      ],
      answer: [{ ans: t + r, unit: "こ" }] };
  },
  // 2つ つかって のこり（たしざん → ひきざん）
  () => {
    const a = rnd(4, 9), b = rnd(3, 8), n = a + b + rnd(5, 18), u = a + b;
    return { speaker: "marin",
      segs: [S`マリンは 花を ${m2(n + "本")} もっています。`, S`${m1(`リースに ${a}本`)}、`, S`${m1(`かんむりに ${b}本`)} つかいました。`, near("のこりの 花は"), ask("何本ですか。")],
      steps: [
        st("① つかった 花は ぜんぶで 何本？", E(a, "+", b), [`リースに ${a}本`, `かんむりに ${b}本`], "まず つかった 花を あわせよう", { type: "join", a, b, unit: "本", la: "リース", lb: "かんむり" }),
        st("② のこりの 花は 何本？", E(n, "-", u, "b"), [`${n}本`], `もっている ${n}本から、①で もとめた つかった 花を ひこう`, { type: "take", a: n, b: u, unit: "本", lb: "つかった" }),
      ],
      answer: [{ ans: n - u, unit: "本" }] };
  },
  // もらって、あげる（たしざん → ひきざん）
  () => {
    const a = rnd(14, 35), b = rnd(6, 18), c = rnd(9, a + b - 5), t = a + b;
    return { speaker: "rose",
      segs: [S`ロゼは シールを ${m1(a + "まい")} もっていました。`, S`ルナから ${m1(b + "まい")} もらい、`, S`マリンに ${m2(c + "まい")} あげました。`, near("ロゼの シールは いま"), ask("何まい ありますか。")],
      steps: [
        st("① もらった あとは 何まい？", E(a, "+", b), [a + "まい", b + "まい"], "もらうと ふえるよ", { type: "join", a, b, unit: "まい", la: "もっていた", lb: "もらった" }),
        st("② あげた あとは 何まい？", E(t, "-", c, "a"), [c + "まい"], "あげると へるよ。①の こたえから ひこう", { type: "take", a: t, b: c, unit: "まい", lb: "あげた" }),
      ],
      answer: [{ ans: t - c, unit: "まい" }] };
  },
  // 作って、たべる（かけざん → ひきざん）
  () => {
    const p = rnd(3, 6), m = rnd(3, 6), t = p * m, c = rnd(3, t - 4);
    return { speaker: "rose",
      segs: [S`ロゼは クッキーを ${m1(`1さらに ${p}こずつ`)}、`, S`${m1(m + "さら")} 作りました。`, S`そのうち ${m2(c + "こ")} たべました。`, near("のこりの クッキーは"), ask("何こですか。")],
      steps: [
        st("① 作った クッキーは ぜんぶで 何こ？", E(p, "×", m), [`1さらに ${p}こずつ`, `${m}さら`], `${p}こずつが ${m}さらぶん。1つ分の 数 × いくつ分`, { type: "groups", a: p, b: m, unit: "こ" }),
        st("② のこりの クッキーは 何こ？", E(t, "-", c, "a"), [c + "こ"], "たべると へるよ。①の こたえから ひこう", { type: "take", a: t, b: c, unit: "こ", lb: "たべた" }),
      ],
      answer: [{ ans: t - c, unit: "こ" }] };
  },
];

/* ------------------------------ edge ------------------------------ */
const EDGE = [
  // 左から k さつ目は 右から 何さつ目？ → n − k ＝ （右に ある 本）、＋1
  () => {
    const n = rnd(10, 14), k = rnd(3, n - 3), t = n - k;
    return { speaker: "luna",
      segs: [S`ルナの 本だなに 本が ${m1(n + "さつ")} ならんでいます。`, S`ピンクの 本は ${m1(`左から ${k}さつ目`)}です。`, near("ピンクの 本は 右から かぞえると"), ask("何さつ目ですか。")],
      steps: [
        st("① ピンクの 本より 右に ある 本は 何さつ？", E(n, "-", k), [n + "さつ", `左から ${k}さつ目`], "ぜんぶの 本から、左から ピンクの 本までを ひくと、右に ある 本が のこるよ", { type: "line", n, marks: { [k]: "pink" }, from: "left", upto: k }),
        st("② ピンクの 本は 右から 何さつ目？", E(t, "+", 1, "a"), [], "ピンクの 本も 1さつに 入れるよ。①の こたえに 1を たそう", { type: "line", n, marks: { [k]: "pink" }, from: "right", upto: n - k + 1 }, "ピンクの 本も 1さつ 入れる"),
      ],
      answer: [{ ans: t + 1, unit: "さつ目" }],
      pic: { type: "books", n, marks: { [k]: "pink" } } };
  },
  // 2さつの あいだ → k2 − k1、−1
  () => {
    const n = rnd(11, 14), k1 = rnd(2, 5), k2 = rnd(k1 + 3, n - 1), t = k2 - k1;
    return { speaker: "marin",
      segs: [{ t: `マリンの 本だなに 本が ${n}さつ ならんでいます。` }, S`青い 本は ${m1(`左から ${k1}さつ目`)}、`, S`ピンクの 本は ${m1(`左から ${k2}さつ目`)}です。`, near("2さつの あいだに ある 本は"), ask("何さつですか。")],
      steps: [
        st("① 青い 本から ピンクの 本まで、いくつ すすむ？", E(k2, "-", k1), [`左から ${k1}さつ目`, `左から ${k2}さつ目`], "ピンクの 本の ばしょ − 青い 本の ばしょ を けいさん しよう", { type: "line", n, marks: { [k1]: "blue", [k2]: "pink" }, between: [k1, k2] }),
        st("② あいだに ある 本は 何さつ？", E(t, "-", 1, "a"), [], "①の 数には ピンクの 本が 入っているよ。あいだの 本だけに するには 1を ひこう", { type: "line", n, marks: { [k1]: "blue", [k2]: "pink" }, between: [k1, k2], inner: true }, "ピンクの 本は 入れない"),
      ],
      answer: [{ ans: t - 1, unit: "さつ" }],
      pic: { type: "books", n, marks: { [k1]: "blue", [k2]: "pink" } } };
  },
  // 1週間 あと → d ＋ 7
  () => {
    const month = rnd(4, 11), days = [4, 6, 9, 11].includes(month) ? 30 : 31, first = rnd(0, 6), d = rnd(3, days - 9);
    return { speaker: "rose",
      segs: [S`きょうは ${m1(`${month}月${d}日`)}です。`, S`ロゼの おしろの パーティーは きょうの ${m1("1週間 あと")}です。`, near("パーティーは"), ask(`${month}月 何日ですか。`)],
      steps: [st(null, E(d, "+", 7), [`${month}月${d}日`, "1週間 あと"], "1週間は 7日。カレンダーで たての 1だん 下が 1週間 あとだよ", { type: "cal", month, first, days, from: d, to: d + 7 }, "1週間は 7日")],
      answer: [{ ans: d + 7, unit: "日" }],
      pic: { type: "cal", month, first, days, marks: { [d]: "pink" } } };
  },
  // ○日から ○日まで → e − s、＋1
  () => {
    const month = rnd(4, 11), days = [4, 6, 9, 11].includes(month) ? 30 : 31, first = rnd(0, 6), s = rnd(2, days - 12), e = s + rnd(4, 9), t = e - s;
    return { speaker: "marin",
      segs: [S`マリンは ${m1(`${month}月${s}日から ${e}日まで`)}、`, { t: "まいにち 花に 水を やりました。" }, near("水を やったのは"), ask("ぜんぶで 何日間ですか。")],
      steps: [
        st(`① ${e}日は ${s}日の 何日 あと？`, E(e, "-", s), [`${month}月${s}日から ${e}日まで`], `${e} − ${s} で、${s}日から 何日 すすんだか わかるよ`, { type: "cal", month, first, days, from: s, to: e }),
        st("② 水を やったのは 何日間？", E(t, "+", 1, "a"), [], `${s}日も 水を やったよ。はじめの 1日を たそう`, { type: "cal", month, first, days, from: s, to: e, count: true }, `${s}日も 入れる`),
      ],
      answer: [{ ans: t + 1, unit: "日間" }],
      pic: { type: "cal", month, first, days, marks: { [s]: "pink", [e]: "pink" } } };
  },
];

/* ------------------------------ unit ------------------------------ */
// ばめん：a・b は「12cm4mm」などの 文字（m1 で マーカー）
const UNIT_SCENES = {
  "cm-": [(a, b) => ({ speaker: "luna", segs: [S`ルナは ${a}の リボンから ${b} 切りました。`, near("のこりの リボンは"), ask("何cm何mmですか。")] }),
    (a, b) => ({ speaker: "marin", segs: [S`マリンは ${a}の テープを ${b} つかいました。`, near("のこりの テープは"), ask("何cm何mmですか。")] })],
  "cm+": [(a, b) => ({ speaker: "rose", segs: [S`ロゼは ${a}の リボンと ${b}の リボンを つなぎました。`, near("ぜんぶの ながさは"), ask("何cm何mmですか。")] }),
    (a, b) => ({ speaker: "luna", segs: [S`ルナの つえは ${a}、マリンの つえは ${b}です。`, near("2本 あわせると"), ask("何cm何mmですか。")] })],
  "L-": [(a, b) => ({ speaker: "rose", segs: [S`ロゼの ポットに お茶が ${a} あります。`, S`みんなの カップに ${b} 入れました。`, near("ポットに のこった お茶は"), ask("何L何dLですか。")] }),
    (a, b) => ({ speaker: "marin", segs: [S`マリンは ${a}の ジュースを ${b} のみました。`, near("のこりの ジュースは"), ask("何L何dLですか。")] })],
  "L+": [(a, b) => ({ speaker: "luna", segs: [S`ルナは ジュースを ${a}、マリンは ${b} もってきました。`, near("ジュースは あわせて"), ask("何L何dLですか。")] })],
};
function makeUnit(sys) {
  const [a, b, op] = unitNumbers(sys, 1);          // くりあがり・くりさがり なし
  const u = UNIT_SYS[sys], A = Math.floor(a / 10), a2 = a % 10, B = Math.floor(b / 10), b2 = b % 10;
  const fa = fmtUnit(sys, a), fb = fmtUnit(sys, b);
  const sc = pick(UNIT_SCENES[sys + op])(m1(fa), m1(fb));
  const unitData = { sys, level: 1, op, a, b, borrow: false };
  const bigTxt = `${u.big}は ${u.big}どうし`, smallTxt = `${u.small}は ${u.small}どうし`;
  return { speaker: sc.speaker, segs: sc.segs,
    steps: [
      st(`① ${u.big}どうし けいさん しよう`, E(A, op, B), [fa, fb], `${u.big}と ${u.small}は べつべつに けいさん するよ。まず ${u.big}の 数だけ 見よう`, { type: "unit", u: unitData }, bigTxt),
      st(`② ${u.small}どうし けいさん しよう`, E(a2, op, b2), [fa, fb], `こんどは ${u.small}の 数だけ 見よう`, { type: "unit", u: unitData }, smallTxt),
    ],
    answer: [{ ans: calc(A, op, B), unit: u.big }, { ans: calc(a2, op, b2), unit: u.small }],
    unit: unitData };
}

export const OH_KINDS = { one: ONE, two: TWO, edge: EDGE, unit: null };
export const OH_PER_SET = 5;              // 1かいの もんだい数
let serial = 0;
export function makeOhanashi(kind) {
  const q = kind === "unit" ? makeUnit(pick(["cm", "L"])) : pick(OH_KINDS[kind])();
  return { ...q, wp: true, kind: "oh-" + kind, id: `oh-${kind}-${Date.now().toString(36)}-${serial++}` };
}
/* 5もん：1もんめは 1つの しき。のこりは 2だんかい・はし・たんい と もう1つ（1つの しき か 2だんかい） */
export function buildOhanashiSet() {
  const rest = ["two", "edge", "unit", pick(["one", "two"])];
  for (let i = rest.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [rest[i], rest[j]] = [rest[j], rest[i]]; }
  return ["one", ...rest].map(makeOhanashi);
}

/* ---------- こたえあわせ ----------
   ペンの しき：a・b（たしざんは いれかえても よい）、記号、こたえ */
export function checkExpr(expr, w) {
  const A = Number(w.a), B = Number(w.b), R = Number(w.r);
  const filled = [w.a, w.b, w.r].every((v) => v !== "" && v != null);
  const ab = A === expr.a && B === expr.b, swapped = A === expr.b && B === expr.a && expr.a !== expr.b;
  const swapOK = swapped && expr.op === "+";
  const res = {
    a: ab || swapOK ? "right" : swapped ? "close" : A === expr.a ? "right" : "wrong",
    b: ab || swapOK ? "right" : swapped ? "close" : B === expr.b ? "right" : "wrong",
    r: R === expr.r ? "right" : "wrong",
    op: w.op === expr.op ? "right" : "wrong",
  };
  return { ...res, ok: filled && Object.values(res).every((v) => v === "right"), close: swapped && !swapOK };
}
export const checkAnswer = (answer, vals) => answer.map((s, i) => (Number(vals[i]) === s.ans && vals[i] !== "" && vals[i] != null ? "right" : "wrong"));

/* ---------- 解説：「どの 数を どう つかったか」 ----------
   例：「1人に 3こずつ」と「6人に」 → 3 × 6 ＝ 18 ／ ①の こたえ 18 と「8こ のこって」 → 18 ＋ 8 ＝ 26 */
export function explainStep(s, i, steps) {
  const e = s.expr, quotes = s.use.map((u) => `「${u}」`);
  const prev = e.chain ? `${["①", "②"][i - 1]}の こたえ ${steps[i - 1].expr.r}` : null;
  const head = [prev, quotes.join("と ")].filter(Boolean).join(" と ");
  return { head: head + (s.note ? `（${s.note}）` : ""), eq: `${e.a} ${OPS[e.op]} ${e.b} ＝ ${e.r}` };
}
export const answerText = (q) => q.answer.map((s) => s.ans + s.unit).join("");
