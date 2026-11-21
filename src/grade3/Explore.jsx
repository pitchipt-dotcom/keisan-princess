/* =====================================================================
   3年生：図で うごかして わかる（もんだいの まえ）
   それぞれ 3〜4この「やってみよう」。できたら しきを 見せて、つぎへ。まちがえても 止めない
   さいごの「やってみよう」が おわったら onFinish（＝もんだいへ）
   ===================================================================== */
import React, { useState } from "react";
import "../fairy/fairy.css";
import { PourScene } from "../fairy/PourScene.jsx";
import { isExact, TYPES } from "../fairy/juice.js";
import { CookieDeal, FracShape, FracWall, Frac } from "./Figures.jsx";
import { fmtDec } from "./g3.js";

function Steps({ n, at }) {
  return <div className="g3-steps">{Array.from({ length: n }, (_, i) => <i key={i} className={i < at ? "on" : i === at ? "now" : ""} />)}</div>;
}
function Shell({ title, step, steps, goal, children, result, onNext, last }) {
  return (
    <div className="g3-explore">
      <Steps n={steps} at={step} />
      <div className="g3-goal"><small>やってみよう {step + 1}/{steps}</small>{title && <b>{title}</b>}<span>{goal}</span></div>
      {children}
      {result && (
        <div className="g3-result">
          <div className="g3-result-body">{result}</div>
          <button className="kk-big-btn g3-next" onClick={onNext}>{last ? "もんだいに すすむ →" : "つぎへ →"}</button>
        </div>
      )}
    </div>
  );
}

/* ================= わり算 =================
   こたえが わかったら、くばりおわる まえでも 数字で こたえて いい（クッキーを くばるのは わからない ときの 手つだい）
   くばって おわっても、数字で こたえても、つぎの ことばは おなじ */
const DIV_TASKS = [
  { mode: "share", total: 12, plates: 3, title: "いくつずつ？", goal: "12この クッキーを、3まいの おさらに 同じ数ずつ くばると、1さら 何こ？",
    fields: [{ k: "each", pre: "1さら", post: "こ" }] },
  { mode: "group", total: 12, per: 4, title: "いくつ分？", goal: "12この クッキーを、1さらに 4こずつ のせると、おさらは 何まい？",
    fields: [{ k: "groups", pre: "", post: "まい" }] },
  { mode: "share", total: 14, plates: 4, title: "あまりが でると？", goal: "14この クッキーを、4まいの おさらに 同じ数ずつ くばると、1さら 何こで、何こ あまる？",
    fields: [{ k: "each", pre: "1さら", post: "こずつ、" }, { k: "rest", pre: "あまり", post: "こ" }] },
];
const divAnswer = (t) => (t.mode === "group" ? { groups: Math.floor(t.total / t.per), rest: t.total % t.per } : { each: Math.floor(t.total / t.plates), rest: t.total % t.plates });

/* 数字で こたえる らん（小さな すうじキーつき） */
function NumAnswer({ fields, sfx, onSubmit, msg }) {
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
      <div className="g3-numans-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => <button key={d} className="jc-digit" onClick={() => press(d)}>{d}</button>)}
      </div>
      <div className="g3-fig-acts">
        <button className="ts-act" onClick={() => press("けす")}>けす</button>
        <button className="ts-act ts-act-main" disabled={empty} onClick={() => {
          // 2つ ある ときに 1つめを 入れたら、つぎの らんへ
          onSubmit(Object.fromEntries(fields.map((f) => [f.k, Number(val[f.k])])), () => setVal(Object.fromEntries(fields.map((f) => [f.k, ""]))));
        }}>こたえる</button>
      </div>
      {msg && <div className="g3-fig-msg g3-fig-msg-ng">{msg}</div>}
    </div>
  );
}

