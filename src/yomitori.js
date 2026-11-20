/* =====================================================================
   よみとりチェック — もんだいを つくる（純粋関数。画面は YomitoriQuestion.jsx）
   ねらい：もんだいぶんを さいごまで よまずに こたえる ミスを へらす
   - こたえる まえに「きかれている ところ」を タップする
   - 4しゅるい：
       one  … 1つの しきで とける ぶんしょうだい（よけいな 数が まざる ことも ある）
       two  … 2だんかいの もんだい（① の こたえを 入れたら「まだ つづきが あるよ」→ ②）
       edge … はしの かぞえかた（本だな／カレンダーの 絵を タップして かぞえる）
       unit … たんいの けいさん（cm・mm／L・dL。それぞれ 4だんかい）
   - もんだいぶんは すべて この アプリの オリジナル
   もんだいの かたち：
     { wp:true, kind, id, segs:[{ t, ask?, near?, parts? }], steps:[{ label, slots:[{ ans, unit }], hint }], pic? }
       segs … もんだいぶんを タップできる まとまりに 分けたもの。ask が「きかれている ところ」
               near は ask の すぐ まえ（「おしい！」と 声を かける）
       scenes … 1つの 式の もんだいだけ。場面の 絵（くわしくは ONE の 上）
       unit … たんいの もんだいだけ { sys:"cm"|"L", level, op, a, b, borrow }（ヒントの 図に つかう）
       pic  … { type:"books", n, marks:{ 位置:"pink"|"blue" } }
               { type:"cal", month, first(1日の 曜日 0=日), days, marks:{ 日:"pink" } }
   ===================================================================== */

const rnd = (lo, hi) => lo + ((Math.random() * (hi - lo + 1)) | 0);
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const NAMES = ["ゆい", "はな", "りこ", "さき", "めい", "あおい", "つむぎ", "ひなた"];

// 1つの こたえ（1つの たんい）の だんかい
const step = (label, ans, unit, hint) => ({ label, slots: [{ ans, unit }], hint });
const near = (t) => ({ t, near: true }), ask = (t) => ({ t, ask: true });

/* マーカー：せいかい したら「その 式で つかった ところ」に 色を つける
   m1(…) … ① の 式で つかう ところ（水色）  m2(…) … ② の 式で 新しく つかう ところ（ピンク）
   S`…` で 1つの まとまり（seg）を つくる → { t: ぜんぶの 文字, parts:[{ t, mk? }] }
   どこに マーカーを ひくかは ここで データとして もつ（画面では 文字を さがさない） */
const m1 = (t) => ({ t: String(t), mk: 0 }), m2 = (t) => ({ t: String(t), mk: 1 });
const S = (strs, ...vals) => {
  const parts = [];
  const add = (p) => { const last = parts[parts.length - 1]; if (last && last.mk == null && p.mk == null) last.t += p.t; else parts.push(p); };
  strs.forEach((str, i) => {
    if (str) add({ t: str });
    if (i < vals.length) add(vals[i] && typeof vals[i] === "object" ? { ...vals[i] } : { t: String(vals[i]) });
  });
  return { t: parts.map((p) => p.t).join(""), parts };
};

/* ------------------------------ one ------------------------------ */
/* 1つの 式で とける もんだいには、お話の じゅんに 場面の 絵（scenes）を つける
     { kind:"have", who?, obj, n, cap }            … だれかが n こ もっている（who が 無ければ モノだけ）
     { kind:"move", from, to, obj, n, cap }         … from から to へ n こ うごく（やじるし）
     { kind:"ask",  who?, cap }                     … さいごの 場面。こたえは 絵に 出さず「？」
   人物・モノは src/assets/yomitori/ の 名前で よぶ */
