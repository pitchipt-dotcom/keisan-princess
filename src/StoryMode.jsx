import React, { useState, useContext, createContext } from "react";

/* =========================================================================
   おはなしモード  —  ルナと マリンの かいわで、さんすうの いみを わかる
   5つの しょう:たしざん・ひきざん・かけざん・わりざん・ぶんすう
   どの しょうも「かいわの せつめい(図つき)→ ぶんしょうだい 5もん」。
   もんだいは まいかい じどうで つくる(かずも ぶんも かわる)。せんたくしは 4つ。

   こどもに みせる ぶんは、小2が よめるように ひらがな ちゅうしん・わかちがき。
   かんじは 人・本・花・日・子 だけ。
   キャラの絵(Witch / Mermaid / Princess)と MiniItem は App.jsx から props で もらう。
   ========================================================================= */

const ItemCtx = createContext(null);

/* ----------------------------- helpers ---------------------------------- */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (n) => Array.from({ length: n }, (_, i) => i);
const NAMES = ["ルナ", "マリン", "ロゼ"];
const twoNames = () => shuffle(NAMES).slice(0, 2);

const THINGS = [
  { name: "あめ", c: "こ", type: "candy", eat: "たべた" },
  { name: "クッキー", c: "まい", type: "cookie", eat: "たべた" },
  { name: "ほし", c: "こ", type: "star", eat: "つかった" },
  { name: "花", c: "本", type: "flower", eat: "あげた" },
];

// 数の せんたくし:こたえ + まちがえやすい 3つ(0 より 大きい せいすう)
function num(ans, cands) {
  const seen = new Set([ans]);
  const out = [];
  for (const c of shuffle(cands)) {
    if (Number.isInteger(c) && c > 0 && !seen.has(c)) { seen.add(c); out.push(c); }
    if (out.length === 3) break;
  }
  for (let k = 1; out.length < 3; k++) {
    for (const c of [ans + k, ans - k]) if (c > 0 && !seen.has(c) && out.length < 3) { seen.add(c); out.push(c); }
  }
  return { ans: String(ans), options: shuffle([ans, ...out]).map((v) => ({ id: String(v), view: v })) };
}

// 分数の せんたくし。1 いじょうの 分数と、こたえと おなじ 大きさの 分数(2/4 など)は 出さない。
// まちがいの せんたくしどうしも、おなじ 大きさに ならないように する。
const sameSize = (a, b) => a.n * b.d === b.n * a.d;
const properFrac = (f) => Number.isInteger(f.n) && Number.isInteger(f.d) && f.n >= 1 && f.n < f.d;
function fracOptions(ans, cands) {
  const chosen = [ans];
  for (const f of shuffle(cands)) {
    if (properFrac(f) && !chosen.some((c) => sameSize(c, f))) chosen.push(f);
    if (chosen.length === 4) break;
  }
  for (let guard = 0; chosen.length < 4 && guard < 300; guard++) {
    const d = rnd(2, 8), f = { n: rnd(1, d - 1), d };
    if (!chosen.some((c) => sameSize(c, f))) chosen.push(f);
  }
  return {
    ans: `${ans.n}/${ans.d}`,
    optClass: "sm-opt-frac",
    options: shuffle(chosen).map((f) => ({ id: `${f.n}/${f.d}`, view: <Frac n={f.n} d={f.d} /> })),
  };
}

// 「ひき」は かずで よみかたが かわる
const hiki = (n) => ({ 1: "ぴき", 3: "びき", 6: "ぴき", 8: "ぴき", 10: "ぴき" }[n] || "ひき");

/* ----------------------------- 図 ---------------------------------------- */
export function Frac({ n, d, size }) {
  return (
    <span className="sm-frac" style={size ? { fontSize: size } : undefined} role="img" aria-label={`${d}ぶんの${n}`}>
      <span>{n}</span><span className="sm-frac-bar" /><span>{d}</span>
    </span>
  );
}

function Items({ n, type, size = 18, mark }) {
  const MiniItem = useContext(ItemCtx);
  return (
    <div className="sm-items">
      {range(n).map((i) => {
        const m = mark ? mark(i) : null;
        return <span key={i} className={"sm-item" + (m ? " sm-item-" + m : "")}><MiniItem type={type} size={size} /></span>;
      })}
    </div>
  );
}

function EmojiRow({ n, e, mark }) {
  return (
    <div className="sm-items sm-emoji">
      {range(n).map((i) => { const m = mark ? mark(i) : null; return <span key={i} className={"sm-item" + (m ? " sm-item-" + m : "")}>{e}</span>; })}
    </div>
  );
}

function Box({ children, label, tone }) {
  return (
    <div className={"sm-box" + (tone ? " sm-box-" + tone : "")}>
      {children}
      {label && <div className="sm-box-label">{label}</div>}
    </div>
  );
}

function Row({ children }) {
  return <div className="sm-row">{children}</div>;
}
const Op = ({ children }) => <div className="sm-op">{children}</div>;

function TwoGroups({ a, b, type, op = "＋" }) {
  return (
    <Row>
      <Box><Items n={a} type={type} size={17} /></Box>
      <Op>{op}</Op>
      <Box><Items n={b} type={type} size={17} /></Box>
    </Row>
  );
}

// 10本の たばと ばら
function Bundles({ tens = 0, ones = 0, label = true }) {
  const parts = [];
  let x = 4;
  const stick = (sx, key) => (
    <g key={key}>
      <rect x={sx} y={8} width={3.4} height={38} rx={1.2} fill="#FFC94D" stroke="#F2A93B" strokeWidth={0.8} />
      <path d={`M${sx} 8 l1.7 -5 l1.7 5Z`} fill="#4A2D6B" />
    </g>
  );
  for (let t = 0; t < tens; t++) {
    for (let i = 0; i < 10; i++) parts.push(stick(x + i * 3.6, `t${t}-${i}`));
    parts.push(<rect key={`band${t}`} x={x - 1.5} y={25} width={39} height={6} rx={2} fill="#E85FA3" />);
    x += 46;
  }
  if (tens && ones) x += 4;
  for (let o = 0; o < ones; o++) { parts.push(stick(x, `o${o}`)); x += 8; }
  const w = Math.max(x + 2, 20);
  return (
    <div className="sm-bundles">
      <svg viewBox={`0 0 ${w} 50`} width={Math.min(w * 1.25, 290)} height={Math.min(w * 1.25, 290) * 50 / w} aria-hidden="true">{parts}</svg>
      {label && <div className="sm-box-label">{tens ? `たば ${tens}つ` : ""}{tens && ones ? " と " : ""}{ones ? `ばら ${ones}本` : ""}</div>}
    </div>
  );
}
const bundlesOf = (n) => <Bundles tens={Math.floor(n / 10)} ones={n % 10} />;

function CrossOut({ a, b, type }) {
  return <Box><Items n={a} type={type} size={18} mark={(i) => (i >= a - b ? "cross" : null)} /></Box>;
}

function CompareRows({ a, b, type, nameA, nameB }) {
  const MiniItem = useContext(ItemCtx);
  const max = Math.max(a, b);
  const row = (n, name) => (
    <div className="sm-cmp-row">
      <span className="sm-cmp-name">{name}</span>
      {range(max).map((i) => (
        <span key={i} className={"sm-cmp-cell" + (i >= Math.min(a, b) && i < n ? " sm-item-extra" : "")}>
          {i < n ? <MiniItem type={type} size={15} /> : null}
        </span>
      ))}
    </div>
  );
  return <div className="sm-cmp">{row(a, nameA)}{row(b, nameB)}</div>;
}

function Plates({ g, k, type, label }) {
  return (
    <div className="sm-plates">
      {range(g).map((i) => (
        <div key={i} className="sm-plate"><Items n={k} type={type} size={14} />{label && <span className="sm-plate-who">{label(i)}</span>}</div>
      ))}
    </div>
  );
}

function BaiBars({ k, g, unit = "本" }) {
  const cell = Math.min(22, 230 / (k * g));
  const bar = (count, color) => (
    <div className="sm-bai-bar">
      {range(count).map((i) => <span key={i} className="sm-bai-seg" style={{ width: cell * k, background: color }}>{k}</span>)}
    </div>
  );
  return (
    <div className="sm-bai">
      <div className="sm-bai-line"><span className="sm-bai-name">あか</span>{bar(1, "#FF9FC9")}</div>
      <div className="sm-bai-line"><span className="sm-bai-name">あお</span>{bar(g, "#9CC4FF")}</div>
      <div className="sm-box-label">{k}{unit}の {g}つぶん</div>
    </div>
  );
}

