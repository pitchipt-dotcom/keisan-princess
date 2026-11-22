/* =====================================================================
   3年生：図で うごかして わかる（もんだいの まえ）
   1画面で やる ことは 1つ。それぞれの「やってみよう」は、
     ① よむ（指示：1〜2文）→ ② うごかす（操作）→ ③ こたえる → ④ わかった こと（しき）
   の じゅんに 1つずつ 出す。まちがえても 止めない
   さいごの「やってみよう」が おわったら onFinish（＝もんだいへ）
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import "../fairy/fairy.css";
import { PourScene } from "../fairy/PourScene.jsx";
import { isExact, TYPES } from "../fairy/juice.js";
import { CookieDeal, FracShape, FracWall, Frac } from "./Figures.jsx";
import { fmtDec } from "./g3.js";

function Steps({ n, at }) {
  return <div className="g3-steps" aria-label={`やってみよう ${at + 1}/${n}`}>{Array.from({ length: n }, (_, i) => <i key={i} className={i < at ? "on" : i === at ? "now" : ""} />)}</div>;
}
/* ① よむ：指示だけの 画面。説明は 2行まで。長い ときは text を 配列に して 2まいに 分ける（「1/2」「2/2」） */
function ReadCard({ step, steps, title, text, onGo, sfx }) {
  const pages = Array.isArray(text) ? text : [text];
  const [pg, setPg] = useState(0);
  const lastPg = pg === pages.length - 1;
  return (
    <div className="g3-explore">
      <Steps n={steps} at={step} />
      <div className="g3-read">
        {pages.length > 1 && <span className="g3-page">{pg + 1}/{pages.length}</span>}
        {title && <b className="g3-read-title">{title}</b>}
        <p className="g3-read-text" key={pg}>{pages[pg]}</p>
      </div>
      <button className="kk-big-btn g3-next" onClick={() => { sfx.tap(); if (lastPg) onGo(); else setPg(pg + 1); }}>{lastPg ? "やってみる →" : "つぎへ →"}</button>
    </div>
  );
}
/* ②③：上に 1行の 指示、下に 操作 または こたえる */
function DoCard({ step, steps, line, children }) {
  return (
    <div className="g3-explore">
      <Steps n={steps} at={step} />
      <div className="g3-line">{line}</div>
      {children}
    </div>
  );
}
/* ④ わかった こと */
function ResultCard({ step, steps, eq, text, extra, last, onNext }) {
  return (
    <div className="g3-explore">
      <Steps n={steps} at={step} />
      <div className="g3-result">
        <div className="g3-eq">{eq}</div>
        {text && <p className="g3-result-text">{text}</p>}
        {extra}
      </div>
      <button className="kk-big-btn g3-next" onClick={onNext}>{last ? "もんだいに すすむ →" : "つぎへ →"}</button>
    </div>
  );
}

/* 数字で こたえる らん（すうじキーつき） */
function NumAnswer({ fields, sfx, onSubmit }) {
  const [val, setVal] = useState(() => Object.fromEntries(fields.map((f) => [f.k, ""])));
  const [act, setAct] = useState(fields[0].k);
  const press = (d) => {
    sfx.tap();
    setVal((v) => {
      const cur = v[act];
      const nx = d === "けす" ? cur.slice(0, -1) : cur.length >= 2 ? cur : cur === "0" ? d : cur + d;
      return { ...v, [act]: nx };
    });
  };
  const empty = fields.some((f) => val[f.k] === "");
  return (
    <div className="g3-numans">
      <div className="g3-numans-row">
        {fields.map((f) => (
          <span key={f.k} className="g3-numans-field">{f.pre}
            <button className={"g3-box" + (act === f.k ? " g3-box-on" : "") + (val[f.k] ? "" : " g3-box-empty")} onClick={() => { sfx.tap(); setAct(f.k); }} aria-label={(f.pre || "") + "の らん"}>{val[f.k] || "？"}</button>
            {f.post}</span>
        ))}
      </div>
      <div className="dm-keys g3-keys g3-numans-keys">
        {["7", "8", "9", "4", "5", "6", "1", "2", "3", "けす", "0", "こたえる"].map((k) => (
          <button key={k} className={"dm-key" + (k === "こたえる" ? " dm-key-ok" : k === "けす" ? " dm-key-del" : "")} disabled={k === "こたえる" && empty}
            onClick={() => {
              if (k === "こたえる") { onSubmit(Object.fromEntries(fields.map((f) => [f.k, Number(val[f.k])])), () => { setVal(Object.fromEntries(fields.map((f) => [f.k, ""]))); setAct(fields[0].k); }); return; }
              press(k);
            }}>{k}</button>
        ))}
      </div>
    </div>
  );
}