const ONE = [
  () => {
    const a = rnd(12, 45), b = rnd(6, 19);
    return {
      segs: [S`わたしは シールを ${m1(a + "まい")} もっています。`, S`おねえさんから ${m1(b + "まい")} もらいました。`,
        near("シールは ぜんぶで"), ask("何まいに なりましたか。")],
      steps: [step(null, a + b, "まい", `もらうと ふえるね。${a} ＋ ${b} だよ`)],
      scenes: [{ kind: "have", who: "me", obj: "sticker", n: a, cap: "もっている" },
        { kind: "move", from: "sister", to: "me", obj: "sticker", n: b, cap: "もらう" },
        { kind: "ask", who: "me", cap: "ぜんぶで 何まい？" }],
    };
  },
  () => {
    const a = rnd(24, 58), b = rnd(6, a - 9);
    return {
      segs: [S`わたしは あめを ${m1(a + "こ")} もっています。`, S`ともだちに ${m1(b + "こ")} あげました。`,
        near("のこりの あめは"), ask("何こですか。")],
      steps: [step(null, a - b, "こ", `あげると へるね。${a} − ${b} だよ`)],
      scenes: [{ kind: "have", who: "me", obj: "candy", n: a, cap: "もっている" },
        { kind: "move", from: "me", to: "friend", obj: "candy", n: b, cap: "あげる" },
        { kind: "ask", who: "me", cap: "のこりは 何こ？" }],
    };
  },
  () => {
    const a = rnd(8, 30), b = rnd(12, 30);
    return {
      segs: [S`はこに えんぴつが ${m1(a + "本")} あります。`, S`おかあさんが ${m1(b + "本")} かってきて くれました。`,
        near("えんぴつは ぜんぶで"), ask("何本に なりましたか。")],
      steps: [step(null, a + b, "本", `ふえたから たしざん。${a} ＋ ${b} だよ`)],
      scenes: [{ kind: "have", obj: "pencil", n: a, cap: "はこに ある" },
        { kind: "move", from: "mom", to: "me", obj: "pencil", n: b, cap: "かってきた" },
        { kind: "ask", cap: "ぜんぶで 何本？" }],
    };
  },
  () => {
    const a = rnd(20, 45), b = rnd(8, a - 6);
    return {
      segs: [S`わたしは 本を ${m1(a + "さつ")} よみました。`, S`ともだちは ${m1(b + "さつ")} よみました。`,
        near("わたしは ともだちより"), ask("何さつ おおく よみましたか。")],
      steps: [step(null, a - b, "さつ", `「何さつ おおい」は ちがいを きいているよ。${a} − ${b} を けいさん しよう`)],
      scenes: [{ kind: "have", who: "me", obj: "book", n: a, cap: "よんだ" },
        { kind: "have", who: "friend", obj: "book", n: b, cap: "よんだ" },
        { kind: "ask", cap: "ちがいは 何さつ？" }],
    };
  },
  () => {
    const a = rnd(13, 38), b = rnd(12, 35), c = rnd(5, 19);
    return {
      segs: [S`花だんに ${m1(`赤い 花が ${a}本`)}、`, S`${m1(`白い 花が ${b}本`)}、`, { t: `きいろい 花が ${c}本 さいています。` },
        near("赤い 花と 白い 花は"), ask("あわせて 何本ですか。")],
      steps: [step(null, a + b, "本", `きかれているのは 赤と 白だけ。きいろは 入れないよ。${a} ＋ ${b} だね`)],
      scenes: [{ kind: "have", obj: "flower-red", n: a, cap: "赤い 花" },
        { kind: "have", obj: "flower-white", n: b, cap: "白い 花" },
        { kind: "have", obj: "flower-yellow", n: c, cap: "きいろい 花" },
        { kind: "ask", cap: "赤と 白で 何本？" }],
    };
  },
  () => {
    const a = rnd(16, 47), b = rnd(14, 38);
    return {
      segs: [S`わたしは どんぐりを ${m1(a + "こ")} ひろいました。`, S`おにいさんは ${m1(b + "こ")} ひろいました。`,
        near("2人 あわせて"), ask("何こ ひろいましたか。")],
      steps: [step(null, a + b, "こ", `「あわせて」は たしざん。${a} ＋ ${b} だよ`)],
      scenes: [{ kind: "have", who: "me", obj: "acorn", n: a, cap: "ひろった" },
        { kind: "have", who: "brother", obj: "acorn", n: b, cap: "ひろった" },
        { kind: "ask", cap: "あわせて 何こ？" }],
    };
  },
];