function KukuRow({ k, target }) {
  return (
    <div className="sm-kuku">
      <div className="sm-box-label">{k}の だん</div>
      <div className="sm-kuku-nums">
        {range(9).map((i) => {
          const v = k * (i + 1);
          return <span key={i} className={"sm-kuku-n" + (v === target ? " sm-kuku-hit" : "")}><small>{k}×{i + 1}</small>{v}</span>;
        })}
      </div>
    </div>
  );
}

function KeyWords({ words }) {
  return <div className="sm-keys">{words.map((w) => <span key={w} className="sm-key">{w}</span>)}</div>;
}

// 分数の テープ。parts は わける かず、または 大きさの ならび(合計 1)
function FracBar({ parts, colored = [0], width = 240, height = 34 }) {
  const ws = typeof parts === "number" ? range(parts).map(() => 1 / parts) : parts;
  let x = 2;
  return (
    <svg viewBox={`0 0 ${width + 4} ${height + 4}`} width={width + 4} height={height + 4} style={{ maxWidth: "100%" }} aria-hidden="true">
      {ws.map((w, i) => {
        const pw = w * width;
        const el = <rect key={i} x={x} y={2} width={pw} height={height} fill={colored.includes(i) ? "#FF9FC9" : "#fff"} stroke="#4A2D6B" strokeWidth={2} />;
        x += pw;
        return el;
      })}
    </svg>
  );
}

function FracCircle({ d, n = 1, size = 120 }) {
  const r = size / 2 - 3, c = size / 2;
  const slices = range(d).map((i) => {
    const a0 = (i / d) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / d) * Math.PI * 2 - Math.PI / 2;
    const large = 1 / d > 0.5 ? 1 : 0;
    const p = `M${c} ${c} L${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`;
    return <path key={i} d={p} fill={i < n ? "#FF9FC9" : "#FFF3D9"} stroke="#4A2D6B" strokeWidth={2} strokeLinejoin="round" />;
  });
  return <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">{slices}</svg>;
}

function FracLadder({ dens }) {
  return (
    <div className="sm-ladder">
      {dens.map((d) => (
        <div key={d} className="sm-ladder-row"><span className="sm-ladder-lab"><Frac n={1} d={d} /></span><FracBar parts={d} width={200} height={22} /></div>
      ))}
    </div>
  );
}

function ItemSplit({ m, d, type }) {
  const q = m / d;
  return (
    <Row>
      {range(d).map((i) => (
        <Box key={i} tone={i === 0 ? "hit" : null}><Items n={q} type={type} size={16} /></Box>
      ))}
    </Row>
  );
}

// わりざんの たいけん:「1こずつ くばる」で、おさらに じっさいに くばる
function DealBoard({ total, groups, size, type = "cookie", unit = "こ", doneText }) {
  const share = !!groups;
  const empty = () => (share ? range(groups).map(() => 0) : []);
  const [plates, setPlates] = useState(empty);
  const left = total - plates.reduce((s, v) => s + v, 0);
  const done = share ? left < groups : left < size;
  const deal = () => { if (!done) setPlates((p) => (share ? p.map((v) => v + 1) : [...p, size])); };
  return (
    <div className="sm-deal">
      <div className="sm-deal-pile">
        <div className="sm-box-label">のこり {left}{unit}</div>
        {left > 0 ? <Items n={left} type={type} size={15} /> : <div className="sm-deal-empty">からっぽ！</div>}
      </div>
      <div className="sm-plates">
        {plates.map((v, i) => (
          <div key={i} className="sm-plate sm-plate-pop"><Items n={v} type={type} size={14} /><span className="sm-plate-who">{i + 1}人め</span></div>
        ))}
        {!share && !done && <div className="sm-plate sm-plate-ghost">？</div>}
      </div>
      {!done ? (
        <button className="sm-deal-btn" onClick={deal}>{share ? "1こずつ くばる" : `${size}${unit}ずつ くばる`}</button>
      ) : (
        <>
          {doneText && <div className="sm-deal-done">{doneText}</div>}
          <button className="kk-tiny-btn" onClick={() => setPlates(empty())}>もう いちど くばる</button>
        </>
      )}
    </div>
  );
}

const ANIMALS = [
  { name: "ねこ", e: "🐱", cnt: hiki, part: "あし", per: 4, pc: "本", live: true },
  { name: "いぬ", e: "🐶", cnt: hiki, part: "あし", per: 4, pc: "本", live: true },
  { name: "とり", e: "🐤", cnt: () => "わ", part: "あし", per: 2, pc: "本", live: true },
  { name: "たこ", e: "🐙", cnt: hiki, part: "あし", per: 8, pc: "本", live: true },
  { name: "くるま", e: "🚗", cnt: () => "だい", part: "タイヤ", per: 4, pc: "つ" },
  { name: "さんりんしゃ", e: "🛞", cnt: () => "だい", part: "タイヤ", per: 3, pc: "つ" },
  { name: "よつばの クローバー", e: "🍀", cnt: () => "本", part: "はっぱ", per: 4, pc: "まい" },
];

function LegTable() {
  return (
    <div className="sm-legs">
      {ANIMALS.map((a) => (
        <div key={a.name} className="sm-leg"><span className="sm-leg-e">{a.e}</span><span>{a.name}</span><b>{a.part} {a.per}{a.pc}</b></div>
      ))}
    </div>
  );
}

/* ----------------------------- もんだい ---------------------------------- */
// どの もんだいも { text, fig?, hint: { text, fig? }, ans, options, echo, optClass? }

/* 1. たしざん */
function addAwasete() {
  const t = pick(THINGS), [p1, p2] = twoNames(), a = rnd(3, 9), b = rnd(3, 9), ans = a + b;
  return {
    text: `${p1}は ${t.name}を ${a}${t.c}、${p2}は ${b}${t.c} もって いるよ。ふたりの ${t.name}を あわせると なん${t.c}？`,
    hint: { text: `「あわせると」は たしざんの あいず。${a}${t.c}と ${b}${t.c}を あわせよう。`, fig: <TwoGroups a={a} b={b} type={t.type} /> },
    ...num(ans, [ans + 1, ans - 1, ans + 10, Math.abs(a - b), ans + 2]), echo: `${a} ＋ ${b} ＝ ${ans}`,
  };
}
function addFueru() {
  const a = rnd(11, 28), b = rnd(2, 9), ans = a + b;
  const v = pick([
    { text: `花が ${a}本 さいて いたよ。あとから ${b}本 さいたよ。花は ぜんぶで なん本？` },
    { text: `こうえんで 子どもが ${a}人 あそんで いたよ。あとから ${b}人 きたよ。ぜんぶで なん人に なった？` },
    { text: `そらに ほしが ${a}こ。よるに なって ${b}こ ふえると、ほしは ぜんぶで なんこ？` },
  ]);
  return {
    text: v.text,
    hint: { text: `「ふえると」「ぜんぶで」は たしざんの あいず。${a}に ${b}を たそう。ばらが 10に なったら たばに しよう。`, fig: <Row>{bundlesOf(a)}<Op>＋</Op><Bundles ones={b} /></Row> },
    ...num(ans, [ans + 1, ans - 1, ans + 10, ans - 10, a - b]), echo: `${a} ＋ ${b} ＝ ${ans}`,
  };
}
function addTaba() {
  const t = rnd(2, 9), o = rnd(1, 9), ans = t * 10 + o;
  return {
    text: `えんぴつが 10本ずつ たばに なって いるよ。たばが ${t}つと、ばらが ${o}本 あるよ。えんぴつは ぜんぶで なん本？`,
    hint: { text: `たば 1つは 10本。たばが ${t}つで ${t * 10}本。そこに ばらの ${o}本を たそう。`, fig: <Bundles tens={t} ones={o} /> },
    ...num(ans, [t + o, o * 10 + t, ans + 10, ans - 10, ans + 1]), echo: `${t * 10} ＋ ${o} ＝ ${ans}`,
  };
}
function addTaba2() {
  const [p1, p2] = twoNames();
  const a = rnd(12, 45), b = rnd(11, Math.min(39, 89 - a)), ans = a + b;
  return {
    text: `${p1}は シールを ${a}まい もって いたよ。${p2}から ${b}まい もらったよ。シールは ぜんぶで なんまい？`,
    hint: { text: "たばは たば、ばらは ばらで たそう。ばらが 10を こえたら、たばを 1つ ふやすよ。", fig: <Row>{bundlesOf(a)}<Op>＋</Op>{bundlesOf(b)}</Row> },
    ...num(ans, [ans + 10, ans - 10, ans + 1, ans - 1, a - b]), echo: `${a} ＋ ${b} ＝ ${ans}`,
  };
}
function addNoise() {
  const [p1, p2] = twoNames(), a = rnd(3, 9), b = rnd(3, 9);
  let x = rnd(2, 9);
  while (x === a || x === b) x = rnd(2, 9);
  const ans = a + b;
  const v = pick([
    { text: `あかい 花が ${a}本、きいろい 花が ${b}本 さいて いるよ。ちょうちょが ${x}${hiki(x)} とんで きたよ。花は ぜんぶで なん本？`, what: "花", type: "flower" },
    { text: `${p1}は クッキーを ${a}まい やいたよ。${p2}は ${b}まい やいたよ。おさらは ${x}まい あるよ。クッキーは ぜんぶで なんまい？`, what: "クッキー", type: "cookie" },
    { text: `子どもが ${a}人 あそんで いたよ。あとから ${b}人 きたよ。ボールは ${x}こ あるよ。子どもは ぜんぶで なん人？`, what: "子ども", type: "star" },
  ]);
  return {
    text: v.text,
    hint: { text: `きかれて いるのは ${v.what}の かず。${x}は つかわないよ。`, fig: <TwoGroups a={a} b={b} type={v.type} /> },
    ...num(ans, [a + b + x, a + x, b + x, ans + 1]), echo: `${a} ＋ ${b} ＝ ${ans}(${x}は つかわない)`,
  };
}

