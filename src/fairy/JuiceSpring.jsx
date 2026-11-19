/* =====================================================================
   妖精の国 — ジュースの泉（小2：かさ L・dL・mL を 自分の 手で そそいで おぼえる）
   時間は はからない。まちがえても バツで 止めない。そそぎすぎたら「もどす」
   だんかい（ゴールは だんかいの はじめに 帯で 1文）
     1 はかって いれよう … 1dLますで くんで、1Lますを ちょうど N dL に
     2 いくつ ぶん？ … 2つの 1Lますを あわせると 何L何dL？ → こたえてから 水そうに そそいで たしかめる（1Lを こえると 線が 光る）
     3 ようせいに わけよう … コップに s dLずつ わけて、のこりを こたえる。くり下がりは 1Lますを 10dL に ばらす アニメ
     4 mLも つかおう … 1dL＝100mL、1L＝1000mL を けいりょうカップで たしかめる
   見た目と 流れは つみきの森と そろえる（ゴールの帯・妖精の セリフ・なかよし度）
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { PourScene } from "./PourScene.jsx";
import { FairyGuide } from "./TsumikiForest.jsx";
import { makeSet, isExact, answerOK, badCups, fmtLdL, splitLdL, answerToML } from "./juice.js";

export const JUICE_FAIRY = "ramune";
export const JSTAGES = [
  { no: 1, name: "はかって いれよう", desc: "1dLますで くんで、ちょうどの かさに しよう", icon: "🥤" },
  { no: 2, name: "いくつ ぶん？", desc: "2つの ますを あわせると 何L何dL？", icon: "🧮" },
  { no: 3, name: "ようせいに わけよう", desc: "コップに わけて、のこりを こたえよう", icon: "🧚" },
  { no: 4, name: "mLも つかおう", desc: "1dL＝100mL、1L＝1000mL を たしかめよう", icon: "🧪" },
];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const PRAISE = ["ぴったり！ じょうずに はかれたね！", "すごい！ 目もりを よく 見たね！", "できた！ ラムネも にっこり！"];
const HOWTO = "入れ物を おさえて、そそぐ 入れ物の ほうへ うごかしてね。そのまま ゆびを 下へ うごかすと かたむいて そそげるよ";

/* こたえの 入力（L・dL ／ mL） */
function AmountPad({ units, value, active, onActive, onChange, onSubmit, submitLabel = "こたえる" }) {
  const maxLen = { L: 1, dL: 1, mL: 4 };
  const press = (d) => {
    const cur = value[active] || "";
    const nx = cur.length >= maxLen[active] ? (maxLen[active] === 1 ? String(d) : cur) : (cur === "0" ? String(d) : cur + d);
    onChange({ ...value, [active]: nx });
    if (active === "L" && units.includes("dL")) onActive("dL");
  };
  const empty = units.every((u) => !value[u]);
  return (
    <div className="jc-pad">
      <div className="jc-fields">
        <span className="jc-fields-lead">ぜんぶで</span>
        {units.map((u) => (
          <React.Fragment key={u}>
            <button className={"jc-field" + (active === u ? " jc-field-on" : "") + (u === "mL" ? " jc-field-wide" : "")} onClick={() => onActive(u)} aria-label={u + "の らん"}>
              {value[u] || <span className="jc-field-empty">□</span>}
            </button>
            <span className="jc-unit">{u}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="jc-digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => <button key={d} className="jc-digit" onClick={() => press(d)}>{d}</button>)}
      </div>
      <div className="jc-pad-acts">
        <button className="ts-act" disabled={empty} onClick={() => onChange(Object.fromEntries(units.map((u) => [u, ""])))}>けす</button>
        <button className="ts-act ts-act-main" disabled={empty} onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}

/* くり下がり：1Lますを 10dL に ばらす（例 1L3dL − 5dL） */
export function BorrowAnim({ total, give }) {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    setStep(0);
    const ts = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 2000), setTimeout(() => setStep(3), 3100)];
    return () => ts.forEach(clearTimeout);
  }, [run]);
  const t = splitLdL(total), gdl = give / 100, all = t.L * 10 + t.dL;
  const blocks = [];
  if (step === 0) {
    blocks.push(<span key="L" className="jc-bL">1L</span>);
    for (let i = 0; i < t.dL; i++) blocks.push(<span key={"d" + i} className="jc-bd jc-bd-own" />);
  } else {
    for (let i = 0; i < all; i++) {
      const fromL = i < 10, gone = step >= 3 && i >= all - gdl;
      blocks.push(<span key={"b" + i} className={"jc-bd" + (fromL ? " jc-bd-new" : " jc-bd-own") + (gone ? " jc-bd-gone" : "")} style={{ animationDelay: fromL ? `${i * 60}ms` : undefined }} />);
    }
  }
  const line = [
    `${fmtLdL(total)} − ${gdl}dL … ${t.dL}dL から ${gdl}dL は ひけない！`,
    "1Lますを ばらすと 10dL に なるよ",
    `10dL ＋ ${t.dL}dL ＝ ${all}dL`,
    `${all}dL − ${gdl}dL ＝ ${all - gdl}dL`,
  ][step];
  return (
    <div className="jc-borrow" aria-live="polite">
      <div className="jc-borrow-blocks">{blocks}</div>
      <div className="jc-borrow-line">{line}</div>
      {step === 3 && <button className="kk-text-btn jc-borrow-again" onClick={() => setRun((r) => r + 1)}>もういちど 見る</button>}
    </div>
  );
}