/* ------------------------------ two ------------------------------ */
const TWO = [
  // のこりを 同じ 数ずつ 分ける（九九で かんがえる）
  () => {
    const k = pick([2, 3]), each = rnd(3, 8), rest = k * each, a = rnd(3, 7), b = rnd(3, 8), n = rest + a + b;
    return {
      segs: [S`花が ${m1(n + "本")} あります。`, S`${m1(a + "本")}と ${m1(b + "本")}を リースに つかいました。`,
        S`のこりの 花を ${m2(`${k}つの かびんに`)} 同じ 数ずつ 分けます。`,
        { t: "1つの かびんの 花は", near: true }, { t: "何本に なりますか。", ask: true }],
      steps: [
        step("① まず、のこりの 花は 何本？", rest, "本", `${n}本から ${a}本と ${b}本を ひこう`),
        step(`② ${k}つに 分けると、1つは 何本？`, each, "本", `${k}の だんで ${rest}に なるのは ${k} × いくつ かな？`),
      ],
    };
  },
  // くばった あとの のこりから、はじめの 数を もとめる
  () => {
    const p = rnd(2, 5), m = rnd(3, 6), r = rnd(3, 9);
    return {
      segs: [S`あめを ${m1(`1人に ${p}こずつ`)}、`, S`${m1(m + "人に")} くばりました。`, S`まだ ${m2(`${r}こ のこって`)}います。`,
        { t: "あめは はじめに", near: true }, { t: "何こ ありましたか。", ask: true }],
      steps: [
        step("① くばった あめは ぜんぶで 何こ？", p * m, "こ", `${p}こずつ ${m}人ぶん。${p} × ${m} だよ`),
        step("② はじめに あった あめは 何こ？", p * m + r, "こ", "くばった ぶんと のこりを たすと、はじめの 数に なるよ"),
      ],
    };
  },
  // もらって、あげる
  () => {
    const a = rnd(14, 35), b = rnd(6, 18), c = rnd(9, a + b - 5);
    return {
      segs: [S`シールを ${m1(a + "まい")} もっていました。`, S`おねえさんから ${m1(b + "まい")} もらい、`, S`ともだちに ${m2(c + "まい")} あげました。`,
        { t: "シールは いま", near: true }, { t: "何まい ありますか。", ask: true }],
      steps: [
        step("① もらった あとは 何まい？", a + b, "まい", `もらうと ふえるよ。${a} ＋ ${b}`),
        step("② あげた あとは 何まい？", a + b - c, "まい", `あげると へるよ。①の こたえ − ${c}`),
      ],
    };
  },
];