/* 2. ひきざん */
function subNokori() {
  const t = pick(THINGS), a = rnd(11, 18), b = rnd(3, Math.min(9, a - 2)), ans = a - b;
  return {
    text: `${t.name}が ${a}${t.c} あったよ。${b}${t.c} ${t.eat}よ。のこりは なん${t.c}？`,
    hint: { text: `「のこりは」は ひきざんの あいず。${t.eat} ぶんに ✕を つけて、のこりを かぞえよう。`, fig: <CrossOut a={a} b={b} type={t.type} /> },
    ...num(ans, [a + b, ans + 1, ans - 1, ans + 2, b]), echo: `${a} － ${b} ＝ ${ans}`,
  };
}
function subChigai() {
  const t = pick(THINGS), [p1, p2] = twoNames(), a = rnd(9, 16), b = rnd(3, a - 2), ans = a - b;
  const ask = pick([`ちがいは なん${t.c}？`, `${p1}の ほうが なん${t.c} おおい？`, `${p2}は ${p1}より なん${t.c} すくない？`]);
  return {
    text: `${p1}は ${t.name}を ${a}${t.c}、${p2}は ${b}${t.c} もって いるよ。${ask}`,
    hint: { text: "ならべて くらべよう。おおい ぶんが「ちがい」だよ。おおきい かずから ちいさい かずを ひこう。", fig: <CompareRows a={a} b={b} type={t.type} nameA={p1} nameB={p2} /> },
    ...num(ans, [a + b, ans + 1, ans - 1, b, ans + 2]), echo: `${a} － ${b} ＝ ${ans}`,
  };
}
function subReverse() {
  const t = pick(THINGS), a = rnd(10, 18), r = rnd(2, a - 3), ans = a - r;
  return {
    text: `${t.name}が ${a}${t.c} あったよ。なん${t.c}か ${t.eat}ら、のこりが ${r}${t.c}に なったよ。なん${t.c} ${t.eat}の？`,
    hint: { text: `はじめの ${a}${t.c}から、のこりの ${r}${t.c}を ひくと、${t.eat} かずが わかるよ。`, fig: <Box label={`ひかって いるのが のこりの ${r}${t.c}`}><Items n={a} type={t.type} size={18} mark={(i) => (i < r ? "keep" : "dim")} /></Box> },
    ...num(ans, [a + r, r, a, ans + 1, ans - 1]), echo: `${a} － ${r} ＝ ${ans}(たしかめ:${r} ＋ ${ans} ＝ ${a})`,
  };
}
function subBig() {
  const a = rnd(25, 58), b = rnd(11, a - 9), ans = a - b;
  return {
    text: `本が ${a}さつ あったよ。子どもたちが ${b}さつ かりて いったよ。のこりは なんさつ？`,
    hint: { text: "たばは たば、ばらは ばらで ひこう。ばらが たりない ときは、たばを 1つ くずして ばらに するよ。", fig: bundlesOf(a) },
    ...num(ans, [ans + 10, ans - 10, a + b, ans + 1, ans - 1]), echo: `${a} － ${b} ＝ ${ans}`,
  };
}

/* 3. かけざん */
function mulZutsu() {
  const g = rnd(2, 9), k = rnd(2, 9), ans = k * g;
  const v = pick([
    { text: `おさらが ${g}まい あるよ。1まいの おさらに クッキーが ${k}まいずつ。クッキーは ぜんぶで なんまい？`, type: "cookie", lab: () => "" },
    { text: `はこが ${g}こ あるよ。1つの はこに あめが ${k}こずつ はいって いるよ。あめは ぜんぶで なんこ？`, type: "candy", lab: () => "" },
    { text: `花を ${g}つの かびんに ${k}本ずつ いれるよ。花は ぜんぶで なん本 いる？`, type: "flower", lab: () => "" },
    { text: `子どもが ${g}人 いるよ。1人に ほしの シールを ${k}まいずつ くばると、ぜんぶで なんまい いる？`, type: "star", lab: (i) => `${i + 1}人め` },
  ]);
  return {
    text: v.text,
    hint: { text: `「${k}ずつ」が ${g}つぶん。${k} × ${g} を ${k}の だんで かんがえよう。`, fig: ans <= 36 ? <Plates g={g} k={k} type={v.type} label={v.lab} /> : <KukuRow k={k} target={ans} /> },
    ...num(ans, [k + g, k * (g + 1), k * (g - 1), (k + 1) * g, ans + 1]), echo: `${k} × ${g} ＝ ${ans}`,
  };
}
function mulBai() {
  const k = rnd(2, 9), g = rnd(2, 5), ans = k * g;
  const v = pick([
    { text: `あかい リボンは ${k}本。あおい リボンは あかの ${g}ばい あるよ。あおい リボンは なん本？`, unit: "本" },
    { text: `あかい テープの ながさは ${k}センチ。あおい テープは その ${g}ばいの ながさ。あおい テープは なんセンチ？`, unit: "センチ" },
  ]);
  return {
    text: v.text,
    hint: { text: `「${g}ばい」は ${k}${v.unit}を ${g}つぶん ならべる こと。`, fig: <BaiBars k={k} g={g} unit={v.unit} /> },
    ...num(ans, [k + g, ans + k, ans - k, k * (g + 1), ans + 1]), echo: `${k} × ${g} ＝ ${ans}`,
  };
}
function mulHidden(not) {
  const a = pick(ANIMALS.filter((x) => x.name !== not));
  const g = rnd(2, 9), ans = a.per * g;
  return {
    animal: a.name,
    text: `${a.name}が ${g}${a.cnt(g)} ${a.live ? "いる" : "ある"}よ。${a.part}は ぜんぶで なん${a.pc}？`,
    hint: { text: `${a.name}の ${a.part}は 1${a.cnt(1)}に ${a.per}${a.pc}。もんだいに かいて いない かずも つかうよ。`, fig: <Box label={`1${a.cnt(1)}に ${a.part} ${a.per}${a.pc}`}><EmojiRow n={g} e={a.e} /></Box> },
    ...num(ans, [g + a.per, g, a.per * (g + 1), ans - a.per, g * (a.per === 2 ? 4 : 2), ans + 1]), echo: `${a.per} × ${g} ＝ ${ans}`,
  };
}