export function DivExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [res, setRes] = useState(null);
  const [msg, setMsg] = useState(null);
  const t = DIV_TASKS[step], last = step === DIV_TASKS.length - 1;
  const want = divAnswer(t);
  const submit = (v, clear) => {
    const ok = t.fields.every((f) => v[f.k] === want[f.k]);
    if (ok) { sfx.correct(); setMsg(null); setRes(want); return; }
    sfx.wrong(); clear();
    setMsg("おしい！ クッキーを くばって たしかめてみよう");
  };
  const result = res && (t.mode === "group"
    ? <><div className="g3-eq">{t.total} ÷ {t.per} ＝ <b>{res.groups}</b></div><div>4こずつ のせると、<b>{res.groups}さら分</b>（いくつ分）に なるね！</div></>
    : res.rest
      ? <><div className="g3-eq">{t.total} ÷ {t.plates} ＝ <b>{res.each}</b> あまり <b>{res.rest}</b></div><div>1さら <b>{res.each}こずつ</b>。<b>{res.rest}こ</b> は くばれないね。これを「あまり」と いうよ。<br />あまりは わる数（{t.plates}）より 小さく なるよ</div></>
      : <><div className="g3-eq">{t.total} ÷ {t.plates} ＝ <b>{res.each}</b></div><div>1さら <b>{res.each}こずつ</b>（いくつずつ）に なるね！ {t.plates} × {res.each} ＝ {t.total} で たしかめられるよ</div></>);
  return (
    <Shell title={t.title} step={step} steps={DIV_TASKS.length} goal={t.goal} result={result} last={last}
      onNext={() => { sfx.tap(); if (last) onFinish(); else { setStep(step + 1); setRes(null); setMsg(null); } }}>
      {!res && <NumAnswer key={step} fields={t.fields} sfx={sfx} onSubmit={submit} msg={msg} />}
      {!res && <div className="g3-howto">わかったら 数字で こたえてね。わからない ときは、クッキーを くばって たしかめよう</div>}
      <CookieDeal key={"c" + step} total={t.total} plates={t.plates} per={t.per} mode={t.mode} sfx={sfx} onDone={(r) => { setMsg(null); setRes(r); }} frozen={!!res} />
    </Shell>
  );
}