/* ================= わり算 =================
   ① よむ → ② クッキーを くばる（わかったら とちゅうで「こたえる」へ） → ③ 数字で こたえる → ④ しき
   くばって わかっても、くばらずに こたえても、つぎの ことばは おなじ */
const DIV_TASKS = [
  { mode: "share", total: 12, plates: 3, title: "いくつずつ？", read: "12この クッキーを、3まいの おさらに 同じ数ずつ くばるよ。",
    ask: "1さら 何こ？", fields: [{ k: "each", pre: "1さら", post: "こ" }] },
  { mode: "group", total: 12, per: 4, title: "いくつ分？", read: "12この クッキーを、1さらに 4こずつ のせるよ。",
    ask: "おさらは 何まい？", fields: [{ k: "groups", pre: "", post: "まい" }] },
  { mode: "share", total: 14, plates: 4, title: "あまりが でると？", read: "14この クッキーを、4まいの おさらに 同じ数ずつ くばるよ。",
    ask: "1さら 何こで、何こ あまる？", fields: [{ k: "each", pre: "1さら", post: "こ" }, { k: "rest", pre: "あまり", post: "こ" }] },
];
const divAnswer = (t) => (t.mode === "group" ? { groups: Math.floor(t.total / t.per), rest: t.total % t.per } : { each: Math.floor(t.total / t.plates), rest: t.total % t.plates });

export function DivExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("read");          // read | do | answer | result
  const [msg, setMsg] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const t = DIV_TASKS[step], last = step === DIV_TASKS.length - 1, n = DIV_TASKS.length;
  const want = divAnswer(t);
  const submit = (v, clear) => {
    if (t.fields.every((f) => v[f.k] === want[f.k])) { sfx.correct(); setMsg(null); setPhase("result"); return; }
    sfx.wrong(); clear(); setMsg("おしい！ クッキーを くばって たしかめよう");
  };
  const next = () => { sfx.tap(); if (last) { onFinish(); return; } setStep(step + 1); setPhase("read"); setMsg(null); };

  if (phase === "read") return <ReadCard step={step} steps={n} title={t.title} text={t.read} sfx={sfx} onGo={() => setPhase("do")} />;
  if (phase === "do") {
    return (
      <DoCard step={step} steps={n} line={t.mode === "group" ? "びんから 4こずつ のせよう" : "おさらに くばろう"}>
        <CookieDeal key={"c" + step} total={t.total} plates={t.plates} per={t.per} mode={t.mode} sfx={sfx}
          onDone={() => { timer.current = setTimeout(() => setPhase("answer"), 900); }} />
        <button className="g3-sub-btn" onClick={() => { sfx.tap(); clearTimeout(timer.current); setPhase("answer"); }}>わかったら こたえる →</button>
      </DoCard>
    );
  }
  if (phase === "answer") {
    return (
      <DoCard step={step} steps={n} line={t.ask}>
        <NumAnswer key={step} fields={t.fields} sfx={sfx} onSubmit={submit} />
        {msg && <div className="g3-fig-msg g3-fig-msg-ng">{msg}</div>}
        {msg && <button className="g3-sub-btn" onClick={() => { sfx.tap(); setMsg(null); setPhase("do"); }}>クッキーを くばってみる</button>}
      </DoCard>
    );
  }
  const r = want;
  const eq = t.mode === "group" ? <>{t.total} ÷ {t.per} ＝ <b>{r.groups}</b></> : r.rest ? <>{t.total} ÷ {t.plates} ＝ <b>{r.each}</b> あまり <b>{r.rest}</b></> : <>{t.total} ÷ {t.plates} ＝ <b>{r.each}</b></>;
  const text = t.mode === "group" ? `4こずつで ${r.groups}さら分。これも わり算だよ。`
    : r.rest ? `くばれない ${r.rest}こが「あまり」。あまりは わる数より 小さいよ。` : `1さら ${r.each}こずつ。${t.plates} × ${r.each} ＝ ${t.total} で たしかめられるよ。`;
  return <ResultCard step={step} steps={n} eq={eq} text={text} last={last} onNext={next} />;
}