/* ------------------------------ edge ------------------------------ */
const EDGE = [
  // 左から k さつ目は 右から 何さつ目？
  () => {
    const n = rnd(10, 14), k = rnd(3, n - 3);
    return {
      segs: [S`本だなに 本が ${m1(n + "さつ")} ならんでいます。`, S`ピンクの 本は ${m1(`左から ${k}さつ目`)}です。`,
        { t: "ピンクの 本は 右から かぞえると", near: true }, { t: "何さつ目ですか。", ask: true }],
      steps: [step(null, n - k + 1, "さつ目", "絵の 本を 右はしから じゅんに タップして かぞえよう。ピンクの 本も 1さつに 入れるよ")],
      pic: { type: "books", n, marks: { [k]: "pink" } },
    };
  },
  // 2さつの あいだの 本
  () => {
    const n = rnd(11, 14), k1 = rnd(2, 5), k2 = rnd(k1 + 3, n - 1);
    return {
      segs: [{ t: `本が ${n}さつ ならんでいます。` }, S`青い 本は ${m1(`左から ${k1}さつ目`)}、`, S`ピンクの 本は ${m1(`左から ${k2}さつ目`)}です。`,
        { t: "2さつの あいだに ある 本は", near: true }, { t: "何さつですか。", ask: true }],
      steps: [step(null, k2 - k1 - 1, "さつ", "青と ピンクの 本は 入れないよ。あいだの 本だけ タップして かぞえよう")],
      pic: { type: "books", n, marks: { [k1]: "blue", [k2]: "pink" } },
    };
  },
  // 1週間 まえ／あと
  () => {
    const month = rnd(4, 11), days = [4, 6, 9, 11].includes(month) ? 30 : 31, first = rnd(0, 6);
    const before = Math.random() < 0.5, d = before ? rnd(10, days - 2) : rnd(3, days - 9);
    const ans = before ? d - 7 : d + 7;
    const ev = before ? pick(["ピアノの はっぴょう会", "歯いしゃさんの 日"]) : pick(["えんそく", "おばあちゃんの たんじょう日"]);
    return {
      segs: [S`きょうは ${m1(`${month}月${d}日`)}です。`, S`${ev}は きょうの ${m1(`1週間 ${before ? "まえ" : "あと"}`)}${before ? "でした" : "です"}。`,
        { t: `${ev}は`, near: true }, { t: `${month}月 何日ですか。`, ask: true }],
      steps: [step(null, ans, "日", `1週間は 7日。カレンダーで ${d}日から 1日ずつ タップして 7つ ${before ? "もどろう" : "すすもう"}。たての 1だん ${before ? "上" : "下"}でも わかるよ`)],
      pic: { type: "cal", month, first, days, marks: { [d]: "pink" } },
    };
  },
  // ○日から ○日まで は 何日間？
  () => {
    const month = rnd(4, 11), days = [4, 6, 9, 11].includes(month) ? 30 : 31, first = rnd(0, 6);
    const s = rnd(2, days - 12), e = s + rnd(4, 9);
    return {
      segs: [S`${m1(`${month}月${s}日から ${e}日まで`)}、`, { t: "まいにち 朝顔に 水を やりました。" },
        { t: "水を やったのは", near: true }, { t: "ぜんぶで 何日間ですか。", ask: true }],
      steps: [step(null, e - s + 1, "日間", `${s}日も ${e}日も 入るよ。カレンダーを タップして かぞえよう（${e} − ${s} だと 1日 たりないよ）`)],
      pic: { type: "cal", month, first, days, marks: { [s]: "pink", [e]: "pink" } },
    };
  },
];

/* ------------------------------ unit ------------------------------ */
/* たんいの もんだいは cm・mm と L・dL で べつべつに 4だんかい（だんかいは セーブに のこす）
     1: くりあがり・くりさがり なし（短い 文：2文まで）   例 6cm8mm − 2cm3mm ／ 2L3dL ＋ 1L4dL
     2: くりあがり あり（短い 文）                          例 3cm7mm ＋ 2cm5mm
     3: くりさがり あり（ながい 文）                        例 8cm2mm − 3cm5mm
     4: ちょうどの 数からの ひきざん（ながい 文）          例 12cm − 4cm6mm ／ 3L − 1L4dL
   ヒントなしで せいかいが 2かい つづいたら つぎの だんかいへ。まちがえても だんかいは 下げない
   数は ぜんぶ 小さい たんい（mm・dL）で もつ：12cm4mm → 124 */
export const UNIT_LEVELS = 4;
export const UNIT_SYS = { cm: { big: "cm", small: "mm", name: "cm・mm" }, L: { big: "L", small: "dL", name: "L・dL" } };
export const fmtUnit = (sys, x) => {
  const u = UNIT_SYS[sys], B = Math.floor(x / 10), s = x % 10;
  return (B ? B + u.big : "") + (s ? s + u.small : "") || "0" + u.small;
};
const NOT15 = (lo, hi) => { for (;;) { const v = rnd(lo, hi); if (v !== 15) return v; } };   // テストの 形（15cm − …）に しない