/* ================= 小数（ジュースの泉の そそぐ 操作） ================= */
const V = (id, type, amount, x, label) => ({ id, type, amount, x, label });
const DEC_TASKS = [
  { goal: "1Lを 10に わけた 1つ分が 0.1L。0.1Lますで くんで、右の 1Lますを ちょうど 0.3L に しよう", into: "t", target: 300,
    vessels: () => [V("s", "Ld", 1000, 58), V("c", "dld", 0, 172), V("t", "Ld", 0, 290)], pours: { s: ["c"], c: ["t", "s"], t: ["c"] },
    result: (n) => <><div className="g3-eq">0.1L が <b>3こ</b>で <b>0.3L</b></div><div>0.1Lますで {n}かい くんだね。0.1が 10こで 1L だよ</div></> },
  { goal: "あ（0.4L）と い（0.3L）を、まん中の 1Lますに ぜんぶ いれよう。あわせて 何L？", into: "t", all: ["a", "b"],
    vessels: () => [V("a", "Ld", 400, 56, "あ"), V("t", "Ld", 0, 180), V("b", "Ld", 300, 304, "い")], pours: { a: ["t"], b: ["t"] },
    result: () => <><div className="g3-eq">0.4 ＋ 0.3 ＝ <b>0.7</b></div><div>0.1が 4こと 3こで <b>7こ</b>。だから 0.7L！</div></> },
  { goal: "0.8Lの ジュースから、右の 1Lますに 0.3L うつそう。のこりは 何L？", into: "t", target: 300,
    vessels: () => [V("s", "Ld", 800, 100), V("t", "Ld", 0, 262)], pours: { s: ["t"], t: ["s"] },
    result: () => <><div className="g3-eq">0.8 − 0.3 ＝ <b>0.5</b></div><div>0.1が 8こから 3こ へって <b>5こ</b>。のこりは 0.5L！</div></> },
];
const fmtL = (ml) => `${fmtDec(Math.round(ml / 100))}L`;
export function DecExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const t = DEC_TASKS[step], last = step === DEC_TASKS.length - 1;
  const [vs, setVs] = useState(t.vessels);
  const [pourN, setPourN] = useState(0);
  const [ok, setOk] = useState(false);
  const [over, setOver] = useState(false);
  const reset = (k = step) => { setVs(DEC_TASKS[k].vessels()); setPourN(0); setOk(false); setOver(false); };
  const onPourEnd = (before, after0, from, to) => {
    if (ok) return;
    // はなしたら 0.1L（100mL）に そろえる：そそいだ がわ・うけた がわ の 2つで ぜんたいの りょうは かえない
    const after = after0.map((v) => ({ ...v }));
    const tv = after.find((v) => v.id === to), fv = after.find((v) => v.id === from);
    const pair = Math.round(tv.amount + fv.amount);
    tv.amount = Math.min(TYPES[tv.type].cap, Math.round(tv.amount / 100) * 100);
    fv.amount = pair - tv.amount;
    if (fv.amount > TYPES[fv.type].cap || fv.amount < 0) { fv.amount = Math.max(0, Math.min(TYPES[fv.type].cap, Math.round(fv.amount / 100) * 100)); tv.amount = pair - fv.amount; }
    setVs(after);
    if (from === "c" && to === "t") setPourN((n) => n + 1);
    const tg = after.find((v) => v.id === t.into);
    if (t.target != null) {
      if (isExact(tg.amount, t.target)) { setOk(true); sfx.correct(); }
      else setOver(tg.amount > t.target + 0.5);
    } else if (t.all.every((id) => after.find((v) => v.id === id).amount < 0.5)) { setOk(true); sfx.correct(); }
  };
  return (
    <Shell step={step} steps={DEC_TASKS.length} goal={t.goal} last={last} result={ok && t.result(pourN)}
      onNext={() => { sfx.tap(); if (last) onFinish(); else { setStep(step + 1); reset(step + 1); } }}>
      <div className="g3-pour">
        <PourScene vessels={vs} pours={t.pours} interactive={!ok} onChange={setVs} onPourEnd={onPourEnd} />
        <div className="g3-pour-amounts">{vs.map((v) => <span key={v.id}>{v.label ? v.label + "：" : ""}{v.type === "dld" ? "0.1Lます " : ""}<b>{fmtL(v.amount)}</b></span>)}</div>
      </div>
      {over && !ok && <div className="g3-fig-msg g3-fig-msg-ng">ちょっと 多く なったね。もどして（ぎゃくに そそいで）ちょうせい しよう</div>}
      {!ok && <div className="g3-fig-acts"><button className="ts-act" onClick={() => { sfx.tap(); reset(); }}>さいしょから</button></div>}
      <div className="g3-howto">入れ物を おさえて、そそぐ 入れ物の ほうへ うごかしてね。ゆびを 下へ うごかすと かたむいて そそげるよ</div>
    </Shell>
  );
}

