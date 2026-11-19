/* =====================================================================
   妖精の国 — ますめの花畑（小2：ます目の 上の 形の 広さを、切ったり 動かしたり して「何ます分」と 数える）
   時間は はからない。まちがえても バツで 止めない
   だんかい（ゴールは だんかいの はじめに 帯で 1文）
     1 かぞえよう … 四角の 組みあわせの 形。タップで 1ますずつ 数える
     2 はんぶんを あわせよう … ななめに 切れた 三角が 2つ。うごかして 2つで 1ます
     3 うごかして かんがえよう … 台形・木・星・でこぼこ。三角や はみ出た ところを 動かして 四角に してから 数える。ヒントで 動かす 部分が 光る
     4 おなじ 広さは どれ？ … 2〜4つの 花だんから、同じ 広さ／いちばん 広い ものを えらぶ
   見た目と 流れは ほかの エリアと そろえる（ゴールの帯・妖精の セリフ・なかよし度）
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { MasumeField } from "./MasumeField.jsx";
import { FairyGuide } from "./TsumikiForest.jsx";
import { AmountPad } from "./JuiceSpring.jsx";
import { makeSet, FIELD, allTiles, analyze, countLabels, isSameAnswer, unkey } from "./masume.js";

export const MASUME_FAIRY = "poppy";
export const MSTAGES = [
  { no: 1, name: "かぞえよう", desc: "四角の 花だんを 1ますずつ かぞえよう", icon: "🔢" },
  { no: 2, name: "はんぶんを あわせよう", desc: "ななめの 三角を 2つ あわせると？", icon: "📐" },
  { no: 3, name: "うごかして かんがえよう", desc: "うごかして 四角に してから かぞえよう", icon: "🧩" },
  { no: 4, name: "おなじ 広さは どれ？", desc: "花だんの 広さを くらべよう", icon: "⚖️" },
];
const LETTERS = ["あ", "い", "う", "え"];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const PRAISE = ["ぴったり！ よく かぞえたね！", "すごい！ 何ます分か わかったね！", "できた！ ポピーも にっこり！"];
const UNIT = "ます分";
const HOWTO = "黄色い ところは ドラッグで うごかせるよ。タップすると くるっと まわるよ";

export function MasumeGarden({ stage, sfx, onGain, onClearStage }) {
  const [probs, setProbs] = useState(() => makeSet(stage));
  const [pi, setPi] = useState(0);
  const p = probs[pi];
  const [pieces, setPieces] = useState(() => probs[0].pieces || []);
  const [taps, setTaps] = useState({});
  const [labels, setLabels] = useState([]);
  const [shown, setShown] = useState(0);
  const [ans, setAns] = useState({ [UNIT]: "" });
  const [sel, setSel] = useState([]);
  const [glow, setGlow] = useState(false);
  const [phase, setPhase] = useState("play");     // play | done
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState(null);
  const [tries, setTries] = useState(0);
  const [gainFx, setGainFx] = useState(null);
  const [score, setScore] = useState({ done: 0, perfect: 0, gained: 0 });
  const [finished, setFinished] = useState(false);
  const [dragging, setDragging] = useState(false);
  const timer = useRef(null);
  const toldHow = useRef(false);

  const stopCount = () => { clearInterval(timer.current); timer.current = null; };
  useEffect(() => stopCount, []);

  const load = (q) => {
    stopCount();
    setPieces(q.pieces || []); setTaps({}); setLabels([]); setShown(0); setAns({ [UNIT]: "" }); setSel([]); setGlow(false);
    setPhase("play"); setMood(null); setTries(0);
    if (q.stage === 1) setMsg("ますを 1つずつ タップして かぞえよう。ばんごうが つくよ");
    else if (q.stage === 2) setMsg(toldHow.current ? "三角を うごかして、もう 1つの 三角と あわせよう" : `ななめの 三角が 2つ あるね。2つ あわせると 1ますに なるよ。${HOWTO}`);
    else if (q.stage === 3) setMsg(`${q.name}だよ。どこを うごかすと 四角に なるかな？${toldHow.current ? "" : HOWTO}`);
    else setMsg(q.ask === "max" ? "どの 花だんが いちばん 広いかな？ タップして えらんでね" : "おなじ 広さの 花だんが 2つ あるよ。タップして 2つ えらんでね");
  };
  useEffect(() => {
    if (import.meta.env.DEV) window.__masume = probs;           // ブラウザ テスト用（本番には 入らない）
    load(probs[0]);
    /* eslint-disable-next-line */
  }, []);

  const gain = (n) => { if (n <= 0) return; onGain(n); setScore((s) => ({ ...s, gained: s.gained + n })); setGainFx({ n, id: Date.now() }); };
  const right = (text) => { sfx.correct(); setMood("happy"); setMsg(text || pickOne(PRAISE)); setPhase("done"); stopCount(); };

  /* ---------- かぞえる（1ますずつ ばんごうが つく） ---------- */
  const runCount = (tiles, after) => {
    stopCount();
    const lb = countLabels(tiles);
    setLabels(lb); setShown(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1; setShown(i); sfx.tap();
      if (i >= lb.length) { stopCount(); after && after(lb.length); }
    }, 170);
  };
  const count23 = () => {
    sfx.tap();
    const a = analyze(allTiles(p, pieces), FIELD.W, FIELD.H);
    if (a.overlap.length) { setMsg("かさなって いる ところが あるよ（赤い 点線）。うごかして なおそう"); return; }
    if (a.halves.length) { setMsg(`まだ はんぶんの 三角が ${a.halves.length}つ あるよ。三角を 2つ あわせて 1ますに しよう`); setGlow(true); return; }
    setGlow(false);
    runCount(allTiles(p, pieces), (n) => setMsg(`1ますずつ かぞえたら ${n}まで いったね。何ます分か こたえてね`));
  };

  /* ---------- うごかした とき ---------- */
  const onPieces = (np, info) => {
    toldHow.current = true;
    setPieces(np); setLabels([]); setShown(0); stopCount();
    if (info.outside) { setMsg("花畑の そとには おけないよ"); return; }
    const a = analyze(allTiles(p, np), FIELD.W, FIELD.H);
    if (a.overlap.length) setMsg("かさなって いるよ。むきや ばしょを かえてみよう（タップで まわる）");
    else if (!a.halves.length && (p.stage === 2 || p.family !== "dekoboko" || info.moved)) {
      setGlow(false);
      setMsg(p.stage === 2 ? "三角 2つで 1ますに なったね！「かぞえる」を おしてみよう" : "四角の 組みあわせに なったね！「かぞえる」を おしてみよう");
    } else if (info.rotated) setMsg("くるっ！ むきが かわったよ");
  };

  /* ---------- こたえる ---------- */
  const submit = () => {
    sfx.tap();
    const v = Number(ans[UNIT] || 0);
    if (v === p.area) { right(`そう！ ${p.area}ます分！`); return; }
    setTries((t) => t + 1);
    if (p.stage === 1) setMsg(Object.keys(taps).length < p.area ? "まだ かぞえて いない ますが あるかも。タップして ばんごうを つけてみよう" : "おしい！「かぞえなおす」で もういちど かぞえてみよう");
    else if (analyze(allTiles(p, pieces)).halves.length) { setMsg("おしい！ 三角は 2つで 1ます だよ。うごかして あわせてから かぞえよう"); if (p.stage === 3) setGlow(true); }
    else setMsg("おしい！「かぞえる」で 1ますずつ かぞえてみよう");
  };
  /* だんかい4 */
  const toggle = (i) => {
    if (phase === "done") return;
    sfx.tap();
    const want = p.answer.length;
    setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : want === 1 ? [i] : [...s, i].slice(-want)));
  };
  const check4 = () => {
    sfx.tap();
    if (isSameAnswer(p, sel)) {
      right(p.ask === "max" ? `そう！ ${LETTERS[p.answer[0]]}は ${p.areas[p.answer[0]]}ます分で いちばん 広いね！` : `そう！ ${LETTERS[p.answer[0]]}と ${LETTERS[p.answer[1]]}は どちらも ${p.areas[p.answer[0]]}ます分！`);
      setShown(99); return;
    }
    setTries((t) => t + 1);
    setMsg(tries >= 1 ? "「かぞえる」で ばんごうを つけて くらべてみよう。三角 2つで 1ます だよ" : "おしい！ もういちど くらべてみよう");
  };
  const count4 = () => { sfx.tap(); stopCount(); setShown(99); setMsg("ばんごうを つけたよ。三角は 2つで 1つの ばんごう だよ"); };

  const next = () => {
    sfx.tap();
    const perfect = tries === 0 ? 1 : 0;
    gain(1 + perfect);
    setScore((s) => ({ ...s, done: s.done + 1, perfect: s.perfect + perfect }));
    if (pi + 1 >= probs.length) { setFinished(true); onClearStage(stage); setMood("happy"); setMsg("きょうの もんだい ぜんぶ できたね！ ポピーと もっと なかよしに なったよ"); return; }
    setPi(pi + 1); load(probs[pi + 1]);
  };
  const again = () => { const ps = makeSet(stage); if (import.meta.env.DEV) window.__masume = ps; setProbs(ps); setPi(0); setFinished(false); setScore({ done: 0, perfect: 0, gained: 0 }); load(ps[0]); };

  if (finished) {
    return (
      <div className="ts-wrap">
        <FairyGuide fairy={MASUME_FAIRY} text={msg} mood="happy" />
        <div className="ts-card ts-done">
          <div className="ts-done-title">{MSTAGES[stage - 1].icon} {MSTAGES[stage - 1].name} クリア！</div>
          <div>できた もんだい：<b>{score.done}もん</b></div>
          <div>1かいめで ぴったり：<b>{score.perfect}もん</b></div>
          <div className="ts-done-gain">💗 ポピーの なかよし度 <b>+{score.gained}</b></div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); again(); }}>もういちど ♪</button>
      </div>
    );
  }

  const goal = p.stage === 1 ? "この 花だんは 何ます分？" : p.stage === 2 ? "三角を あわせて、何ます分か かぞえよう" : p.stage === 3 ? "うごかして 四角に してから、何ます分か かぞえよう" : p.goal;

  return (
    <div className="ts-wrap ms-wrap">
      <div className="ts-head">
        <span className="ts-stage-tag ms-stage-tag">{MSTAGES[stage - 1].icon} {MSTAGES[stage - 1].name}　{pi + 1} / {probs.length}</span>
        {gainFx && <span className="ts-gain" key={gainFx.id}>💗 +{gainFx.n}</span>}
      </div>
      <div className="ts-goal" role="status">
        <span className="ts-goal-icon" aria-hidden="true">🎯</span>
        <span className="ts-goal-text"><small>ゴール</small>{goal}</span>
      </div>
      <FairyGuide fairy={MASUME_FAIRY} text={msg} mood={mood} />

      {p.stage < 4 && (
        <div className="ms-box">
          <MasumeField W={FIELD.W} H={FIELD.H} fixed={p.fixed} pieces={pieces} glow={glow}
            onPieces={p.stage > 1 && phase === "play" ? onPieces : undefined} onDragState={setDragging}
            labels={labels} shown={shown}
            taps={p.stage === 1 ? taps : null}
            onCellTap={p.stage === 1 && phase === "play" ? (k) => { if (taps[k]) return; sfx.tap(); const n = Object.keys(taps).length + 1; setTaps({ ...taps, [k]: n }); if (n === p.area) setMsg(`${n}まで かぞえたね！ 何ます分か こたえてね`); } : undefined} />
        </div>
      )}
      {p.stage === 4 && (
        <div className={"ms-cards ms-cards-" + p.shapes.length}>
          {p.shapes.map((s, i) => {
            const xs = s.map((t) => t.x), ys = s.map((t) => t.y), W = Math.max(...xs) + 1, H = Math.max(...ys) + 1;
            return (
              <button key={i} className={"ms-card" + (sel.includes(i) ? " ms-card-on" : "") + (phase === "done" && p.answer.includes(i) ? " ms-card-right" : "")} onClick={() => toggle(i)} aria-pressed={sel.includes(i)}>
                <span className="ms-card-letter">{LETTERS[i]}</span>
                <MasumeField W={Math.max(W, 3)} H={Math.max(H, 3)} fixed={s} C={26} small labels={shown ? countLabels(s) : []} shown={shown} />
                {phase === "done" && <span className="ms-card-area">{p.areas[i]}ます分</span>}
              </button>
            );
          })}
        </div>
      )}

      {p.stage < 4 && phase === "play" && (
        <div className="jc-acts">
          {p.stage === 1 && <button className="ts-act" disabled={!Object.keys(taps).length} onClick={() => { sfx.tap(); setTaps({}); setMsg("はじめから かぞえなおそう"); }}>かぞえなおす</button>}
          {p.stage > 1 && <button className="ts-act" disabled={dragging} onClick={() => { sfx.tap(); setPieces(p.pieces); setLabels([]); setShown(0); setMsg("はじめの 形に もどしたよ"); }}>↩ もとに もどす</button>}
          {p.stage === 3 && <button className={"ts-act ts-act-back" + (glow ? " ms-hint-on" : "")} onClick={() => { sfx.tap(); setGlow(true); setMsg("どこを うごかすと いいかな？ 光って いる ところを うごかしてみよう"); }}>💡 ヒント</button>}
          {p.stage > 1 && <button className="ts-act ts-act-main" disabled={dragging} onClick={count23}>かぞえる</button>}
        </div>
      )}
      {p.stage < 4 && phase === "play" && (
        <AmountPad units={[UNIT]} value={ans} active={UNIT} onActive={() => {}} onChange={setAns} onSubmit={submit} />
      )}
      {p.stage === 4 && phase === "play" && (
        <div className="jc-acts">
          <button className="ts-act" onClick={count4}>かぞえる</button>
          <button className="ts-act ts-act-main" disabled={sel.length !== p.answer.length} onClick={check4}>{p.answer.length === 2 ? "この 2つ！" : "これ！"}</button>
        </div>
      )}
      {phase === "done" && (
        <div className="jc-acts">
          <button className="ts-act ts-act-main" onClick={next}>{pi + 1 >= probs.length ? "おわる" : "つぎの もんだい"} →</button>
        </div>
      )}
    </div>
  );
}
export { unkey };