/* 4. わりざん */
function divShare() {
  const t = pick(THINGS.slice(0, 3)), g = rnd(2, 5), q = rnd(2, 8), tot = g * q;
  return {
    text: `${t.name}が ${tot}${t.c} あるよ。${g}人で おなじ かずずつ わけると、1人 なん${t.c}？`,
    hint: { text: `「1こずつ くばる」で わけて みよう。${g} × いくつ で ${tot}に なるかな？`, fig: <DealBoard total={tot} groups={g} type={t.type} unit={t.c} /> },
    ...num(q, [q + 1, q - 1, tot - g, g, q + 2]), echo: `${tot} ÷ ${g} ＝ ${q}`,
  };
}
function divGroup() {
  const t = pick(THINGS.slice(0, 3)), k = rnd(2, 6), q = rnd(2, 8), tot = k * q;
  return {
    text: `${t.name}が ${tot}${t.c} あるよ。1人に ${k}${t.c}ずつ くばると、なん人に くばれる？`,
    hint: { text: `${k}${t.c}ずつ くばって みよう。${k} × いくつ で ${tot}に なるかな？`, fig: <DealBoard total={tot} size={k} type={t.type} unit={t.c} /> },
    ...num(q, [q + 1, q - 1, tot - k, k, q + 2]), echo: `${tot} ÷ ${k} ＝ ${q}`,
  };
}
function divKuku() {
  const k = rnd(3, 9), q = rnd(2, 9), tot = k * q;
  const v = pick([
    { text: `花が ${tot}本 あるよ。${k}本ずつ たばに すると、たばは いくつ できる？`, unit: "" },
    { text: `子どもが ${tot}人 いるよ。${k}つの チームに おなじ かずずつ わかれると、1つの チームは なん人？`, unit: "" },
  ]);
  return {
    text: v.text,
    hint: { text: `${k}の だんで ${tot}に なるのを さがそう。「${k} × いくつ ＝ ${tot}」の いくつが こたえだよ。`, fig: <KukuRow k={k} target={tot} /> },
    ...num(q, [q + 1, q - 1, tot - k, k, tot + k]), echo: `${tot} ÷ ${k} ＝ ${q}(${k} × ${q} ＝ ${tot})`,
  };
}

/* 5. ぶんすう */
function fracShape() {
  const d = pick([2, 3, 4, 4, 6, 8]), n = rnd(1, d - 1);
  const circle = Math.random() < 0.5;
  return {
    text: "いろを ぬった ところは、ぜんたいの どれだけ？",
    fig: circle ? <FracCircle d={d} n={n} /> : <FracBar parts={d} colored={range(n)} />,
    hint: { text: `おなじ おおきさに いくつに わけて いるかな? したの かずが わけた かず、うえの かずが いろの ついた かずだよ。` },
    ...fracOptions({ n, d }, [{ n: d - n, d }, { n: 1, d }, { n, d: d + 1 }, { n: n + 1, d }, { n, d: d - 1 }, { n, d: d + 2 }, { n: 1, d: n + 1 }]),
    echo: <>おなじ おおきさに {d}つに わけた {n}つぶんで <Frac n={n} d={d} /></>,
  };
}
function fracEqual() {
  const d = pick([2, 3, 4]);
  const unequal = () => {
    for (;;) {
      const ws = range(d).map(() => rnd(1, 5));
      const sum = ws.reduce((s, v) => s + v, 0);
      const parts = ws.map((w) => w / sum);
      if (Math.abs(parts[0] - 1 / d) >= 0.12 && new Set(ws).size > 1) return parts;
    }
  };
  const bar = (parts) => <FracBar parts={parts} width={120} height={26} />;
  const opts = shuffle([
    { id: "ok", view: bar(d) },
    { id: "more", view: bar(d + 1) },
    { id: "u1", view: bar(unequal()) },
    { id: "u2", view: bar(unequal()) },
  ]);
  return {
    text: <>いろを ぬった ところが <Frac n={1} d={d} /> に なって いるのは どれ？</>,
    hint: { text: `おなじ おおきさに ${d}つに わけて、その 1つに いろを ぬって いるのを さがそう。おおきさが ちがう わけかたは、ぶんすうに ならないよ。` },
    ans: "ok", options: opts, optClass: "sm-opt-pic",
    echo: <>おなじ おおきさに {d}つに わけた 1つぶんが <Frac n={1} d={d} /></>,
  };
}
function fracOfN() {
  const t = pick(THINGS), d = pick([2, 2, 3, 4]), q = rnd(2, d === 2 ? 6 : 4), m = d * q;
  return {
    text: <>{t.name}が {m}{t.c} あるよ。その <Frac n={1} d={d} /> は なん{t.c}？</>,
    hint: { text: `${m}${t.c}を ${d}つに おなじ かずずつ わけた 1つぶんだよ。`, fig: <ItemSplit m={m} d={d} type={t.type} /> },
    ...num(q, [m - q, q + 1, q - 1, m, d, q * 2]),
    echo: <>{m}{t.c}を {d}つに わけた 1つぶんで {q}{t.c}</>,
  };
}
function fracCompare() {
  const others = shuffle([3, 4, 5, 6, 8]).slice(0, 3);
  const dens = [2, ...others];
  const big = Math.random() < 0.6;
  const ansD = big ? 2 : Math.max(...others);
  return {
    text: big ? "いちばん おおきい ぶんすうは どれ？" : "いちばん ちいさい ぶんすうは どれ？",
    hint: { text: "おなじ ながさの テープで くらべよう。わける かずが おおいほど、1つぶんは ちいさく なるよ。", fig: <FracLadder dens={[...dens].sort((a, b) => a - b)} /> },
    ans: `1/${ansD}`, optClass: "sm-opt-frac",
    options: shuffle(dens).map((d) => ({ id: `1/${d}`, view: <Frac n={1} d={d} /> })),
    echo: big ? <><Frac n={1} d={2} /> が いちばん おおきい</> : <><Frac n={1} d={ansD} /> が いちばん ちいさい</>,
  };
}

// 5もん。かならず 入れたい しゅるいを さきに ならべてから まぜる
function makeSet(gens) {
  const out = [];
  const texts = new Set();
  for (const gen of gens) {
    let p;
    for (let i = 0; i < 12; i++) {
      p = gen(out);
      const key = typeof p.text === "string" ? p.text : JSON.stringify(p.ans) + i;
      if (!texts.has(key)) { texts.add(key); break; }
    }
    out.push(p);
  }
  return shuffle(out);
}

/* ----------------------------- しょう ------------------------------------ */
const L = (who, text) => ({ who, text });

