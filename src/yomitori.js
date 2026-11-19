/* =====================================================================
   よみとりチェック — もんだいを つくる（純粋関数。画面は YomitoriQuestion.jsx）
   ねらい：もんだいぶんを さいごまで よまずに こたえる ミスを へらす
   - こたえる まえに「きかれている ところ」を タップする
   - 4しゅるい：
       one  … 1つの しきで とける ぶんしょうだい（よけいな 数が まざる ことも ある）
       two  … 2だんかいの もんだい（① の こたえを 入れたら「まだ つづきが あるよ」→ ②）
       edge … はしの かぞえかた（本だな／カレンダーの 絵を タップして かぞえる）
       unit … たんいの くりさがり・くりあがり（cm・mm／L・dL）
   - もんだいぶんは すべて この アプリの オリジナル
   もんだいの かたち：
     { wp:true, kind, id, segs:[{ t, ask?, near? }], steps:[{ label, slots:[{ ans, unit }], hint }], pic? }
       segs … もんだいぶんを タップできる まとまりに 分けたもの。ask が「きかれている ところ」
               near は ask の すぐ まえ（「おしい！」と 声を かける）
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
const UNIT = [
  // a cm − b cm c mm
  () => {
    const a = rnd(10, 20), b = rnd(2, a - 3), c = rnd(1, 9);
    return {
      segs: [{ t: `${a}cmの リボンが あります。` }, { t: `${b}cm${c}mm 切って つかいました。` },
        { t: "のこりの リボンは", near: true }, { t: "何cm何mmですか。", ask: true }],
      steps: [{ label: null, slots: [{ ans: a - b - 1, unit: "cm" }, { ans: 10 - c, unit: "mm" }],
        hint: `mmが ひけないね。${a}cmを ${a - 1}cm10mmと かんがえよう（1cm＝10mm）` }],
    };
  },
  // a cm d mm − b cm c mm（mm が たりない）
  () => {
    const a = rnd(9, 18), b = rnd(2, a - 3), c = rnd(3, 9), d = rnd(1, c - 1);
    return {
      segs: [{ t: `${a}cm${d}mmの テープから、` }, { t: `${b}cm${c}mmを 切りとりました。` },
        { t: "のこりの テープは", near: true }, { t: "何cm何mmですか。", ask: true }],
      steps: [{ label: null, slots: [{ ans: a - b - 1, unit: "cm" }, { ans: 10 + d - c, unit: "mm" }],
        hint: `${d}mmから ${c}mmは ひけないね。1cmを 10mmに して、${10 + d}mm − ${c}mm に しよう` }],
    };
  },
  // a L b dL ＋ c dL（dL が 10を こえる）
  () => {
    const a = rnd(1, 3), b = rnd(3, 8), c = rnd(11 - b, 9);
    return {
      segs: [{ t: `水とうに お茶が ${a}L${b}dL 入っています。` }, { t: `そこへ ${c}dL たしました。` },
        { t: "お茶は ぜんぶで", near: true }, { t: "何L何dLに なりましたか。", ask: true }],
      steps: [{ label: null, slots: [{ ans: a + 1, unit: "L" }, { ans: b + c - 10, unit: "dL" }],
        hint: `${b}dL ＋ ${c}dL ＝ ${b + c}dL。10dLで 1Lに なるよ（1L＝10dL）` }],
    };
  },
  // a L b dL − c dL（dL が たりない）
  () => {
    const a = rnd(2, 4), b = rnd(1, 6), c = rnd(b + 1, 9);
    return {
      segs: [{ t: `ジュースが ${a}L${b}dL あります。` }, { t: `みんなで ${c}dL のみました。` },
        { t: "のこりの ジュースは", near: true }, { t: "何L何dLですか。", ask: true }],
      steps: [{ label: null, slots: [{ ans: a - 1, unit: "L" }, { ans: 10 + b - c, unit: "dL" }],
        hint: `${b}dLから ${c}dLは ひけないね。1Lを 10dLに して、${10 + b}dL − ${c}dL に しよう` }],
    };
  },
];

export const YOMITORI_KINDS = { one: ONE, two: TWO, edge: EDGE, unit: UNIT };
export const YOMITORI_PER_DAY = 3;      // 1日 10もんの うち よみとりチェックの 数

let serial = 0;
export function makeYomitori(kind) {
  const q = pick(YOMITORI_KINDS[kind])();
  return { ...q, wp: true, kind: "wp-" + kind, id: `wp-${kind}-${Date.now().toString(36)}-${serial++}` };
}

/* きょうの よみとりチェック：4しゅるいから ちがう しゅるいを n こ */
export function buildYomitoriSet(n = YOMITORI_PER_DAY) {
  const kinds = Object.keys(YOMITORI_KINDS);
  for (let i = kinds.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
  return kinds.slice(0, n).map(makeYomitori);
}

/* こたえあわせ：inputs は slot ごとの 文字列 */
export const stepCorrect = (st, inputs) => st.slots.every((s, i) => Number(inputs[i]) === s.ans && inputs[i] !== "");
