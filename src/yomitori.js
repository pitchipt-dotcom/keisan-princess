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
     { wp:true, kind, id, segs:[{ t, ask?, near? }], steps:[{ label, slots:[{ ans, unit }], hint }], pic? }
       segs … もんだいぶんを タップできる まとまりに 分けたもの。ask が「きかれている ところ」
               near は ask の すぐ まえ（「おしい！」と 声を かける）
       unit … たんいの もんだいだけ { sys:"cm"|"L", level, op, a, b, borrow }（ヒントの 図に つかう）
       pic  … { type:"books", n, marks:{ 位置:"pink"|"blue" } }
               { type:"cal", month, first(1日の 曜日 0=日), days, marks:{ 日:"pink" } }
   ===================================================================== */

const rnd = (lo, hi) => lo + ((Math.random() * (hi - lo + 1)) | 0);
const pick = (arr) => arr[rnd(0, arr.length - 1)];
const NAMES = ["ゆい", "はな", "りこ", "さき", "めい", "あおい", "つむぎ", "ひなた"];

// 1つの こたえ（1つの たんい）の だんかい
const step = (label, ans, unit, hint) => ({ label, slots: [{ ans, unit }], hint });

/* ------------------------------ one ------------------------------ */
const ONE = [
  () => {
    const a = rnd(25, 68), b = rnd(12, a - 8);
    return {
      segs: [{ t: `赤い ビーズが ${a}こ、` }, { t: `青い ビーズが ${b}こ あります。` },
        { t: "赤い ビーズは 青い ビーズより", near: true }, { t: "何こ おおいですか。", ask: true }],
      steps: [step(null, a - b, "こ", `「何こ おおい」は ちがいを きいているよ。${a} − ${b} を けいさん しよう`)],
    };
  },
  () => {
    const a = rnd(21, 45), b = rnd(6, a - 9);
    return {
      segs: [{ t: `こうえんで 子どもが ${a}人 あそんでいます。` }, { t: `${b}人 かえりました。` },
        { t: "まだ あそんでいる 子どもは", near: true }, { t: "何人ですか。", ask: true }],
      steps: [step(null, a - b, "人", `かえった 人は いなくなるから ひきざん。${a} − ${b} だよ`)],
    };
  },
  () => {
    const a = rnd(13, 48), b = rnd(12, 39), c = rnd(5, 19);
    return {
      segs: [{ t: `花だんに 赤い 花が ${a}本、` }, { t: `白い 花が ${b}本、` }, { t: `きいろい 花が ${c}本 さいています。` },
        { t: "赤い 花と 白い 花は", near: true }, { t: "あわせて 何本ですか。", ask: true }],
      steps: [step(null, a + b, "本", `きかれているのは 赤と 白だけ。きいろは 入れないよ。${a} ＋ ${b} だね`)],
    };
  },
  () => {
    const a = rnd(18, 40), b = rnd(a + 6, a + 35);
    return {
      segs: [{ t: `なわとびを きのうは ${a}かい、` }, { t: `きょうは ${b}かい とびました。` },
        { t: "きょうは きのうより", near: true }, { t: "何かい おおく とびましたか。", ask: true }],
      steps: [step(null, b - a, "かい", `ちがいを きいているよ。おおい ほうから すくない ほうを ひこう：${b} − ${a}`)],
    };
  },
  () => {
    const name = pick(NAMES), a = rnd(16, 57), b = rnd(14, 38);
    return {
      segs: [{ t: `${name}さんは どんぐりを ${a}こ ひろいました。` }, { t: `おにいさんは ${b}こ ひろいました。` },
        { t: "2人 あわせて", near: true }, { t: "何こ ひろいましたか。", ask: true }],
      steps: [step(null, a + b, "こ", `「あわせて」は たしざん。${a} ＋ ${b} だよ`)],
    };
  },
];