const CHAPTERS = [
  {
    id: "add", icon: "➕", title: "たしざん", sub: "あわせて・ぜんぶで・ふえると", color: "#FFC9A0",
    make: () => makeSet([addNoise, addTaba, pick([addAwasete, addFueru]), pick([addFueru, addAwasete]), pick([addTaba2, addAwasete, addFueru])]),
    pages: [
      { lines: [L("marin", "ねえ ルナ。どんな ときに たしざんを つかうの？"), L("luna", "おはなしの なかの「あいずの ことば」を さがすと わかるよ。たしざんの あいずは、この 3つ！")],
        fig: <KeyWords words={["あわせて", "ぜんぶで", "ふえると"]} /> },
      { lines: [L("luna", "ルナは あめを 3こ、マリンは 4こ もって いるよ。"), L("marin", "ふたりの あめを あわせると… 3 ＋ 4 ＝ 7。7こ だね！")],
        fig: <TwoGroups a={3} b={4} type="candy" /> },
      { lines: [L("marin", "花が 5本 さいて いたよ。あとから 3本 さいたら？"), L("luna", "ふえると、ぜんぶで 5 ＋ 3 ＝ 8本。ふえる ときも たしざんだよ。")],
        fig: <Box label="ひかって いるのが ふえた 3本"><Items n={8} type="flower" size={20} mark={(i) => (i >= 5 ? "new" : null)} /></Box> },
      { lines: [L("luna", "かずが おおきい ときは、10本ずつ たばに すると かぞえやすいよ。"), L("marin", "10の たばが 2つと、ばらが 3本で 23本！")],
        fig: <Bundles tens={2} ones={3} /> },
      { lines: [L("luna", "ばらが 10本 あつまったら、あたらしい たばが 1つ できるよ。"), L("marin", "8本と 5本で ばらが 13本。10本を たばに すると、たば 1つと ばら 3本。8 ＋ 5 ＝ 13 だね。")],
        fig: <Row><Bundles ones={8} label={false} /><Op>＋</Op><Bundles ones={5} label={false} /><Op>→</Op><Bundles tens={1} ones={3} /></Row> },
      { lines: [L("luna", "23 ＋ 14 は、たばは たば、ばらは ばらで たすよ。"), L("marin", "たばが 2つと 1つで 3つ。ばらが 3本と 4本で 7本。だから 37本！")],
        fig: <Row><Bundles tens={2} ones={3} /><Op>＋</Op><Bundles tens={1} ones={4} /></Row> },
      { lines: [L("marin", "もんだいに、つかわない かずが まざって いる ことも あるの？"), L("luna", "あるよ。「あかい 花が 4本、しろい 花が 3本。ちょうちょが 2ひき。花は ぜんぶで なん本？」"), L("luna", "きかれて いるのは 花だけ。ちょうちょの 2は つかわないから、4 ＋ 3 ＝ 7本。")],
        fig: <Row><Box><Items n={7} type="flower" size={18} /></Box><Box tone="off" label="つかわない"><EmojiRow n={2} e="🦋" /></Box></Row> },
      { lines: [L("marin", "さいごまで よんで、なにを きかれて いるか たしかめるんだね。"), L("luna", "そのとおり！ じゃあ もんだいに ちょうせんしよう！")] },
    ],
  },
  {
    id: "sub", icon: "➖", title: "ひきざん", sub: "のこりと ちがい", color: "#9CC4FF",
    make: () => makeSet([subReverse, subChigai, subNokori, pick([subNokori, subReverse, subBig]), pick([subChigai, subNokori, subBig])]),
    pages: [
      { lines: [L("marin", "ひきざんの あいずは なあに？"), L("luna", "「のこりは」と「ちがいは」だよ。「なんこ おおい」「なんこ すくない」も、ちがいの なかま。")],
        fig: <KeyWords words={["のこりは", "ちがいは", "なんこ おおい", "なんこ すくない"]} /> },
      { lines: [L("luna", "クッキーが 7まい あったよ。2まい たべたら、のこりは なんまい？"), L("marin", "たべた ぶんに ✕を つけて… のこりは 5まい！ 7 － 2 ＝ 5。")],
        fig: <CrossOut a={7} b={2} type="cookie" /> },
      { lines: [L("luna", "ルナの ほしは 8こ、マリンの ほしは 5こ。ちがいは なんこ？"), L("marin", "ならべて くらべると、ルナの ほうが 3こ おおいね。8 － 5 ＝ 3。")],
        fig: <CompareRows a={8} b={5} type="star" nameA="ルナ" nameB="マリン" /> },
      { lines: [L("luna", "ちがいを だす ときは、おおきい かずから ちいさい かずを ひくよ。"), L("marin", "「マリンは ルナより なんこ すくない？」も、8 － 5 ＝ 3 だね。")] },
      { lines: [L("marin", "あめが 9こ あって、なんこか たべたら、のこりが 4こに なったよ。なんこ たべたの？"), L("luna", "はじめの 9こから、のこりの 4こを ひけば わかるよ。9 － 4 ＝ 5。5こ たべたんだね。")],
        fig: <Box label="ひかって いるのが のこりの 4こ"><Items n={9} type="candy" size={20} mark={(i) => (i < 4 ? "keep" : "dim")} /></Box> },
      { lines: [L("marin", "たしかめて みるね。のこりの 4こと たべた 5こで、4 ＋ 5 ＝ 9。ぴったり！"), L("luna", "ぎゃくに かんがえる もんだいも、えを かくと わかりやすいよ。")],
        fig: <TwoGroups a={4} b={5} type="candy" /> },
      { lines: [L("luna", "13 － 5 みたいに、ばらから ひけない ときは、10の たばから ひくよ。"), L("marin", "10 － 5 ＝ 5。のこりの ばら 3本と あわせて 8本！")],
        fig: <Bundles tens={1} ones={3} /> },
      { lines: [L("marin", "よし、もんだいに ちょうせん！"), L("luna", "がんばろうね！")] },
    ],
  },
  {
    id: "mul", icon: "✖️", title: "かけざん", sub: "〜ずつ・〜ばい", color: "#C9A8F0",
    make: () => makeSet([(o) => mulHidden(), mulBai, mulZutsu, (o) => mulHidden(o.find((p) => p.animal)?.animal), pick([mulZutsu, mulBai])]),
    pages: [
      { lines: [L("marin", "おなじ かずずつ ある ときは どうするの？"), L("luna", "かけざんの でばん！「〜ずつ」と「〜ばい」が あいずだよ。")],
        fig: <KeyWords words={["〜ずつ", "〜ばい"]} /> },
      { lines: [L("luna", "おさらが 3まい。1まいの おさらに クッキーが 4まいずつ。"), L("marin", "4まいずつが 3さら ぶん。4 × 3 ＝ 12まい！")],
        fig: <Plates g={3} k={4} type="cookie" /> },
      { lines: [L("luna", "かけざんは「1つぶんの かず × いくつぶん」の じゅんに かくよ。"), L("marin", "1さらに 4まいで、3さら ぶんだから 4 × 3 だね。")] },
      { lines: [L("luna", "「3ばい」は、おなじ ながさを 3つぶん ならべる ことだよ。"), L("marin", "あかい リボンが 2本。あおい リボンは その 3ばい。2 × 3 ＝ 6本！")],
        fig: <BaiBars k={2} g={3} /> },
      { lines: [L("marin", "「ねこが 3びき。あしは ぜんぶで なん本？」 あれ？ 4が どこにも かいて ないよ。"), L("luna", "ねこの あしは 1ぴきに 4本。かいて いない かずも、しって いる ことを つかうんだよ。4 × 3 ＝ 12本。")],
        fig: <Box label="1ぴきに あし 4本"><EmojiRow n={3} e="🐱" /></Box> },
      { lines: [L("luna", "ほかにも、おぼえて おくと べんりな かずが あるよ。"), L("marin", "とりの あしは 2本、たこの あしは 8本、くるまの タイヤは 4つ…！")],
        fig: <LegTable /> },
      { lines: [L("luna", "わからない ときは、くくを となえよう。4の だんは 4・8・12…"), L("marin", "よーし、ちょうせん！")],
        fig: <KukuRow k={4} target={12} /> },
    ],
  },
  {
    id: "div", icon: "➗", title: "わりざん", sub: "おなじ かずずつ わける", color: "#9FE6D6",
    make: () => makeSet([divShare, divGroup, divKuku, pick([divShare, divGroup]), pick([divGroup, divKuku, divShare])]),
    pages: [
      { lines: [L("marin", "クッキーを みんなで おなじ かずずつ わけたいな。"), L("luna", "それが わりざんだよ。やって みよう！")] },
      { lines: [L("luna", "クッキー 12まいを、3まいの おさらに おなじ かずずつ くばるよ。「1こずつ くばる」を おしてね。")],
        fig: <DealBoard total={12} groups={3} type="cookie" unit="まい" doneText="マリン:1さらに 4まいずつに なったね！" /> },
      { lines: [L("luna", "いまの ことを しきで かくと 12 ÷ 3 ＝ 4。「÷」は「わる」と よむよ。"), L("marin", "12まいを 3人で わけたら、1人 4まい ってことだね。")],
        fig: <Plates g={3} k={4} type="cookie" label={(i) => `${i + 1}人め`} /> },
      { lines: [L("marin", "こんどは あめが 12こ。1人に 3こずつ くばると、なん人に くばれる？"), L("luna", "「3こずつ くばる」を おして みて。")],
        fig: <DealBoard total={12} size={3} type="candy" unit="こ" doneText="ルナ:4人に くばれたね！ これも 12 ÷ 3 ＝ 4。" /> },
      { lines: [L("luna", "わりざんの こたえは、くくで みつかるよ。12 ÷ 3 なら「3 × いくつ が 12？」と かんがえるの。"), L("marin", "3の だんで 3・6・9・12… 3 × 4 ＝ 12 だから 4！")],
        fig: <KukuRow k={3} target={12} /> },
      { lines: [L("marin", "「おなじ かずずつ わけると 1人 いくつ？」も「〜こずつ くばると なん人？」も、どっちも わりざん なんだね。"), L("luna", "そのとおり！ ちょうせんしよう！")] },
    ],
  },
  {
    id: "frac", icon: "🍰", title: "ぶんすう", sub: "はんぶんこから はじめよう", color: "#FFC2DA",
    make: () => makeSet([fracShape, fracOfN, fracCompare, fracEqual, pick([fracShape, fracOfN, fracCompare])]),
    pages: [
      { lines: [L("marin", "ケーキを ルナと はんぶんこ しよう！"), L("luna", <>まんなかで、おなじ おおきさに 2つに わけるね。その 1つぶんを「2ぶんの1」と いって、<Frac n={1} d={2} /> と かくよ。</>)],
        fig: <Row><FracCircle d={2} /><Frac n={1} d={2} size={34} /></Row> },
      { lines: [L("marin", "おなじ おおきさに 3つに わけたら？"), L("luna", <>1つぶんは「3ぶんの1」。<Frac n={1} d={3} /> だよ。</>)],
        fig: <Row><FracBar parts={3} width={180} /><Frac n={1} d={3} size={34} /></Row> },
      { lines: [L("luna", <>4つに わけた うちの 3つぶんは「4ぶんの3」。<Frac n={3} d={4} /> と かくよ。</>), L("luna", "したの かずが わけた かず、うえの かずが いくつぶん かを あらわすんだ。")],
        fig: <Row><FracBar parts={4} colored={[0, 1, 2]} width={180} /><Frac n={3} d={4} size={34} /></Row> },
      { lines: [L("marin", "じゃあ、おおきいのと ちいさいのに 2つに わけたら、それも 2ぶんの1？"), L("luna", "ううん、ちがうよ。おおきさが ちがう わけかたは、ぶんすうに ならないの。おなじ おおきさに わけるのが やくそくだよ。")],
        fig: <div className="sm-col"><div className="sm-judge"><FracBar parts={2} width={170} height={28} /><b className="sm-good">⭕</b></div><div className="sm-judge"><FracBar parts={[0.7, 0.3]} width={170} height={28} /><b className="sm-bad">✕</b></div></div> },
      { lines: [L("luna", <>クッキー 6まいの <Frac n={1} d={2} /> は、2つに おなじ かずずつ わけた 1つぶんだよ。</>), L("marin", <>3まいずつに なるから、6まいの <Frac n={1} d={2} /> は 3まい！</>)],
        fig: <ItemSplit m={6} d={2} type="cookie" /> },
      { lines: [L("marin", <><Frac n={1} d={2} /> と <Frac n={1} d={4} />、どっちが おおきい？</>), L("luna", "おなじ ながさの テープで くらべて みよう。わける かずが おおいほど、1つぶんは ちいさく なるんだ。")],
        fig: <FracLadder dens={[2, 3, 4]} /> },
      { lines: [L("marin", <>だから <Frac n={1} d={2} /> の ほうが おおきいんだね！</>), L("luna", "ぴったり！ もんだいに ちょうせんしよう。")] },
    ],
  },
];