/* ================= 小数（ジュースの泉の そそぐ 操作） =================
   ① よむ → ② そそぐ（さいしょは お手本の 手が うごく）→ ③ 何L？（3つから。0.3L を つくる ときは なし）→ ④ しき */
const V = (id, type, amount, x, label) => ({ id, type, amount, x, label });
const DEC_TASKS = [
  { read: [<>1Lを 10に 分けた 1つ分が <b>0.1L</b>。</>, <>0.1Lますで くんで、<b>0.3L</b>を つくろう。</>], line: "右の ますを 0.3Lに しよう", into: "t", target: 300, demo: { id: "s", to: "c" },
    vessels: () => [V("s", "Ld", 1000, 58), V("c", "dld", 0, 172), V("t", "Ld", 0, 290)], pours: { s: ["c"], c: ["t", "s"], t: ["c"] },
    eq: <>0.1L が 3こで <b>0.3L</b></>, text: "0.1が 10こで 1L だよ。" },
  { read: "あ（0.4L）と い（0.3L）を、まん中の ますに ぜんぶ 入れよう。", line: "あ と い を まん中へ", into: "t", all: ["a", "b"], demo: { id: "a", to: "t" },
    vessels: () => [V("a", "Ld", 400, 56, "あ"), V("t", "Ld", 0, 180), V("b", "Ld", 300, 304, "い")], pours: { a: ["t"], b: ["t"] },
    ask: "あわせて 何L？", choices: ["0.6L", "0.7L", "0.8L"], ans: "0.7L",
    eq: <>0.4 ＋ 0.3 ＝ <b>0.7</b></>, text: "0.1が 4こと 3こで 7こ。だから 0.7L。" },
  { read: "0.8Lの ジュースから、右の ますへ 0.3L うつそう。", line: "右の ますを 0.3Lに しよう", into: "t", target: 300, demo: { id: "s", to: "t" },
    vessels: () => [V("s", "Ld", 800, 100), V("t", "Ld", 0, 262)], pours: { s: ["t"], t: ["s"] },
    ask: "のこりは 何L？", choices: ["0.4L", "0.5L", "0.6L"], ans: "0.5L",
    eq: <>0.8 − 0.3 ＝ <b>0.5</b></>, text: "0.1が 8こから 3こ へって 5こ。" },
];
const fmtL = (ml) => `${fmtDec(Math.round(ml / 100))}L`;
export function DecExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("read");          // read | do | answer | result
  const t = DEC_TASKS[step], last = step === DEC_TASKS.length - 1, n = DEC_TASKS.length;
  const [vs, setVs] = useState(t.vessels);
  const [touched, setTouched] = useState(false);       // いちど さわったら お手本を けす
  const [over, setOver] = useState(false);
  const [tried, setTried] = useState([]);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const reset = (k = step) => { setVs(DEC_TASKS[k].vessels()); setOver(false); };
  const onPourEnd = (before, after0, from, to) => {
    // はなしたら 0.1L（100mL）に そろえる：そそいだ がわ・うけた がわ の 2つで ぜんたいの りょうは かえない
    const after = after0.map((v) => ({ ...v }));
    const tv = after.find((v) => v.id === to), fv = after.find((v) => v.id === from);
    const pair = Math.round(tv.amount + fv.amount);
    tv.amount = Math.min(TYPES[tv.type].cap, Math.round(tv.amount / 100) * 100);
    fv.amount = pair - tv.amount;
    if (fv.amount > TYPES[fv.type].cap || fv.amount < 0) { fv.amount = Math.max(0, Math.min(TYPES[fv.type].cap, Math.round(fv.amount / 100) * 100)); tv.amount = pair - fv.amount; }
    setVs(after);
    const tg = after.find((v) => v.id === t.into);
    let done = false;
    if (t.target != null) { done = isExact(tg.amount, t.target); setOver(!done && tg.amount > t.target + 0.5); }
    else done = t.all.every((id) => after.find((v) => v.id === id).amount < 0.5);
    if (done) { sfx.correct(); timer.current = setTimeout(() => setPhase(t.ask ? "answer" : "result"), 900); }
  };
  const next = () => { sfx.tap(); if (last) { onFinish(); return; } setStep(step + 1); setPhase("read"); setTried([]); reset(step + 1); };

  if (phase === "read") return <ReadCard step={step} steps={n} text={t.read} sfx={sfx} onGo={() => setPhase("do")} />;
  if (phase === "do") {
    return (
      <DoCard step={step} steps={n} line={t.line}>
        <div className="g3-pour">
          <PourScene vessels={vs} pours={t.pours} onChange={setVs} onPourEnd={onPourEnd} onGrab={() => setTouched(true)} demo={touched ? null : t.demo} />
          <div className="g3-pour-amounts">{vs.map((v) => <span key={v.id}>{v.label ? v.label + "：" : ""}<b>{fmtL(v.amount)}</b></span>)}</div>
        </div>
        {over && <div className="g3-fig-msg g3-fig-msg-ng">多すぎたら、ぎゃくに そそいで もどそう</div>}
        <div className="g3-fig-acts"><button className="ts-act" onClick={() => { sfx.tap(); reset(); }}>さいしょから</button></div>
      </DoCard>
    );
  }
  if (phase === "answer") {
    return (
      <DoCard step={step} steps={n} line={t.ask}>
        <div className="g3-choices">
          {t.choices.map((c) => (
            <button key={c} className={"g3-choice" + (tried.includes(c) ? " g3-choice-tried" : "")} disabled={tried.includes(c)}
              onClick={() => { if (c === t.ans) { sfx.correct(); setPhase("result"); } else { sfx.wrong(); setTried([...tried, c]); } }}>{c}</button>
          ))}
        </div>
        {tried.length > 0 && <div className="g3-fig-msg g3-fig-msg-ng">おしい！ ますの 目もりを 見てみよう</div>}
      </DoCard>
    );
  }
  return <ResultCard step={step} steps={n} eq={t.eq} text={t.text} last={last} onNext={next} />;
}