/* ================= 分数（ケーキ・ピザ） =================
   ケーキ・ピザには はじめから 切れめが ある。言われた 分数に なるように きれを タップして ぬる
   ぬれたら「4つに 分けた うちの 3つぶん」と 分母・分子の いみを ことばで かえす
   大きさくらべ：1/2 と 1/4（ちがう）、2/4 と 1/2（おなじ） */
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
function Meaning({ n, d }) {
  return (
    <div className="g3-meaning">
      <span className="g3-meaning-frac"><Frac n={n} d={d} big /></span>
      <span>{d}つに 分けた うちの <b>{n}つぶん</b>。<br /><small>下の 数（分母）は いくつに 分けたか、上の 数（分子）は その いくつぶんか を あらわすよ</small></span>
    </div>
  );
}
export function FracExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [painted, setPainted] = useState(new Set());
  const [phase2, setPhase2] = useState(false);       // たしざん：「あと 1まい」
  const [picked, setPicked] = useState(null);
  const t = FRAC_TASKS[step], last = step === FRAC_TASKS.length - 1;
  const next = () => { sfx.tap(); if (last) { onFinish(); return; } setStep(step + 1); setPainted(new Set()); setPhase2(false); setPicked(null); };

  if (t.compare) {
    const [[n0, d0], [n1, d1]] = t.compare;
    const ok = picked === t.ans;
    const goal = <>{"どっちが 大きい？ おなじ 大きさ かな？"}</>;
    const pick = (v) => { if (ok) return; setPicked(v); if (v === t.ans) sfx.correct(); else sfx.wrong(); };
    return (
      <Shell step={step} steps={FRAC_TASKS.length} goal={goal} last={last} onNext={next}
        result={ok && (t.ans === "same"
          ? <><div className="g3-eq"><Frac n={n0} d={d0} /> と <Frac n={n1} d={d1} /> は おなじ 大きさ</div><div>4つに 分けた 2つぶんと、2つに 分けた 1つぶんは、おなじ だけ ぬれているね</div><FracWall ds={[2, 4]} hi={[]} /></>
          : <><div className="g3-eq"><Frac n={n0} d={d0} /> の ほうが 大きい</div><div>同じ ケーキなら、分ける 数が 多いほど 1つぶんは 小さく なるね</div><FracWall ds={[1, 2, 3, 4]} hi={[2, 4]} /></>)}>
        <div className="g3-compare">
          {t.compare.map(([n, d], i) => (
            <button key={i} className={"g3-compare-btn" + (picked === i ? (i === t.ans ? " g3-ok" : " g3-ng") : "")} disabled={ok} onClick={() => pick(i)}>
              <FracShape d={d} painted={range(n)} size={120} />
              <Frac n={n} d={d} big />
            </button>
          ))}
        </div>
        <button className={"g3-same-btn" + (picked === "same" ? (t.ans === "same" ? " g3-ok" : " g3-ng") : "")} disabled={ok} onClick={() => pick("same")}>おなじ 大きさ</button>
        {picked != null && !ok && <div className="g3-fig-msg g3-fig-msg-ng">ぬった ところの 広さを よく くらべてみよう</div>}
      </Shell>
    );
  }

  const need = phase2 ? t.n + t.add : t.n;
  const ok = painted.size === need;
  const tapSlice = (i) => {
    if (ok && (!t.add || phase2)) return;
    if (ok && t.add && !phase2) return;
    if (phase2 && i < t.n) return;                    // さいしょに ぬった ところは そのまま
    sfx.tap();
    const p = new Set(painted);
    if (p.has(i)) p.delete(i); else p.add(i);
    setPainted(p);
    if (p.size === need) sfx.correct();
  };
  const name = SHAPE_NAME[t.kind];
  const goal = phase2 ? <>あと <Frac n={t.add} d={t.d} />（1まい）ぬると、どう なるかな？</>
    : <>{name}が {t.d}つに 分けて あるよ。<Frac n={t.n} d={t.d} />（{t.d}分の{t.n}）に なるように ぬろう</>;
  let result = null;
  if (ok && t.add && phase2) result = <><div className="g3-eq"><Frac n={t.n} d={t.d} /> ＋ <Frac n={t.add} d={t.d} /> ＝ <Frac n={need} d={t.d} /></div><Meaning n={need} d={t.d} /><div><Frac n={1} d={t.d} />が {t.n}つと {t.add}つで <b>{need}つ</b>。分母（下の 数）は かわらないよ</div></>;
  else if (ok) result = <Meaning n={t.n} d={t.d} />;
  // ぬった あと、さいしょの ぶんと ふえた ぶんで 色を かえる（たしざん）
  const first = phase2 ? new Set([...painted].filter((i) => i < t.n)) : painted;
  const extra = phase2 ? new Set([...painted].filter((i) => i >= t.n)) : new Set();
  return (
    <Shell step={step} steps={FRAC_TASKS.length} goal={goal} last={last && (!t.add || phase2)}
      result={result} onNext={() => { if (t.add && !phase2) { sfx.tap(); setPhase2(true); setPainted(range(t.n)); } else next(); }}>
      <div className="g3-frac-stage">
        <FracShape d={t.d} kind={t.kind} painted={first} extra={extra} onTap={tapSlice} size={200} />
        <div className="g3-fig-note">ぬった 数：<b>{painted.size}</b> / {t.d}　{painted.size > need ? "（ぬりすぎ。もういちど タップで けせるよ）" : "きれを タップして ぬろう"}</div>
      </div>
    </Shell>
  );
}