/* ------------------------------ two ------------------------------ */
const TWO = [
  // のこりを 同じ 数ずつ 分ける（九九で かんがえる）
  () => {
    const k = pick([2, 3]), each = rnd(3, 8), rest = k * each, a = rnd(3, 7), b = rnd(3, 8), n = rest + a + b;
    return {
      segs: [{ t: `花が ${n}本 あります。` }, { t: `${a}本と ${b}本を リースに つかいました。` },
        { t: `のこりの 花を ${k}つの かびんに 同じ 数ずつ 分けます。` },
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
      segs: [{ t: `あめを 1人に ${p}こずつ、` }, { t: `${m}人に くばりました。` }, { t: `まだ ${r}こ のこっています。` },
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
      segs: [{ t: `シールを ${a}まい もっていました。` }, { t: `おねえさんから ${b}まい もらい、` }, { t: `ともだちに ${c}まい あげました。` },
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
      segs: [{ t: `本だなに 本が ${n}さつ ならんでいます。` }, { t: `ピンクの 本は 左から ${k}さつ目です。` },
        { t: "ピンクの 本は 右から かぞえると", near: true }, { t: "何さつ目ですか。", ask: true }],
      steps: [step(null, n - k + 1, "さつ目", "絵の 本を 右はしから じゅんに タップして かぞえよう。ピンクの 本も 1さつに 入れるよ")],
      pic: { type: "books", n, marks: { [k]: "pink" } },
    };
  },
  // 2さつの あいだの 本
  () => {
    const n = rnd(11, 14), k1 = rnd(2, 5), k2 = rnd(k1 + 3, n - 1);
    return {
      segs: [{ t: `本が ${n}さつ ならんでいます。` }, { t: `青い 本は 左から ${k1}さつ目、` }, { t: `ピンクの 本は 左から ${k2}さつ目です。` },
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
      segs: [{ t: `きょうは ${month}月${d}日です。` }, { t: `${ev}は きょうの 1週間 ${before ? "まえ" : "あと"}${before ? "でした" : "です"}。` },
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
      segs: [{ t: `${month}月${s}日から ${e}日まで、` }, { t: "まいにち 朝顔に 水を やりました。" },
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
const near = (t) => ({ t, near: true }), ask = (t) => ({ t, ask: true });
const SCENES = {
  "cm-": [
    (a, b, sh) => sh ? [{ t: `${a}の リボンから ${b} 切りました。` }, near("のこりの リボンは"), ask("何cm何mmですか。")]
      : [{ t: `${a}の リボンが あります。` }, { t: `${b} 切って、プレゼントの かざりに つかいました。` }, near("のこりの リボンは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [{ t: `${a}の テープを ${b} つかいました。` }, near("のこりの テープは"), ask("何cm何mmですか。")]
      : [{ t: `こうさくで つかう テープが ${a} あります。` }, { t: `はこに はるのに ${b} つかいました。` }, near("のこりの テープは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [{ t: `${a}の ひもから ${b} 切りとりました。` }, near("のこりの ひもは"), ask("何cm何mmですか。")]
      : [{ t: `${a}の ひもが あります。` }, { t: `${b} 切って、ふくろの 口を しばりました。` }, near("のこった ひもは"), ask("何cm何mmですか。")],
    (a, b, sh) => sh ? [{ t: `${a}の ぼうを ${b} みじかく しました。` }, near("ぼうの ながさは"), ask("何cm何mmに なりましたか。")]
      : [{ t: `${a}の ぼうが あります。` }, { t: `はしを ${b} 切りおとしました。` }, near("みじかく なった ぼうは"), ask("何cm何mmですか。")],
  ],
  "cm+": [
    (a, b) => [{ t: `${a}の テープと ${b}の テープを かさねずに つなぎました。` }, near("ぜんぶの ながさは"), ask("何cm何mmですか。")],
    (a, b) => [{ t: `赤い ひもは ${a}、白い ひもは ${b}です。` }, near("2本 あわせると"), ask("何cm何mmですか。")],
    (a, b) => [{ t: `${a}の ぼうに ${b}の ぼうを まっすぐ つなげました。` }, near("ぼうは ぜんぶで"), ask("何cm何mmに なりましたか。")],
    (a, b) => [{ t: `プレゼントに ${a}、かみかざりに ${b}の リボンを つかいました。` }, near("つかった リボンは あわせて"), ask("何cm何mmですか。")],
  ],
  "L-": [
    (a, b, sh) => sh ? [{ t: `やかんの お茶 ${a}から、みんなの 水とうに ${b} 入れました。` }, near("やかんに のこった お茶は"), ask("何L何dLですか。")]
      : [{ t: `やかんに お茶が ${a} あります。` }, { t: `えんそくの ために、みんなの 水とうに ${b} 入れました。` }, near("やかんに のこった お茶は"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [{ t: `${a}の ジュースを ${b} のみました。` }, near("のこりの ジュースは"), ask("何L何dLですか。")]
      : [{ t: `パーティーの ジュースが ${a} あります。` }, { t: `みんなで ${b} のみました。` }, near("のこりの ジュースは"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [{ t: `${a}の 牛にゅうから ${b} つかいました。` }, near("のこりの 牛にゅうは"), ask("何L何dLですか。")]
      : [{ t: `牛にゅうが ${a} あります。` }, { t: `ホットケーキを 作るのに ${b} つかいました。` }, near("のこりの 牛にゅうは"), ask("何L何dLですか。")],
    (a, b, sh) => sh ? [{ t: `水そうの 水 ${a}から ${b} くみ出しました。` }, near("水そうの 水は"), ask("何L何dLに なりましたか。")]
      : [{ t: `水そうに 水が ${a} 入っています。` }, { t: `そうじの ために ${b} くみ出しました。` }, near("水そうの 水は"), ask("何L何dLに なりましたか。")],
  ],
  "L+": [
    (a, b) => [{ t: `やかんに ${a}、ポットに ${b}の 水が あります。` }, near("水は あわせて"), ask("何L何dLですか。")],
    (a, b) => [{ t: `りんごジュース ${a}と みかんジュース ${b}を まぜました。` }, near("ジュースは ぜんぶで"), ask("何L何dLですか。")],
    (a, b) => [{ t: `${a}の 水が 入った 水そうに、${b} たしました。` }, near("水そうの 水は"), ask("何L何dLに なりましたか。")],
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
    segs: scene(fmtUnit(sys, a), fmtUnit(sys, b), level <= 2),
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