/* ================= 分数（ケーキ・ピザ） =================
   ケーキ・ピザには はじめから 切れめが ある。① よむ → ② 言われた 分数に なるように ぬる → ④ いみ
   ぬれたら「4つに 分けた うちの 3つぶん」を、ことば と 図（分母・分子の よこに ふだ）で かえす
   大きさくらべ：1/2 と 1/4（ちがう）、2/4 と 1/2（おなじ）… ① よむ → ③ えらぶ → ④ */
const FRAC_TASKS = [
  { kind: "cake", d: 4, n: 3 },
  { kind: "pizza", d: 3, n: 2 },
  { kind: "cake", d: 4, n: 2 },
  { compare: [[1, 2], [1, 4]], ans: 0 },
  { compare: [[2, 4], [1, 2]], ans: "same" },
  { kind: "pizza", d: 5, n: 2, add: 1 },
];
const SHAPE_NAME = { cake: "ケーキ", pizza: "ピザ" };
const range = (k) => new Set(Array.from({ length: k }, (_, i) => i));
/* 分母・分子の いみを 図で：分数の よこに「ぬった 数」「分けた 数」の ふだ */
function Meaning({ n, d }) {
  return (
    <div className="g3-meaning">
      <span className="g3-meaning-frac"><Frac n={n} d={d} big /></span>
      <span className="g3-meaning-tags"><span>← ぬった 数</span><span>← 分けた 数</span></span>
    </div>
  );
}
export function FracExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("read");          // read | do | do2（たしざんの つづき）| answer | result
  const [painted, setPainted] = useState(new Set());
  const [picked, setPicked] = useState(null);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const t = FRAC_TASKS[step], last = step === FRAC_TASKS.length - 1, n = FRAC_TASKS.length;
  const next = () => { sfx.tap(); if (last) { onFinish(); return; } setStep(step + 1); setPhase("read"); setPainted(new Set()); setPicked(null); };

  if (t.compare) {
    const [[n0, d0], [n1, d1]] = t.compare;
    if (phase === "read") return <ReadCard step={step} steps={n} title="大きさくらべ" text={<><Frac n={n0} d={d0} /> と <Frac n={n1} d={d1} />、大きいのは どっち？</>} sfx={sfx} onGo={() => setPhase("answer")} />;
    if (phase === "answer") {
      const pick = (v) => { setPicked(v); if (v === t.ans) { sfx.correct(); timer.current = setTimeout(() => setPhase("result"), 700); } else sfx.wrong(); };
      return (
        <DoCard step={step} steps={n} line="大きいのは どっち？">
          <div className="g3-compare">
            {t.compare.map(([nn, d], i) => (
              <button key={i} className={"g3-compare-btn" + (picked === i ? (i === t.ans ? " g3-ok" : " g3-ng") : "")} onClick={() => pick(i)}>
                <FracShape d={d} painted={range(nn)} size={120} />
                <Frac n={nn} d={d} big />
              </button>
            ))}
          </div>
          <button className={"g3-same-btn" + (picked === "same" ? (t.ans === "same" ? " g3-ok" : " g3-ng") : "")} onClick={() => pick("same")}>おなじ 大きさ</button>
          {picked != null && picked !== t.ans && <div className="g3-fig-msg g3-fig-msg-ng">ぬった ところの 広さを くらべてみよう</div>}
        </DoCard>
      );
    }
    return t.ans === "same"
      ? <ResultCard step={step} steps={n} last={last} onNext={next} eq={<><Frac n={n0} d={d0} /> ＝ <Frac n={n1} d={d1} /></>} text="ぬれた 広さは おなじ だね。" extra={<FracWall ds={[2, 4]} hi={[]} />} />
      : <ResultCard step={step} steps={n} last={last} onNext={next} eq={<><Frac n={n0} d={d0} /> の ほうが 大きい</>} text="分ける 数が 多いほど、1つ分は 小さく なるね。" extra={<FracWall ds={[1, 2, 3, 4]} hi={[2, 4]} />} />;
  }

  const name = SHAPE_NAME[t.kind];
  if (phase === "read") return <ReadCard step={step} steps={n} text={<>{name}が {t.d}つに 分けて あるよ。<Frac n={t.n} d={t.d} /> に なるように ぬろう。</>} sfx={sfx} onGo={() => setPhase("do")} />;
  if (phase === "do" || phase === "do2") {
    const need = phase === "do2" ? t.n + t.add : t.n;
    const tapSlice = (i) => {
      if (painted.size === need) return;
      if (phase === "do2" && i < t.n) return;              // さいしょに ぬった ところは そのまま
      sfx.tap();
      const p = new Set(painted);
      if (p.has(i)) p.delete(i); else p.add(i);
      setPainted(p);
      if (p.size === need) { sfx.correct(); timer.current = setTimeout(() => setPhase(phase === "do" && t.add ? "mid" : "result"), 800); }
    };
    const first = phase === "do2" ? new Set([...painted].filter((i) => i < t.n)) : painted;
    const extra = phase === "do2" ? new Set([...painted].filter((i) => i >= t.n)) : new Set();
    return (
      <DoCard step={step} steps={n} line={phase === "do2" ? <>あと <Frac n={t.add} d={t.d} /> ぬろう</> : <><Frac n={t.n} d={t.d} /> に なるように ぬろう</>}>
        <div className="g3-frac-stage">
          <FracShape d={t.d} kind={t.kind} painted={first} extra={extra} onTap={tapSlice} size={230} />
          <div className="g3-count">ぬった 数 <b>{painted.size}</b> / {t.d}</div>
          {painted.size > need && <div className="g3-fig-msg g3-fig-msg-ng">ぬりすぎたら、もういちど タップで けせるよ</div>}
        </div>
      </DoCard>
    );
  }
  if (phase === "mid") {   // たしざん：2/5 が できた → つづき
    return <ResultCard step={step} steps={n} last={false} onNext={() => { sfx.tap(); setPhase("do2"); }}
      eq={<Frac n={t.n} d={t.d} />} text={`${t.d}つに 分けた うちの ${t.n}つぶん。あと 1まい ぬると どう なる？`} extra={<Meaning n={t.n} d={t.d} />} />;
  }
  if (t.add) {
    const sum = t.n + t.add;
    return <ResultCard step={step} steps={n} last={last} onNext={next}
      eq={<><Frac n={t.n} d={t.d} /> ＋ <Frac n={t.add} d={t.d} /> ＝ <Frac n={sum} d={t.d} /></>} text="分母（下の 数）は かわらないよ。" />;
  }
  return <ResultCard step={step} steps={n} last={last} onNext={next}
    eq={<Frac n={t.n} d={t.d} />} text={`${t.d}つに 分けた うちの ${t.n}つぶん だね。`} extra={<Meaning n={t.n} d={t.d} />} />;
}