// 数を きめる（[a, b, op]。a・b は 小さい たんい）
function unitNumbers(sys, level) {
  const cm = sys === "cm";
  if (level === 1) {
    if (Math.random() < 0.5) {                                       // ひきざん（くりさがり なし）
      const A = cm ? NOT15(4, 13) : rnd(2, 5), a2 = rnd(2, 9), B = rnd(1, A - 1), b2 = rnd(1, a2 - 1);
      return [A * 10 + a2, B * 10 + b2, "-"];
    }
    const A = cm ? rnd(2, 9) : rnd(1, 3), a2 = rnd(1, 8), B = cm ? rnd(1, 8) : rnd(1, 3), b2 = rnd(1, 9 - a2);
    return [A * 10 + a2, B * 10 + b2, "+"];                          // たしざん（くりあがり なし）
  }
  if (level === 2) {
    const A = cm ? rnd(2, 9) : rnd(1, 3), B = cm ? rnd(1, 8) : rnd(0, 2), a2 = rnd(2, 9), b2 = rnd(11 - a2, 9);
    return [A * 10 + a2, B * 10 + b2, "+"];
  }
  if (level === 3) {
    const A = cm ? NOT15(5, 19) : rnd(2, 5), a2 = rnd(1, 8), b2 = rnd(a2 + 1, 9), B = rnd(cm ? 1 : 0, A - 2);
    return [A * 10 + a2, B * 10 + b2, "-"];
  }
  const A = cm ? NOT15(6, 19) : rnd(2, 5), B = rnd(cm ? 1 : 0, A - 2), b2 = rnd(1, 9);
  return [A * 10, B * 10 + b2, "-"];
}