/* ----------------------------- 画面 -------------------------------------- */
function Talk({ who, text, Witch, Mermaid }) {
  const luna = who === "luna";
  return (
    <div className={"sm-talk " + (luna ? "sm-talk-l" : "sm-talk-r")}>
      <div className="sm-avatar">{luna ? <Witch mood="happy" size={54} /> : <Mermaid mood="happy" size={50} />}<span>{luna ? "ルナ" : "マリン"}</span></div>
      <div className="sm-bubble">{text}</div>
    </div>
  );
}

export default function StoryMode({ Witch, Mermaid, Princess, MiniItem, progress = {}, pulls = 0, sfx = {}, onReward, onAdvance }) {
  const [chId, setChId] = useState(null);
  const [stage, setStage] = useState("list");   // list | lesson | quiz | result
  const [page, setPage] = useState(0);
  const [probs, setProbs] = useState([]);
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState("ask");    // ask | right | wrong
  const [wrongPicks, setWrongPicks] = useState([]);
  const [hint, setHint] = useState(false);
  const [missed, setMissed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [earned, setEarned] = useState(0);
  const [result, setResult] = useState(null);
  const tap = () => sfx.tap && sfx.tap();
  const ch = CHAPTERS.find((c) => c.id === chId);
  const chNo = ch ? CHAPTERS.indexOf(ch) + 1 : 0;

  const openChapter = (id) => { tap(); setChId(id); setPage(0); setStage("lesson"); };
  const resetQuestion = () => { setPhase("ask"); setWrongPicks([]); setHint(false); setMissed(false); };
  const startQuiz = (c = ch) => {
    tap();
    setProbs(c.make()); setQi(0); setFirstTry(0); setHintUsed(false); setEarned(0); setResult(null);
    resetQuestion(); setStage("quiz");
  };
  const showHint = () => { tap(); setHint(true); setHintUsed(true); };
  const answer = (opt) => {
    if (phase !== "ask" || wrongPicks.includes(opt.id)) return;
    if (opt.id === probs[qi].ans) {
      sfx.correct && sfx.correct();
      setPhase("right");
      if (!missed) setFirstTry((n) => n + 1);
      setEarned((n) => n + 8);
      onReward && onReward(8);
    } else {
      sfx.wrong && sfx.wrong();
      setPhase("wrong"); setWrongPicks((w) => [...w, opt.id]); setMissed(true);
    }
  };
  // まちがえたら、もう いちどの ときに ヒントを じどうで 出す
  const retry = () => { tap(); setPhase("ask"); setHint(true); setHintUsed(true); };
  const next = () => {
    tap();
    if (qi < probs.length - 1) {
      if (onAdvance) onAdvance();             // ★が たまって いたら まほうの とびらを ひらく
      setQi(qi + 1); resetQuestion();
      return;
    }
    // さいごの もんだい → けっか。はじめての クリアは ★+15
    const prev = progress[ch.id] || {};
    const first = !prev.cleared;
    const patch = { [ch.id]: { cleared: true, clears: (prev.clears || 0) + 1, best: Math.max(prev.best || 0, firstTry), noHint: !!prev.noHint || !hintUsed } };
    onReward && onReward(first ? 15 : 0, patch);
    setResult({ first, firstTry, hintUsed, earned: earned + (first ? 15 : 0) });
    setStage("result");
  };

  let body;
  if (stage === "list" || !ch) {
    body = (
      <div className="sm-list">
        <div className="sm-cast"><Witch mood="happy" size={70} /><Princess mood="happy" size={70} /><Mermaid mood="happy" size={66} /></div>
        <h2 className="kk-h2 sm-title">📖 おはなしで わかる さんすう</h2>
        <p className="sm-lead">ルナと マリンの おはなしを よんで、もんだいに ちょうせんしよう！<br />せいかいで ★8、はじめて クリアで ★15 もらえるよ。</p>
        {CHAPTERS.map((c, i) => {
          const p = progress[c.id];
          return (
            <button key={c.id} className="sm-ch-card" style={{ borderColor: c.color }} onClick={() => openChapter(c.id)}>
              <span className="sm-ch-no" style={{ background: c.color }}>{i + 1}</span>
              <span className="sm-ch-icon">{c.icon}</span>
              <span className="sm-ch-text"><b>{c.title}</b><small>{c.sub}</small></span>
              {p && p.cleared && <span className="sm-ch-done">クリア{p.noHint ? " 🌟" : ""}<small>いっかいで {p.best}/5</small></span>}
            </button>
          );
        })}
      </div>
    );
  } else if (stage === "lesson") {
    const pg = ch.pages[page];
    const last = page === ch.pages.length - 1;
    body = (
      <div className="sm-lesson">
        <div className="sm-head"><span className="sm-head-no" style={{ background: ch.color }}>だい{chNo}しょう</span><b>{ch.title}</b><span className="sm-head-count">{page + 1} / {ch.pages.length}</span></div>
        <div className="sm-card" key={ch.id + page}>
          {pg.lines.map((l, i) => <Talk key={i} who={l.who} text={l.text} Witch={Witch} Mermaid={Mermaid} />)}
          {pg.fig && <div className="sm-fig">{pg.fig}</div>}
        </div>
        <div className="sm-nav">
          <button className="sm-nav-btn" disabled={page === 0} onClick={() => { tap(); setPage(page - 1); }}>‹ まえ</button>
          {last
            ? <button className="kk-big-btn sm-go" onClick={() => startQuiz()}>もんだいに ちょうせん！</button>
            : <button className="kk-big-btn sm-go" onClick={() => { tap(); setPage(page + 1); }}>つぎへ →</button>}
        </div>
        {!last && progress[ch.id] && progress[ch.id].cleared && <button className="kk-text-btn" onClick={() => startQuiz()}>せつめいを とばして もんだいへ</button>}
        <button className="kk-text-btn" onClick={() => { tap(); setStage("list"); }}>しょうを えらびなおす</button>
      </div>
    );
  } else if (stage === "quiz") {
    const p = probs[qi];
    body = (
      <div className="sm-quiz">
        <div className="sm-head"><span className="sm-head-no" style={{ background: ch.color }}>だい{chNo}しょう</span><b>{ch.title}</b>
          <span className="sm-dots">{probs.map((_, i) => <span key={i} className={"sm-dot" + (i < qi || (i === qi && phase === "right") ? " sm-dot-done" : i === qi ? " sm-dot-now" : "")} />)}</span>
        </div>
        <div className="kk-scene sm-q">
          <div className="sm-q-no">もんだい {qi + 1}</div>
          <div className="sm-q-text">{p.text}</div>
          {p.fig && <div className="sm-fig">{p.fig}</div>}
          {phase === "ask" && !hint && <button className="kk-hint-btn" onClick={showHint}>？ ヒントを みる</button>}
          {hint && phase !== "right" && (
            <div className="sm-hint" key={qi}>
              <Talk who="luna" text={p.hint.text} Witch={Witch} Mermaid={Mermaid} />
              {p.hint.fig && <div className="sm-fig">{p.hint.fig}</div>}
            </div>
          )}
        </div>
        {phase === "ask" && (
          <div className="kk-opts">
            {p.options.map((o) => {
              const bad = wrongPicks.includes(o.id);
              return <button key={o.id} className={"kk-opt " + (p.optClass || "") + (bad ? " sm-opt-wrong" : "")} disabled={bad} onClick={() => answer(o)}>{o.view}</button>;
            })}
          </div>
        )}
        {phase === "right" && (
          <div className="kk-feedback kk-fb-right">
            <div className="kk-fb-big">せいかい！✨</div>
            <div className="sm-echo">{p.echo}</div>
            <div className="kk-fb-msg">ほしの かけら ★8 ゲット！</div>
            <button className="kk-big-btn" onClick={next}>
              {qi < probs.length - 1 ? (pulls > 0 ? "✨ まほうの とびらが ひらく！" : "つぎの もんだいへ →") : "けっかを みる →"}
            </button>
          </div>
        )}
        {phase === "wrong" && (
          <div className="kk-feedback kk-fb-wrong">
            <div className="kk-fb-big kk-fb-oops-text">あれれ？ ちがうみたい</div>
            <div className="kk-fb-msg">ヒントを みて、もう いちど かんがえよう♪</div>
            <button className="kk-big-btn kk-retry-btn" onClick={retry}>もう いちど</button>
          </div>
        )}
      </div>
    );
  } else {
    const r = result || { firstTry: 0, hintUsed: true, earned: 0 };
    body = (
      <div className="sm-result">
        <div className="sm-cast"><Witch mood="happy" size={80} /><Princess mood="happy" size={92} /><Mermaid mood="happy" size={76} /></div>
        <h2 className="kk-h2">だい{chNo}しょう {ch.title} クリア！</h2>
        <div className="sm-res-card">
          <div className="sm-res-line">いっかいで せいかい:<b>{r.firstTry}</b> / 5もん</div>
          <div className="sm-res-line">あつめた ほしの かけら:<b>★{r.earned}</b></div>
          {r.first && <div className="sm-res-bonus">はじめての クリア ボーナス ★15！</div>}
          <div className="sm-res-comment">{r.hintUsed ? "つぎは ヒントなしで ちょうせん してみよう！" : "ヒントなしで すごい！🌟"}</div>
        </div>
        {pulls > 0 && <button className="kk-big-btn" onClick={() => { tap(); onAdvance && onAdvance(); }}>✨ まほうの とびらが ひらく！</button>}
        <button className="kk-big-btn kk-retry-btn" onClick={() => startQuiz()}>もう いちど ちょうせん</button>
        {chNo < CHAPTERS.length && <button className="kk-text-btn" onClick={() => openChapter(CHAPTERS[chNo].id)}>つぎの しょう「{CHAPTERS[chNo].title}」へ →</button>}
        <button className="kk-text-btn" onClick={() => { tap(); setStage("list"); }}>しょうを えらぶ</button>
      </div>
    );
  }

  return (
    <ItemCtx.Provider value={MiniItem}>
      <StoryStyle />
      <div className="sm-root">{body}</div>
    </ItemCtx.Provider>
  );
}

function StoryStyle() {
  return (
    <style>{`
.sm-root{display:flex; flex-direction:column; align-items:center; width:100%;}
.sm-list,.sm-lesson,.sm-quiz,.sm-result{display:flex; flex-direction:column; align-items:center; width:100%; text-align:center;}
.sm-cast{display:flex; align-items:flex-end; justify-content:center; gap:4px;}
.sm-title{font-size:21px; margin-bottom:6px;}
.sm-lead{font-family:'Zen Maru Gothic'; font-weight:700; font-size:13.5px; line-height:1.8; margin:0 8px 14px;}
.sm-ch-card{display:flex; align-items:center; gap:10px; width:100%; max-width:420px; background:#fff; border:3px solid var(--lav); border-radius:20px; padding:12px 14px; margin-bottom:10px; cursor:pointer; box-shadow:0 5px 0 rgba(201,168,240,.45); text-align:left; font-family:inherit; color:var(--plum);}
.sm-ch-card:active{transform:translateY(3px); box-shadow:0 2px 0 rgba(201,168,240,.45);}
.sm-ch-no{flex:none; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Mochiy Pop One'; color:var(--night); font-size:15px;}
.sm-ch-icon{font-size:24px;}
.sm-ch-text{flex:1; display:flex; flex-direction:column; gap:2px;}
.sm-ch-text b{font-family:'Mochiy Pop One'; font-size:16px; color:var(--night);}
.sm-ch-text small{font-family:'Yomogi'; font-size:12px;}
.sm-ch-done{display:flex; flex-direction:column; align-items:flex-end; font-family:'Mochiy Pop One'; font-size:12px; color:var(--rose-deep);}
.sm-ch-done small{font-family:'Yomogi'; color:var(--plum); font-size:10.5px;}
.sm-head{display:flex; align-items:center; gap:8px; width:100%; margin:0 0 10px; font-family:'Mochiy Pop One'; color:var(--night); font-size:17px;}
.sm-head-no{font-size:12px; padding:4px 10px; border-radius:999px;}
.sm-head-count{margin-left:auto; font-family:'Yomogi'; font-size:13px; color:var(--plum);}
.sm-dots{margin-left:auto; display:flex; gap:5px;}
.sm-dot{width:12px; height:12px; border-radius:50%; background:#fff; border:2px solid var(--lav);}
.sm-dot-now{border-color:var(--rose-deep);}
.sm-dot-done{background:var(--gold); border-color:#F2A93B;}
.sm-card{width:100%; background:#fff; border-radius:24px; padding:14px 12px; box-shadow:0 6px 0 rgba(201,168,240,.5); animation:kk-pop .3s ease;}
.sm-talk{display:flex; align-items:flex-start; gap:8px; margin:6px 0; text-align:left;}
.sm-talk-r{flex-direction:row-reverse;}
.sm-avatar{flex:none; width:62px; display:flex; flex-direction:column; align-items:center; font-family:'Mochiy Pop One'; font-size:11px; color:var(--night);}
.sm-bubble{position:relative; flex:1; background:#F6EEFD; border-radius:16px; padding:10px 12px; font-weight:700; font-size:15.5px; line-height:1.85; color:var(--plum); word-break:keep-all; overflow-wrap:anywhere;}
.sm-talk-r .sm-bubble{background:#E6F8F4;}
.sm-fig{display:flex; justify-content:center; width:100%; margin:10px 0 4px;}
.sm-row{display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:6px;}
.sm-col{display:flex; flex-direction:column; gap:8px; align-items:center;}
.sm-op{font-family:'Mochiy Pop One'; font-size:22px; color:var(--rose-deep);}
.sm-box{background:#FFF6FB; border:2px dashed var(--lav); border-radius:14px; padding:8px; max-width:100%;}
.sm-box-hit{background:#FFE7F1; border:2px solid var(--rose-deep);}
.sm-box-off{opacity:.55;}
.sm-box-label{font-family:'Yomogi'; font-size:12px; color:var(--plum); margin-top:4px; text-align:center;}
.sm-items{display:flex; flex-wrap:wrap; justify-content:center; gap:3px; max-width:260px;}
.sm-emoji .sm-item{font-size:24px; line-height:1;}
.sm-item{position:relative; display:inline-flex; border-radius:50%;}
.sm-item-new{background:rgba(255,201,77,.55); box-shadow:0 0 0 2px rgba(255,201,77,.55);}
.sm-item-keep{background:rgba(125,224,200,.55); box-shadow:0 0 0 2px rgba(125,224,200,.55);}
.sm-item-dim{opacity:.35;}
.sm-item-extra{background:rgba(255,143,196,.35); border-radius:6px;}
.sm-item-cross::after{content:"✕"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#E8405F; font-weight:900; font-size:17px;}
.sm-item-cross > *{opacity:.45;}
.sm-bundles{display:flex; flex-direction:column; align-items:center;}
.sm-cmp{display:flex; flex-direction:column; gap:4px; background:#FFF6FB; border-radius:14px; padding:8px;}
.sm-cmp-row{display:flex; align-items:center; gap:2px;}
.sm-cmp-name{width:44px; font-family:'Mochiy Pop One'; font-size:11px; text-align:right; margin-right:4px;}
.sm-cmp-cell{width:17px; height:17px; display:inline-flex; align-items:center; justify-content:center;}
.sm-plates{display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin:6px 0;}
.sm-plate{position:relative; min-width:64px; min-height:54px; background:#fff; border:3px solid #E7D6FA; border-radius:50%; padding:12px 8px 16px; display:flex; align-items:center; justify-content:center;}
.sm-plate .sm-items{max-width:76px;}
.sm-plate-who{position:absolute; bottom:-2px; left:0; right:0; font-family:'Yomogi'; font-size:10.5px;}
.sm-plate-ghost{color:var(--lav); font-family:'Mochiy Pop One'; font-size:20px; border-style:dashed;}
.sm-plate-pop{animation:kk-pop .25s ease;}
.sm-deal{display:flex; flex-direction:column; align-items:center; width:100%;}
.sm-deal-pile{background:#FFF6FB; border-radius:14px; padding:6px 10px; min-height:40px;}
.sm-deal-empty{font-family:'Mochiy Pop One'; font-size:13px; color:var(--rose-deep); padding:6px;}
.sm-deal-btn{font-family:'Mochiy Pop One'; font-size:17px; color:#fff; border:none; border-radius:999px; padding:12px 26px; margin-top:4px; cursor:pointer; background:linear-gradient(180deg,#7DE0C8,#3FB8AE); box-shadow:0 5px 0 #2E9C93;}
.sm-deal-btn:active{transform:translateY(3px); box-shadow:0 2px 0 #2E9C93;}
.sm-deal-done{font-family:'Mochiy Pop One'; font-size:14px; color:var(--rose-deep); margin:4px 0;}
.sm-bai{display:flex; flex-direction:column; gap:6px; align-items:flex-start;}
.sm-bai-line{display:flex; align-items:center; gap:6px;}
.sm-bai-name{width:32px; font-family:'Mochiy Pop One'; font-size:12px;}
.sm-bai-bar{display:flex;}
.sm-bai-seg{height:22px; border:2px solid var(--plum); border-left-width:1px; border-right-width:1px; display:inline-flex; align-items:center; justify-content:center; font-family:'Mochiy Pop One'; font-size:11px; color:var(--night);}
.sm-kuku{display:flex; flex-direction:column; align-items:center;}
.sm-kuku-nums{display:flex; flex-wrap:wrap; justify-content:center; gap:4px; max-width:300px;}
.sm-kuku-n{display:flex; flex-direction:column; align-items:center; min-width:30px; background:#fff; border:2px solid #E7D6FA; border-radius:10px; padding:2px 4px; font-family:'Mochiy Pop One'; font-size:15px; color:var(--night);}
.sm-kuku-n small{font-family:'Yomogi'; font-size:9.5px;}
.sm-kuku-hit{background:var(--gold); border-color:#F2A93B;}
.sm-keys{display:flex; flex-wrap:wrap; justify-content:center; gap:8px;}
.sm-key{font-family:'Mochiy Pop One'; font-size:16px; color:var(--night); background:#FFF3C9; border:2px solid var(--gold); border-radius:12px; padding:6px 12px;}
.sm-legs{display:grid; grid-template-columns:1fr 1fr; gap:6px; width:100%; max-width:330px;}
.sm-leg{display:flex; align-items:center; gap:4px; background:#FFF6FB; border-radius:10px; padding:4px 6px; font-weight:700; font-size:12px; text-align:left;}
.sm-leg b{margin-left:auto; font-family:'Mochiy Pop One'; font-size:11px; color:var(--rose-deep); white-space:nowrap;}
.sm-leg-e{font-size:20px;}
.sm-ladder{display:flex; flex-direction:column; gap:6px;}
.sm-ladder-row{display:flex; align-items:center; gap:8px;}
.sm-ladder-lab{width:28px; font-size:15px;}
.sm-judge{display:flex; align-items:center; gap:8px;}
.sm-good{color:#2E9C93; font-size:22px;} .sm-bad{color:#E8405F; font-size:26px;}
.sm-frac{display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; line-height:1; margin:0 .15em; font-family:'Mochiy Pop One';}
.sm-frac-bar{align-self:stretch; min-width:.9em; height:.09em; min-height:2px; background:currentColor; margin:.12em 0;}
.sm-nav{display:flex; align-items:center; justify-content:center; gap:10px; width:100%; margin-top:14px;}
.sm-nav-btn{font-family:'Zen Maru Gothic'; font-weight:700; font-size:15px; border:none; background:rgba(255,255,255,.85); color:var(--plum); padding:12px 14px; border-radius:14px; box-shadow:0 3px 0 rgba(124,92,152,.3); cursor:pointer;}
.sm-nav-btn:disabled{opacity:.35; cursor:default;}
.sm-go{font-size:18px; padding:14px 26px;}
.sm-q{margin-top:0;}
.sm-q-no{font-family:'Mochiy Pop One'; font-size:12px; color:var(--rose-deep); margin-bottom:4px;}
.sm-q-text{font-weight:700; font-size:17px; line-height:1.9; color:var(--plum); margin-bottom:10px; word-break:keep-all; overflow-wrap:anywhere;}
.sm-hint{width:100%; margin-top:8px; padding-top:8px; border-top:2px dashed var(--lav); animation:kk-pop .3s ease;}
.kk-opt.sm-opt-frac{font-size:30px; padding:12px 0;}
.kk-opt.sm-opt-pic{display:flex; align-items:center; justify-content:center; padding:14px 6px;}
.kk-opt.sm-opt-wrong{opacity:.35; border-color:#E0C8D4; box-shadow:none; transform:none; cursor:default;}
.sm-echo{font-family:'Mochiy Pop One'; font-size:19px; color:var(--night); margin:4px 0 8px; line-height:1.6;}
.sm-res-card{width:100%; background:#fff; border-radius:24px; padding:16px; margin-bottom:12px; box-shadow:0 6px 0 rgba(201,168,240,.5);}
.sm-res-line{font-weight:700; font-size:15px; margin:4px 0;}
.sm-res-line b{font-family:'Mochiy Pop One'; font-size:22px; color:var(--rose-deep); margin:0 4px;}
.sm-res-bonus{font-family:'Mochiy Pop One'; color:#F2A93B; font-size:15px; margin:6px 0;}
.sm-res-comment{font-family:'Mochiy Pop One'; font-size:17px; color:var(--night); margin-top:8px;}
`}</style>
  );
}

// テスト(tests/story.test.jsx)から もんだいの 生成を たしかめるため
export { CHAPTERS, fracOptions };