const emptyAns = (units) => Object.fromEntries((units || []).map((u) => [u, ""]));

export function JuiceSpring({ stage, sfx, onGain, onClearStage }) {
  const [probs, setProbs] = useState(() => makeSet(stage));
  const [pi, setPi] = useState(0);
  const p = probs[pi];
  const [vessels, setVessels] = useState(() => probs[0].vessels);
  const [undo, setUndo] = useState([]);
  const [phase, setPhase] = useState("pour");      // pour | answer | done
  const [ans, setAns] = useState(() => emptyAns(probs[0].units));
  const [active, setActive] = useState("L");
  const [given, setGiven] = useState(null);       // だんかい2：こたえた りょう（mL）
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState(null);
  const [tries, setTries] = useState(0);
  const [gainFx, setGainFx] = useState(null);
  const [score, setScore] = useState({ done: 0, perfect: 0, gained: 0 });
  const [finished, setFinished] = useState(false);
  const [showBorrow, setShowBorrow] = useState(false);
  const toldHow = useRef(false);

  const load = (q) => {
    setVessels(q.vessels); setUndo([]); setTries(0); setMood(null); setGiven(null); setShowBorrow(false);
    setAns(emptyAns(q.units)); setActive(q.units ? q.units[0] : "L");
    const how = toldHow.current ? "" : HOWTO;          // そそぎかたの 説明は、はじめて そそぐ までは くりかえす
    if (q.stage === 1) { setPhase("pour"); setMsg(how ? `つぼから 1dLますに くんで、1Lますに いれよう。${how}` : "1dLますで なんかい くめば いいかな？"); }
    else if (q.stage === 2) { setPhase("answer"); setMsg("あと いくつ で 1L かな？ 目もりを 見て、ぜんぶで 何L何dL か こたえてね"); }
    else if (q.stage === 3) { setPhase("pour"); setMsg(how ? `コップに ${q.each / 100}dLずつ いれよう。コップの 線で 止めてね。${how}` : `コップの ${q.each / 100}dLの 線まで いれよう`); }
    else if (q.kind === "fine") { setPhase("pour"); setMsg("1dLますの ふちの ちかくに、10mLごとの こまかい 目もりが あるよ。線で 止めてね"); }
    else if (q.kind === "dl2ml") { setPhase("pour"); setMsg(how ? `1dLますで ${q.k}はい くんで、けいりょうカップに いれよう。${how}` : `1dLますで ${q.k}はい、けいりょうカップに いれてみよう`); }
    else { setPhase("pour"); setMsg("1Lますの ジュースを、ぜんぶ けいりょうカップに うつしてみよう"); }
  };
  useEffect(() => {
    if (import.meta.env.DEV) window.__juice = probs;          // ブラウザ テスト用（本番には 入らない）
    load(probs[0]);
    /* eslint-disable-next-line */
  }, []);

  const gain = (n) => { if (n <= 0) return; onGain(n); setScore((s) => ({ ...s, gained: s.gained + n })); setGainFx({ n, id: Date.now() }); };
  const amt = (id) => vessels.find((v) => v.id === id).amount;

  /* 1かい そそぎ おわった とき */
  const onPourEnd = (before, after) => {
    toldHow.current = true;
    setUndo((u) => [...u.slice(-29), before]);
    const A = (id) => after.find((v) => v.id === id).amount;
    if (p.stage === 1 && A("L") > p.target + 0.5) setMsg("ちょっと おおいかも？「もどす」で もどせるよ");
    if (p.stage === 2 && phase === "pour") {
      if (A("A") < 0.01 && A("B") < 0.01) finish2(A("tank"));
      else if (A("tank") >= 1000 - 0.5) setMsg("1Lの 線を こえたね！ のこりも いれよう");
    }
    if (p.stage === 4 && p.kind === "fine" && A("dl") > p.target + 0.5) setMsg(`${p.target}mLの 線を こえたよ。「もどす」で もどそう`);
  };
  const doUndo = () => {
    if (!undo.length) return;
    sfx.tap(); setVessels(undo[undo.length - 1].map((v) => ({ ...v, stickUntil: 0 }))); setUndo(undo.slice(0, -1));
    setMsg("ひとつ まえに もどしたよ");
  };

  const right = (text) => { sfx.correct(); setMood("happy"); setMsg(text || pickOne(PRAISE)); setPhase("done"); };

  /* ---------- だんかいごとの たしかめ ---------- */
  const check1 = () => {          // だんかい1／4（こまかい 目もり）：ちょうど はかれた？
    sfx.tap();
    const id = p.into, a = amt(id), unit = p.stage === 1 ? "dL" : "mL";
    if (isExact(a, p.target)) { right(p.stage === 1 ? `ぴったり ${p.target / 100}dL！ 1dLますで ${p.target / 100}かい くんだね` : `ぴったり ${p.target}mL！ こまかい 目もりも よめたね`); return; }
    setTries((t) => t + 1);
    const onLine = p.stage === 1 ? Math.abs(a / 100 - Math.round(a / 100)) < 0.005 : Math.abs(a / 10 - Math.round(a / 10)) < 0.05;
    if (!onLine) setMsg(`目もりの 線と 線の あいだに なっているよ。${p.target / (unit === "dL" ? 100 : 1)}${unit}の 線に ぴったり あわせよう`);
    else if (a < p.target) setMsg(`まだ すこし たりないみたい。${unit === "dL" ? "1Lますの 目もりを かぞえてみよう" : "目もりを よく 見てね"}`);
    else setMsg("ちょっと おおいみたい。「もどす」で もどして みよう");
  };
  const submit2 = () => {          // だんかい2：こたえてから 水そうで たしかめる
    sfx.tap();
    setGiven(answerToML(ans)); setPhase("pour");
    setMsg(`こたえは ${fmtLdL(answerToML(ans))} だね。ほんとうか、2つの 1Lますを 水そうに そそいで たしかめよう！`);
  };
  const finish2 = (tank) => {
    const ok = answerOK(p, ans);
    if (ok) right(`水そうで はかっても ${fmtLdL(tank)}！ こたえ ぴったり！`);
    else { setTries((t) => t + 1); setMood(null); sfx.tap(); setPhase("done");
      setMsg(`水そうで はかると ${fmtLdL(tank)} だったね。1Lの 線を こえた ぶんが ${splitLdL(tank).dL}dL だよ`); }
  };
  const check3 = () => {           // だんかい3：コップが ぜんぶ s dL？ → のこりを こたえる
    sfx.tap();
    const bad = badCups(p, vessels);
    if (bad.length) {
      setTries((t) => t + 1);
      const i = p.cups.indexOf(bad[0]) + 1, a = amt(bad[0]);
      setMsg(`${i}ばんの コップが ${a < p.each ? "まだ たりない" : "おおすぎる"}みたい。${p.each / 100}dLの 線に あわせよう`);
      return;
    }
    setPhase("answer"); setAns(emptyAns(p.units)); setActive("L");
    setMsg(`みんなに ${p.each / 100}dLずつ わけられたね！ ますに のこった ジュースは 何L何dL？`);
  };
  const submitAnswer = () => {     // だんかい3・4 の こたえ
    sfx.tap();
    if (answerOK(p, ans)) {
      if (p.stage === 3) { right(`そう！ のこりは ${fmtLdL(p.rest)}！`); if (p.borrow) setShowBorrow(true); }
      else right(p.kind === "l2ml" ? "そう！ 1L ＝ 1000mL だね！" : p.k === 1 ? "そう！ 1dL ＝ 100mL だね！" : `そう！ ${p.k}dL ＝ ${p.k * 100}mL。1dL は 100mL だね！`);
      return;
    }
    setTries((t) => t + 1);
    if (p.stage === 3) { setMsg(p.borrow ? "おしい！ 1Lますを dLに ばらして かんがえてみよう" : "おしい！ ますの 目もりを もういちど 見てみよう"); if (p.borrow) setShowBorrow(true); }
    else setMsg(p.kind === "l2ml" ? "おしい！ けいりょうカップの いちばん 上の 目もりを 見てみよう" : "おしい！ けいりょうカップの 目もりを 見てみよう。100、200… と よむよ");
  };

  const next = () => {
    sfx.tap();
    const perfect = tries === 0 && (p.stage !== 2 || answerOK(p, ans)) ? 1 : 0;
    gain(1 + perfect);
    setScore((s) => ({ ...s, done: s.done + 1, perfect: s.perfect + perfect }));
    if (pi + 1 >= probs.length) { setFinished(true); onClearStage(stage); setMood("happy"); setMsg("きょうの もんだい ぜんぶ できたね！ ラムネと もっと なかよしに なったよ"); return; }
    setPi(pi + 1); load(probs[pi + 1]);
  };
  const again = () => { const ps = makeSet(stage); if (import.meta.env.DEV) window.__juice = ps; setProbs(ps); setPi(0); setFinished(false); setScore({ done: 0, perfect: 0, gained: 0 }); load(ps[0]); };

  if (finished) {
    return (
      <div className="ts-wrap">
        <FairyGuide fairy={JUICE_FAIRY} text={msg} mood="happy" />
        <div className="ts-card ts-done">
          <div className="ts-done-title">{JSTAGES[stage - 1].icon} {JSTAGES[stage - 1].name} クリア！</div>
          <div>できた もんだい：<b>{score.done}もん</b></div>
          <div>1かいめで ぴったり：<b>{score.perfect}もん</b></div>
          <div className="ts-done-gain">💗 ラムネの なかよし度 <b>+{score.gained}</b></div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); again(); }}>もういちど ♪</button>
      </div>
    );
  }

  const pourOn = phase === "pour" || (phase === "answer" && p.stage === 4);
  // さいしょに もつ 入れ物に 👆（1かい そそいだら きえる）
  const hint = phase === "pour" && !undo.length ? ({ 1: ["pot"], 2: ["A", "B"], 3: ["L1", "L2"], 4: [p.kind === "l2ml" ? "L" : "pot"] })[p.stage] : null;

  return (
    <div className="ts-wrap jc-wrap">
      <div className="ts-head">
        <span className="ts-stage-tag jc-stage-tag">{JSTAGES[stage - 1].icon} {JSTAGES[stage - 1].name}　{pi + 1} / {probs.length}</span>
        {gainFx && <span className="ts-gain" key={gainFx.id}>💗 +{gainFx.n}</span>}
      </div>
      <div className="ts-goal" role="status">
        <span className="ts-goal-icon" aria-hidden="true">🎯</span>
        <span className="ts-goal-text"><small>ゴール</small>{p.goal}</span>
        {p.stage === 2 && given != null && <span className="ts-goal-sub">こたえ {fmtLdL(given)}</span>}
      </div>
      <FairyGuide fairy={JUICE_FAIRY} text={msg} mood={mood} />

      <div className="jc-stage-box">
        <PourScene vessels={vessels} pours={p.pours} interactive={pourOn} onChange={setVessels} onPourEnd={onPourEnd}
          glowL1={p.stage === 2} hint={hint} />
      </div>

      {showBorrow && <BorrowAnim total={p.total} give={p.give} />}

      {phase === "answer" && (
        <AmountPad units={p.units} value={ans} active={active} onActive={setActive} onChange={setAns}
          onSubmit={p.stage === 2 ? submit2 : submitAnswer} submitLabel={p.stage === 2 ? "こたえて たしかめる" : "こたえる"} />
      )}
      <div className="jc-acts">
        {pourOn && phase === "pour" && <button className="ts-act" disabled={!undo.length} onClick={doUndo}>↩ もどす</button>}
        {phase === "pour" && (p.stage === 1 || p.kind === "fine") && <button className="ts-act ts-act-main" onClick={check1}>できた！</button>}
        {phase === "pour" && p.stage === 3 && <button className="ts-act ts-act-main" onClick={check3}>わけた！</button>}
        {phase === "pour" && p.stage === 4 && p.kind !== "fine" && <button className="ts-act ts-act-main" onClick={() => { sfx.tap(); setPhase("answer"); setActive("mL"); setMsg(p.kind === "l2ml" ? "けいりょうカップの 目もりを よもう。1Lは 何mL？" : "けいりょうカップの 目もりを よもう。何mL かな？"); }}>いれた！ よむ</button>}
        {phase === "answer" && p.stage === 4 && <button className="ts-act" disabled={!undo.length} onClick={doUndo}>↩ もどす</button>}
        {phase === "done" && <button className="ts-act ts-act-main" onClick={next}>{pi + 1 >= probs.length ? "おわる" : "つぎの もんだい"} →</button>}
      </div>
    </div>
  );
}