// ばめん。short=true は 2文まで
const SCENES = {
  "cm-": [
    (a, b, sh) => sh ? [S`${a}の リボンから ${b} 切りました。`, near("のこりの リボンは"), ask("何cm何mmですか。")]
      : [S`${a}の リボンが あります。`, S`${b} 切って、プレゼントの かざりに つかいました。`, near("のこりの リボンは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [S`${a}の テープを ${b} つかいました。`, near("のこりの テープは"), ask("何cm何mmですか。")]
      : [S`こうさくで つかう テープが ${a} あります。`, S`はこに はるのに ${b} つかいました。`, near("のこりの テープは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [S`${a}の ひもから ${b} 切りとりました。`, near("のこりの ひもは"), ask("何cm何mmですか。")]
      : [S`${a}の ひもが あります。`, S`${b} 切って、ふくろの 口を しばりました。`, near("のこった ひもは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [S`${a}の ぼうを ${b} みじかく しました。`, near("ぼうの ながさは"), ask("何cm何mmに なりましたか。")]
      : [S`${a}の ぼうが あります。`, S`はしを ${b} 切りおとしました。`, near("みじかく なった ぼうは"), ask("何cm何mmですか。")],
  ],
  "cm+": [
    (a, b) => [S`${a}の テープと ${b}の テープを かさねずに つなぎました。`, near("ぜんぶの ながさは"), ask("何cm何mmですか。")],
    (a, b) => [S`赤い ひもは ${a}、白い ひもは ${b}です。`, near("2本 あわせると"), ask("何cm何mmですか。")],
    (a, b) => [S`${a}の ぼうに ${b}の ぼうを まっすぐ つなげました。`, near("ぼうは ぜんぶで"), ask("何cm何mmに なりましたか。")],
    (a, b) => [S`プレゼントに ${a}、かみかざりに ${b}の リボンを つかいました。`, near("つかった リボンは あわせて"), ask("何cm何mmですか。")],
  ],
  "L-": [
    (a, b, sh) => sh ? [S`やかんの お茶 ${a}から、みんなの 水とうに ${b} 入れました。`, near("やかんに のこった お茶は"), ask("何L何dLですか。")]
      : [S`やかんに お茶が ${a} あります。`, S`えんそくの ために、みんなの 水とうに ${b} 入れました。`, near("やかんに のこった お茶は"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [S`${a}の ジュースを ${b} のみました。`, near("のこりの ジュースは"), ask("何L何dLですか。")]
      : [S`パーティーの ジュースが ${a} あります。`, S`みんなで ${b} のみました。`, near("のこりの ジュースは"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [S`${a}の 牛にゅうから ${b} つかいました。`, near("のこりの 牛にゅうは"), ask("何L何dLですか。")]
      : [S`牛にゅうが ${a} あります。`, S`ホットケーキを 作るのに ${b} つかいました。`, near("のこりの 牛にゅうは"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [S`水そうの 水 ${a}から ${b} くみ出しました。`, near("水そうの 水は"), ask("何L何dLに なりましたか。")]
      : [S`水そうに 水が ${a} 入っています。`, S`そうじの ために ${b} くみ出しました。`, near("水そうの 水は"), ask("何L何dLに なりましたか。")],
  ],
  "L+": [
    (a, b) => [S`やかんに ${a}、ポットに ${b}の 水が あります。`, near("水は あわせて"), ask("何L何dLですか。")],
    (a, b) => [S`りんごジュース ${a}と みかんジュース ${b}を まぜました。`, near("ジュースは ぜんぶで"), ask("何L何dLですか。")],
    (a, b) => [S`${a}の 水が 入った 水そうに、${b} たしました。`, near("水そうの 水は"), ask("何L何dLに なりましたか。")],
  ],
};

function unitHintText(sys, level, a, b, op) {
  const u = UNIT_SYS[sys], A = Math.floor(a / 10), a2 = a % 10, b2 = b % 10;
  if (level === 1) return `${u.big}は ${u.big}どうし、${u.small}は ${u.small}どうし けいさん しよう`;
  if (level === 2) return `${u.small}を たすと ${a2 + b2}${u.small}。10${u.small}で 1${u.big}に なるよ`;
  if (level === 3) return `${a2}${u.small}から ${b2}${u.small}は ひけないね。1${u.big}を 10${u.small}に ばらして、${fmtUnit(sys, a)}を ${A - 1}${u.big}${10 + a2}${u.small}と かんがえよう`;
  return `${A}${u.big}を ${A - 1}${u.big}10${u.small}と かんがえよう（1${u.big}＝10${u.small}）`;
}

export function makeUnit(sys, level) {
  const [a, b, op] = unitNumbers(sys, level);
  const r = op === "+" ? a + b : a - b;
  const scene = pick(SCENES[sys + op]);
  return {
    segs: scene(m1(fmtUnit(sys, a)), m1(fmtUnit(sys, b)), level <= 2),
    steps: [{ label: null, slots: [{ ans: Math.floor(r / 10), unit: UNIT_SYS[sys].big }, { ans: r % 10, unit: UNIT_SYS[sys].small }],
      hint: unitHintText(sys, level, a, b, op) }],
    unit: { sys, level, op, a, b, borrow: op === "-" && level >= 3 },
  };
}

/* たんいの だんかい（セーブの daily.yomitori。無い／こわれていても ここで なおす） */
export function normalizeUnitProgress(p) {
  const one = (x) => {
    const level = Number.isInteger(x && x.level) ? Math.min(UNIT_LEVELS, Math.max(1, x.level)) : 1;
    const streak = Number.isInteger(x && x.streak) ? Math.min(1, Math.max(0, x.streak)) : 0;
    return { level, streak };
  };
  return { cm: one(p && p.cm), L: one(p && p.L) };
}
/* その日の けっか（{ unit:"cm"|"L", right, hint }）で だんかいを すすめる。下げる ことは しない */
export function applyUnitResults(p, results) {
  const out = normalizeUnitProgress(p);
  for (const r of results || []) {
    if (!r || !out[r.unit]) continue;
    const cur = out[r.unit];
    if (r.right && !r.hint) {
      const streak = cur.streak + 1;
      out[r.unit] = streak >= 2 ? { level: Math.min(UNIT_LEVELS, cur.level + 1), streak: 0 } : { level: cur.level, streak };
    } else out[r.unit] = { level: cur.level, streak: 0 };
  }
  return out;
}

export const YOMITORI_KINDS = { one: ONE, two: TWO, edge: EDGE, unit: null };
export const YOMITORI_PER_DAY = 3;      // 1日 10もんの うち よみとりチェックの 数

let serial = 0;
export function makeYomitori(kind, progress) {
  let q;
  if (kind === "unit") { const pr = normalizeUnitProgress(progress), sys = pick(["cm", "L"]); q = makeUnit(sys, pr[sys].level); }
  else q = pick(YOMITORI_KINDS[kind])();
  return { ...q, wp: true, kind: "wp-" + kind, id: `wp-${kind}-${Date.now().toString(36)}-${serial++}` };
}

/* きょうの よみとりチェック：4しゅるいから ちがう しゅるいを n こ。progress は たんいの だんかい */
export function buildYomitoriSet(n = YOMITORI_PER_DAY, progress) {
  const kinds = Object.keys(YOMITORI_KINDS);
  for (let i = kinds.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  return kinds.slice(0, n).map((k) => makeYomitori(k, progress));
}

/* こたえあわせ：inputs は slot ごとの 文字列 */
export const stepCorrect = (st, inputs) => st.slots.every((s, i) => Number(inputs[i]) === s.ans && inputs[i] !== "");

/* ---------------- 読み方の 手つだいを 少しずつ へらす（3だんかい） ----------------
   A … アプリが「きかれている ところ」を えらばせ、せいかい したら アプリが マーカーを ひく
   B … 「きかれている ところ」は えらばせる。せいかい したら つかった 数を 子どもが タップして マーカーを ひく
   C … 「きかれている ところ」の タップは しなくて よい。じぶんで タップすれば マーカーが ひける
   「きかれている ところ」を いっぱつで 見つける 回が 3かい つづいたら つぎへ。じどうで 下げる ことは しない
   セーブ：daily.yomiRead = { stage:"A"|"B"|"C", streak }（無い／こわれた セーブは A から） */
export const READ_STAGES = ["A", "B", "C"];
export const READ_STREAK_UP = 3;
export function normalizeReadProgress(p) {
  const stage = p && READ_STAGES.includes(p.stage) ? p.stage : "A";
  const streak = p && Number.isInteger(p.streak) ? Math.min(READ_STREAK_UP - 1, Math.max(0, p.streak)) : 0;
  return { stage, streak };
}
/* results の oneShot（true／false。C の ときは null で かぞえない）で すすめる */
export function applyReadResults(p, results) {
  let { stage, streak } = normalizeReadProgress(p);
  for (const r of results || []) {
    if (!r || typeof r.oneShot !== "boolean" || stage === "C") continue;
    if (!r.oneShot) { streak = 0; continue; }
    streak += 1;
    if (streak >= READ_STREAK_UP) { stage = READ_STAGES[READ_STAGES.indexOf(stage) + 1]; streak = 0; }
  }
  return { stage, streak };
}

/* ほめる ことば（毎回 おなじに ならないように えらぶ） */
export const PRAISE = {
  oneShot: ["いっぱつで みつけたね！", "よく よめたね！ そこが きかれている ところ！", "さいごまで よめたね！ ばっちり！", "めいたんてい みたい！ いっぱつ！"],
  through: ["とちゅうで とまらずに ②まで できたね！", "「まだ つづきが ある」に きづけたね！", "さいごの しつもんまで たどりついたね！"],
  selfMark: ["じぶんで マーカーを ひけたね！", "つかう 数を じぶんで 見つけたね！", "マーカーの つかいかた、ばっちり！"],
};
export const pickPraise = (kind) => pick(PRAISE[kind]);
