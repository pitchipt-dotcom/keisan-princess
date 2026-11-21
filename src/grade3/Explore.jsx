/* =====================================================================
   3年生：図で うごかして わかる（もんだいの まえ）
   それぞれ 3〜4この「やってみよう」。できたら しきを 見せて、つぎへ。まちがえても 止めない
   さいごの「やってみよう」が おわったら onFinish（＝もんだいへ）
   ===================================================================== */
import React, { useState } from "react";
import "../fairy/fairy.css";
import { PourScene } from "../fairy/PourScene.jsx";
import { isExact } from "../fairy/juice.js";
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

/* ================= わり算 ================= */
const DIV_TASKS = [
  { mode: "share", total: 12, plates: 3, title: "いくつずつ？", goal: "12この クッキーを、3まいの おさらに 同じ数ずつ くばろう" },
  { mode: "group", total: 12, per: 4, title: "いくつ分？", goal: "12この クッキーを、1さらに 4こずつ のせよう。おさらは 何まい いるかな？" },
  { mode: "share", total: 14, plates: 4, title: "あまりが でると？", goal: "14この クッキーを、4まいの おさらに 同じ数ずつ くばろう" },
];
export function DivExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [res, setRes] = useState(null);
  const t = DIV_TASKS[step], last = step === DIV_TASKS.length - 1;
  const result = res && (t.mode === "group"
    ? <><div className="g3-eq">{t.total} ÷ {t.per} ＝ <b>{res.groups}</b></div><div>4こずつ のせると、<b>{res.groups}さら分</b>（いくつ分）に なったね！</div></>
    : res.rest
      ? <><div className="g3-eq">{t.total} ÷ {t.plates} ＝ <b>{res.each}</b> あまり <b>{res.rest}</b></div><div>1さら <b>{res.each}こずつ</b>。<b>{res.rest}こ</b> は くばれないね。これを「あまり」と いうよ。<br />あまりは わる数（{t.plates}）より 小さく なるよ</div></>
      : <><div className="g3-eq">{t.total} ÷ {t.plates} ＝ <b>{res.each}</b></div><div>1さら <b>{res.each}こずつ</b>（いくつずつ）に なったね！ {t.plates} × {res.each} ＝ {t.total} で たしかめられるよ</div></>);
  return (
    <Shell title={t.title} step={step} steps={DIV_TASKS.length} goal={t.goal} result={result} last={last}
      onNext={() => { sfx.tap(); if (last) onFinish(); else { setStep(step + 1); setRes(null); } }}>
      <CookieDeal key={step} total={t.total} plates={t.plates} per={t.per} mode={t.mode} sfx={sfx} onDone={setRes} />
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
  const onPourEnd = (before, after, from, to) => {
    if (ok) return;
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

/* ================= 分数（ケーキ・ピザ） ================= */
const FRAC_TASKS = [
  { kind: "cake", d: 2, need: 1, goal: "ケーキを 2つに 同じ 大きさに わけて、1つ分に 色を ぬろう" },
  { kind: "cake", d: 4, need: 1, goal: "こんどは 4つに わけて、1つ分に 色を ぬろう" },
  { compare: true, goal: "1/2 と 1/4、大きいのは どっち？ タップしてね" },
  { kind: "pizza", d: 5, need: 2, then: 3, goal: "ピザを 5つに わけて、2まいに 色を ぬろう" },
];
export function FracExplore({ sfx, onFinish }) {
  const [step, setStep] = useState(0);
  const [cut, setCut] = useState(false);
  const [painted, setPainted] = useState(new Set());
  const [phase2, setPhase2] = useState(false);       // ピザ：「あと 1まい」
  const [picked, setPicked] = useState(null);
  const t = FRAC_TASKS[step], last = step === FRAC_TASKS.length - 1;
  const next = () => { sfx.tap(); if (last) { onFinish(); return; } setStep(step + 1); setCut(false); setPainted(new Set()); setPhase2(false); setPicked(null); };

  if (t.compare) {
    const ok = picked === 2;
    return (
      <Shell step={step} steps={FRAC_TASKS.length} goal={t.goal} last={last} onNext={next}
        result={ok && <><div className="g3-eq"><Frac n={1} d={2} /> の ほうが 大きい</div><div>同じ ケーキなら、わける 数が 多いほど 1つ分は 小さく なるね</div><FracWall ds={[1, 2, 3, 4]} hi={[2, 4]} /></>}>
        <div className="g3-compare">
          {[2, 4].map((d) => (
            <button key={d} className={"g3-compare-btn" + (picked === d ? (d === 2 ? " g3-ok" : " g3-ng") : "")} disabled={ok}
              onClick={() => { setPicked(d); if (d === 2) sfx.correct(); else sfx.wrong(); }}>
              <FracShape d={d} painted={new Set([0])} size={120} />
              <Frac n={1} d={d} big />
            </button>
          ))}
        </div>
        {picked === 4 && <div className="g3-fig-msg g3-fig-msg-ng">ぬった ところの 大きさを くらべてみよう。どっちが 広いかな？</div>}
      </Shell>
    );
  }
  const need = phase2 ? t.then : t.need;
  const ok = cut && painted.size === need;
  const tapSlice = (i) => {
    if (ok && (!t.then || phase2)) return;
    sfx.tap();
    const p = new Set(painted);
    if (p.has(i)) p.delete(i); else p.add(i);
    setPainted(p);
    if (p.size === need) sfx.correct();
  };
  const name = t.kind === "pizza" ? "ピザ" : "ケーキ";
  let result = null;
  if (ok && t.then && !phase2) result = <><div className="g3-eq"><Frac n={2} d={5} /> （5ぶんの2）</div><div><Frac n={1} d={5} />が 2こ分 だね。<b>あと 1まい</b> ぬると、どう なるかな？</div></>;
  else if (ok && t.then) result = <><div className="g3-eq"><Frac n={2} d={5} /> ＋ <Frac n={1} d={5} /> ＝ <Frac n={3} d={5} /></div><div><Frac n={1} d={5} />が 2こと 1こで <b>3こ</b>。分母（下の 数）は かわらないよ</div></>;
  else if (ok) result = <><div className="g3-eq"><Frac n={1} d={t.d} /> （{t.d}ぶんの1）</div><div>{t.d}つに 同じ 大きさに わけた 1つ分を「{t.d}ぶんの1」と いうよ</div></>;
  return (
    <Shell step={step} steps={FRAC_TASKS.length} goal={phase2 ? "あと 1まい ぬってみよう" : t.goal} last={last && phase2}
      result={result} onNext={() => { if (t.then && !phase2) { sfx.tap(); setPhase2(true); } else next(); }}>
      <div className="g3-frac-stage">
        <FracShape d={t.d} kind={t.kind} cut={cut} painted={painted} onTap={cut ? tapSlice : undefined} size={190} />
        {!cut
          ? <button className="ts-act ts-act-main ts-act-wide" onClick={() => { sfx.tap(); setCut(true); }}>{name}を {t.d}つに わける ✂</button>
          : <div className="g3-fig-note">ぬった 数：<b>{painted.size}</b> / {t.d}　{painted.size > need ? "（ぬりすぎたら もういちど タップで けせるよ）" : "きれを タップして ぬろう"}</div>}
      </div>
    </Shell>
  );
}
