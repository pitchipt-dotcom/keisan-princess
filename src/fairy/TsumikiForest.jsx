/* =====================================================================
   妖精の国 — つみきの森（小2：つみきを ころがして、紙に ついた マスに 色が つく）
   時間は はからない。まちがえても バツで 止めない
   ルールは テストと 同じ：盤の そとには ころがせない／1ど 色が ついた マスには もう ころがせない
   だんかい（立方体＝さいころ・直方体＝2こ つなげた つみき の どちらでも）
     1 じゆうに ころがす … ゴール「ぜんぶの マスに 色を つけよう！」。行きどまったら「はじめから」
     2 よそうして ころがす … おてがみ（しじ）を 見て、色が つく マスを ぜんぶ えらぶ → じぶんで ころがして こたえあわせ
     3 もようから かんがえる … ★の つみきで 点線の マスを ぜんぶ ぬる じゅんばんを 入れる → ころがして たしかめる。「ゴールから もどる」も ある
   盤は 正方形のほか、L字・T字・かいだん・すき間の ある 形（じっさいに ころがして 作るので、かならず ぬれる）
   見せ方：メインは ななめ上から 見た 3D、よこに 真上から 見た 盤（同じ うごきを 同時に）。小さい ほうを タップすると 入れかわる
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import Tsumiki3D from "./Tsumiki3D.jsx";
import { TopGrid, RollLog, PoseBadge } from "./TopGrid.jsx";
import {
  DIRS, KINDS, tryRoll, legalDirs, boardSet, footprint, fkeys, sameBlock, NUM,
  makeSet, checkPrediction, checkOrder, reverseMoves,
} from "./tsumiki.js";
import { FAIRIES, GUIDE_FAIRY } from "./fairy.js";
import { fairyArt } from "../assets/fairy/index.js";

export const STAGES = [
  { no: 1, name: "じゆうに ころがす", goal: "ぜんぶの マスに 色を つけよう！", desc: "1ど 通った マスには もう いけないよ", icon: "🎲" },
  { no: 2, name: "よそうして ころがす", goal: "ころがすと 色が つく マスを ぜんぶ えらぼう", desc: "おてがみの じゅんに ころがすと どこに 色が つく？", icon: "🔮" },
  { no: 3, name: "もようから かんがえる", goal: "★の つみきを ころがして、点線の マスを ぜんぶ ぬろう", desc: "ころがす じゅんばんを かんがえよう", icon: "🧩" },
];
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const PRAISE_ALL = ["ぜんぶ ぬれた！ すごい！", "やったね！ 盤が ぜんぶ 色で いっぱい！", "できた！ じょうずに ころがせたね！"];
const PRAISE_OK = ["ぴったり！ よそうどおり だったね！", "すごい！ あたまの 中で ころがせたね！", "ばっちり！ ミントも びっくり！"];
const PRAISE_ORDER = ["点線の マスが ぜんぶ ぬれた！ じゅんばん 名人だね！", "できた！ もようと そっくり！", "すごい！ じゅんばんが 見えたんだね！"];

/* ---- 案内役の 妖精（仮の SVG。src/assets/fairy/ の 絵を さしかえ できる） ---- */
/* full：全身（地図・エリアの 画面）。ふだんは 顔が 見える 上半身（-bust）を まるい わくで */
export function FairyGuide({ text, mood, fairy = GUIDE_FAIRY, full = false }) {
  const art = (!full && fairyArt("fairy-" + fairy + "-bust")) || fairyArt("fairy-" + fairy);
  return (
    <div className={"ts-fairy" + (full ? " ts-fairy-full" : "")}>
      <div className={"ts-fairy-pic" + (mood === "happy" ? " ts-fairy-happy" : "") + (!full && art ? " ts-fairy-bust" : "")}>
        {art ? <img src={art} alt={FAIRIES[fairy].name} /> : <span aria-hidden="true">🧚</span>}
      </div>
      <div className={"ts-bubble ts-bubble-" + fairy} key={text}><b>{FAIRIES[fairy].name}</b>{text}</div>
    </div>
  );
}

export function DirPad({ onDir, disabled, highlight }) {
  const btn = (d) => (
    <button key={d} className={"ts-dir ts-dir-" + d + (highlight === d ? " ts-dir-hi" : "")} disabled={disabled} onClick={() => onDir(d)} aria-label={DIRS[d].label + "へ ころがす"}>
      <span className="ts-dir-arrow">{DIRS[d].arrow}</span>{DIRS[d].label}
    </button>
  );
  return <div className="ts-pad">{btn("oku")}{btn("hidari")}{btn("temae")}{btn("migi")}</div>;
}

/* 手じゅんの ならび（おてがみ・きみの じゅんばん・こたえ）。now の 手を 光らせる */
function StepList({ moves, slots, now = -1, done, fail = -1, empty = "？" }) {
  return (
    <ol className="ts-steps">
      {Array.from({ length: slots || moves.length }, (_, i) => {
        const d = moves[i];
        const cls = "ts-step" + (i === now ? " ts-step-now" : "") + (done != null && i < done ? " ts-step-done" : "") + (i === fail ? " ts-step-fail" : "") + (d ? "" : " ts-step-empty");
        return (
          <li key={i} className={cls}>
            <span className="ts-step-no">{NUM(i + 1)}</span>{d ? <><span className="ts-step-arrow">{DIRS[d].arrow}</span>{DIRS[d].label}</> : empty}
          </li>
        );
      })}
    </ol>
  );
}

const stampOf = (no, b) => ({ no, cells: footprint(b), pose: b.pose, kind: b.kind });
const initBoard = (start, withStamp = true) => ({ block: start, from: null, roll: null, stamps: withStamp ? [stampOf(1, start)] : [], moves: [], busy: false });
const paintedOf = (stamps) => new Set(stamps.flatMap((s) => s.cells.map(([x, y]) => `${x},${y}`)));

export function TsumikiForest({ stage, kind = "cube", sfx, onGain, onClearStage }) {
  const [probs, setProbs] = useState(() => makeSet(stage, kind));
  const [pi, setPi] = useState(0);
  const p = probs[pi];
  const [board, setBoardState] = useState(() => initBoard(probs[0].start, stage !== 3));
  const bref = useRef(board);
  const setBoard = (b) => { bref.current = b; setBoardState(b); };
  const rollId = useRef(0);
  const afterRoll = useRef(null);
  const [glFail, setGlFail] = useState(false);
  const [big, setBig] = useState("3d");
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState(null);
  const [gainFx, setGainFx] = useState(null);
  // 1: play | done | stuck ／ 2: predict | roll | result ／ 3: input | check | result | back | backDone | backStuck
  const [phase, setPhase] = useState("play");
  const [predicted, setPredicted] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [seq, setSeq] = useState([]);
  const [failIdx, setFailIdx] = useState(-1);         // だんかい3：うまく ころがせなかった 手（きみの じゅんばんで ピンクに）
  const [tries, setTries] = useState(0);
  const [restarts, setRestarts] = useState(0);
  const [usedBack, setUsedBack] = useState(false);
  const [score, setScore] = useState({ done: 0, perfect: 0, gained: 0 });
  const [finished, setFinished] = useState(false);
  const toldMiddle = useRef(false);
  const kindName = KINDS[kind].name;
  const onBoard = boardSet(p.board);

  /* ---------- ころがす（3D の アニメーションが おわったら 紙に 色が つく） ---------- */
  const doRoll = (dir, { stampNo, onDone } = {}) => {
    const b = bref.current;
    if (b.busy) return "busy";
    const r = tryRoll(b.block, dir, onBoard, paintedOf(b.stamps));
    if (!r.block) return r.why;
    const nb = r.block;
    rollId.current += 1;
    setBoard({ ...b, from: b.block, block: nb, roll: { id: rollId.current, dir }, busy: true });
    afterRoll.current = () => {
      const cur = bref.current;
      setBoard({ ...cur, busy: false, stamps: [...cur.stamps, stampOf(stampNo || cur.stamps.length + 1, nb)], moves: [...cur.moves, dir] });
      sfx.tap();
      onDone && onDone();
    };
    if (glFail) setTimeout(() => onRollEnd(), 160);
    return "ok";
  };
  const onRollEnd = () => { const f = afterRoll.current; afterRoll.current = null; if (f) f(); };

  const gain = (n, why) => {
    if (n <= 0) return;
    onGain(n);
    setScore((s) => ({ ...s, gained: s.gained + n }));
    setGainFx({ n, why, id: Date.now() });
  };

  /* ---------- はじめる ---------- */
  const startSet = () => {
    const ps = makeSet(stage, kind);
    if (import.meta.env.DEV) window.__tsumiki = ps;          // ブラウザ テスト用（本番には 入らない）
    setFinished(false); setScore({ done: 0, perfect: 0, gained: 0 });
    setProbs(ps); setPi(0); loadProblem(ps[0], 0);
  };
  const loadProblem = (q, idx) => {
    setResult(null); setTries(0); setRestarts(0); setUsedBack(false); setMood(null); setSeq([]); setFailIdx(-1);
    if (q.stage === 1) {
      setBoard(initBoard(q.start)); setPhase("play"); setBig("3d");
      setMsg(idx === 0
        ? `${kindName}を ころがして、盤の マスを ぜんぶ ぬろう。1ど 色が ついた マスには もう ころがせないよ`
        : "あたらしい かたちの 盤だよ。どこから まわると ぜんぶ ぬれるかな？");
    } else if (q.stage === 2) {
      setBoard(initBoard(q.start)); setPredicted(new Set()); setPhase("predict"); setBig("2d");
      if (!toldMiddle.current) {       // さいしょに 1かいだけ（よそうを 1かい おえたら もう 言わない）
        setMsg("さいごの マスだけじゃなくて、とちゅうの マスも ぜんぶだよ。①の マスは はじめから 色が ついているよ");
      } else setMsg("おてがみの じゅんに ころがすと、どの マスに 色が つくかな？ マスを タップして えらんでね");
    } else {
      setBoard(initBoard(q.start, false)); setPhase("input"); setBig("3d");
      setMsg("点線の マスを ぜんぶ ぬるには、どの じゅんばんで ころがす？ むきの ボタンで 入れてね");
    }
  };
  useEffect(() => {
    if (import.meta.env.DEV) window.__tsumiki = probs;
    loadProblem(probs[0], 0);
    /* eslint-disable-next-line */
  }, []);

  /* ---------- だんかい1 ---------- */
  const restart1 = () => {
    sfx.tap(); setRestarts((n) => n + 1);
    setBoard(initBoard(p.start)); setPhase("play"); setMood(null);
    setMsg("はじめから！ こんどは ちがう じゅんで ためしてみよう");
  };
  const after1 = () => {
    const cur = bref.current, painted = paintedOf(cur.stamps);
    if (painted.size === onBoard.size) {
      setPhase("done"); setMood("happy"); sfx.correct(); setMsg(pickOne(PRAISE_ALL)); return;
    }
    if (!legalDirs(cur.block, onBoard, painted).length) {
      setPhase("stuck"); setMood(null);
      setMsg(`いきどまり！ どこにも ころがせないね。のこりは ${onBoard.size - painted.size}マス。「はじめから」で もういちど やってみよう`); return;
    }
    if (cur.moves.length === 1 && kind === "cuboid") setMsg(cur.block.pose === "stand" ? "たったよ！ 紙に つくのは 1マス" : "ころん！ ねると 紙に つくのは 2マス。2マスとも 色が つくよ");
    else if (cur.moves.length === 1) setMsg("ころん！ ついた マスに 色が ついたね。下の きろくにも ①→② と ならぶよ");
  };

  /* ---------- だんかい2 ---------- */
  const startK = fkeys(p.start);
  const wantN = stage === 2 ? p.cells.length - startK.length : 0;
  const tapCell = (k) => {
    if (stage !== 2 || phase !== "predict" || startK.includes(k)) return;
    sfx.tap();
    const ns = new Set(predicted); if (ns.has(k)) ns.delete(k); else ns.add(k);
    setPredicted(ns);
  };
  const startRoll2 = () => {
    toldMiddle.current = true;
    sfx.tap(); setPhase("roll"); setBig("3d");
    setMsg(`よそう できたね！ こんどは おてがみの じゅんに ころがそう。${NUM(1)}は「${DIRS[p.moves[0]].label}」`);
  };
  const finish2 = () => {
    const r = checkPrediction(p, predicted);
    setResult(r); setPhase("result"); setBig("2d");
    if (r.ok) { sfx.correct(); setMood("happy"); setMsg(pickOne(PRAISE_OK)); return; }
    if (r.missed.length && !r.extra.length) setMsg("おしい！ ピンクの「!」の マスにも 色が ついたよ。とちゅうの マスも ぜんぶ だよ");
    else if (!r.missed.length) setMsg("おしい！ グレーの 点線の 〇の マスには 色が つかなかったね");
    else setMsg("おしい！ ピンクの「!」が たりない マス、グレーの 〇が よけいな マスだよ。①②③の じゅんに たどってみよう");
  };

  /* ---------- だんかい3 ---------- */
  const runCheck = (moves) => {
    sfx.tap();
    setTries((t) => t + 1);
    setBoard(initBoard(p.start)); setPhase("check"); setBig("3d"); setResult(null); setFailIdx(-1);
    setMsg("きみの じゅんばんで ころがして たしかめるよ…");
    let i = 0;
    const next = () => {
      if (i >= moves.length) { finish3(moves); return; }
      const d = moves[i++];
      const r = doRoll(d, { onDone: () => setTimeout(next, 220) });
      if (r === "out" || r === "visited") finish3(moves, i, r);
    };
    setTimeout(next, 300);
  };
  const finish3 = (moves, failStep, why) => {
    const r = checkOrder(p, moves);
    setResult(r); setPhase("result"); setBig("2d");
    if (r.ok) { sfx.correct(); setMood("happy"); setMsg(pickOne(PRAISE_ORDER)); return; }
    if (failStep) {
      setFailIdx(failStep - 1);
      const step = `きみの じゅんばんの ${NUM(failStep)}（${DIRS[moves[failStep - 1]].label}）`;
      setMsg(why === "visited" ? `${step}で、もう 色が ついた マスに もどっちゃうね。じゅんばんを かえてみよう`
        : `${step}で、盤の そとに 出ちゃうね。じゅんばんを かえてみよう`);
    }
    else setMsg("おしい！ まだ ぬれて いない 点線の マスが あるよ。「ゴールから もどる」で たしかめても いいよ");
  };
  const total3 = stage === 3 ? p.moves.length + 1 : 0;      // ぬる 回数（スタートも ふくむ）
  const startBack = () => {
    sfx.tap();
    rollId.current += 1;
    setBoard({ block: p.goal, from: null, roll: null, stamps: [stampOf(total3, p.goal)], moves: [], busy: false });
    setPhase("back"); setBig("3d"); setResult(null); setUsedBack(true); setMood(null);
    setMsg(`ゴール（${NUM(total3)}）に いるよ。点線の マスの 上を ころがって、スタートまで もどろう`);
  };
  const afterBack = () => {
    const cur = bref.current, painted = paintedOf(cur.stamps);
    if (painted.size === onBoard.size && sameBlock(cur.block, p.start)) {
      setPhase("backDone"); setMood("happy"); sfx.correct();
      setMsg("スタートに もどれた！ もどった じゅんばんを ぎゃくに すると、こたえに なるよ"); return;
    }
    if (!legalDirs(cur.block, onBoard, painted).length) { setPhase("backStuck"); setMsg("ここで 行きどまり。ゴールから もういちど もどってみよう"); return; }
    setMsg("その ちょうし！ 点線の マスを たどろう");
  };

  /* ---------- むきの ボタン・スワイプ ---------- */
  const onDir = (d) => {
    if (bref.current.busy) return;
    if (stage === 1 && phase === "play") {
      const r = doRoll(d, { onDone: after1 });
      if (r === "out") { sfx.tap(); setMsg("そっちは 盤の そとだよ。ほかの むきに ころがしてみよう"); }
      if (r === "visited") { sfx.tap(); setMsg("そこは もう 色が ついているよ。1ど 通った マスには いけないんだ"); }
      return;
    }
    if (stage === 2 && phase === "roll") {
      const want = p.moves[bref.current.moves.length];
      if (d !== want) { sfx.tap(); setMsg(`おてがみの ${NUM(bref.current.moves.length + 1)}は「${DIRS[want].label}」だよ`); return; }
      doRoll(d, { onDone: () => {
        const n = bref.current.moves.length;
        if (n >= p.moves.length) finish2();
        else setMsg(`いいね！ ${NUM(n + 1)}は「${DIRS[p.moves[n]].label}」`);
      } });
      return;
    }
    if (stage === 3 && phase === "input") {
      if (seq.length >= p.moves.length) { setMsg(`こたえは ${p.moves.length}かい ころがすよ。「1つ けす」で なおしてね`); return; }
      sfx.tap(); setSeq([...seq, d]); return;
    }
    if (stage === 3 && phase === "back") {
      const r = doRoll(d, { stampNo: total3 - bref.current.moves.length - 1, onDone: afterBack });
      if (r === "out") { sfx.tap(); setMsg("そっちは 点線の マスが ないよ。点線の マスを たどろう"); }
      if (r === "visited") { sfx.tap(); setMsg("そこは もう もどった マスだよ"); }
    }
  };
  const swipe = useRef(null);
  const padOK = (stage === 1 && phase === "play") || (stage === 2 && phase === "roll") || (stage === 3 && (phase === "input" || phase === "back"));
  const onDown = (e) => { swipe.current = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!swipe.current || !padOK) return;
    const dx = e.clientX - swipe.current[0], dy = e.clientY - swipe.current[1]; swipe.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "migi" : "hidari") : (dy > 0 ? "temae" : "oku"));
  };

  /* ---------- つぎの もんだい ---------- */
  const nextProblem = () => {
    sfx.tap();
    // ぴったり ボーナス：1は はじめから やりなおさずに、2は よそうが ぴったり、3は 1かいめで ぴったり（ゴールから もどるを つかわずに）
    const ok = stage === 1 ? phase === "done" : result && result.ok;
    const perfect = ok && (stage === 1 ? restarts === 0 : stage === 2 || (tries <= 1 && !usedBack)) ? 1 : 0;
    gain(1 + perfect, perfect ? "ぴったり ボーナス" : "1もん できた");
    setScore((s) => ({ ...s, done: s.done + 1, perfect: s.perfect + perfect }));
    if (pi + 1 >= probs.length) { setFinished(true); onClearStage(stage); setMood("happy"); setMsg("きょうの もんだい ぜんぶ できたね！ ミントと もっと なかよしに なったよ"); return; }
    setPi(pi + 1); loadProblem(probs[pi + 1], pi + 1);
  };
  const retry3 = () => {
    sfx.tap(); setBoard(initBoard(p.start, false)); setPhase("input"); setBig("3d"); setResult(null); setMood(null); setFailIdx(-1);
    setMsg("点線の マスを よく 見て、じゅんばんを 入れなおしてみよう");
  };

  /* ---------- 表示 ---------- */
  const painted = paintedOf(board.stamps);
  const pattern = stage === 3 ? p.pattern : [];
  const block2d = board.busy && board.from ? board.from : board.block;
  const startTag = stage === 3 && (phase === "input" || phase === "result") ? p.start : null;
  const viewLabel = { "3d": "ななめから", "2d": "うえから" };
  const bigNow = glFail ? "2d" : big;          // 3D が 出せない そうちは うえからの 図を 大きく
  const view = (k) => {
    const isBig = bigNow === k;
    const cls = "ts-view" + (isBig ? " ts-big" : " ts-small");
    const swap = isBig ? undefined : () => { sfx.tap(); setBig(k); };
    return (
      <div className={cls} onClick={swap} onPointerDown={isBig ? onDown : undefined} onPointerUp={isBig ? onUp : undefined}>
        {k === "3d"
          ? <Tsumiki3D board={p.board} block={board.block} from={board.from} roll={board.roll} stamps={board.stamps} pattern={pattern} startTag={startTag}
            onRollEnd={onRollEnd} onFail={() => { setGlFail(true); setBig("2d"); }} />
          : <TopGrid board={p.board} block={block2d} stamps={board.stamps} pattern={pattern} startTag={startTag}
            predicted={stage === 2 ? predicted : null} result={stage === 2 && phase === "result" ? result : null}
            onCellTap={isBig && stage === 2 && phase === "predict" ? tapCell : undefined} showLabels={isBig} small={!isBig} />}
        <span className="ts-view-cap">{viewLabel[k]}{!isBig && <small>タップで 大きく</small>}</span>
      </div>
    );
  };

  if (finished) {
    return (
      <div className="ts-wrap">
        <FairyGuide text={msg} mood="happy" />
        <div className="ts-card ts-done">
          <div className="ts-done-title">{STAGES[stage - 1].icon} {STAGES[stage - 1].name} クリア！</div>
          <div className="ts-done-kind">{KINDS[kind].icon} {kindName}</div>
          <div>できた もんだい：<b>{score.done}もん</b></div>
          <div>{stage === 1 ? "やりなおさずに ぬれた" : stage === 2 ? "よそうが ぴったり" : "1かいめで ぴったり"}：<b>{score.perfect}もん</b></div>
          <div className="ts-done-gain">💗 ミントの なかよし度 <b>+{score.gained}</b></div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); startSet(); }}>もういちど ♪</button>
      </div>
    );
  }

  const goalSub = stage === 1 ? `のこり ${onBoard.size - painted.size}マス` : stage === 3 ? `ぬる マス ${onBoard.size}こ` : null;
  const showPad = stage !== 2 || phase === "roll";           // だんかい2：よそうが おわるまで むきの ボタンは 出さない
  const backTitle = phase === "back" || phase === "backDone" || phase === "backStuck";

  return (
    <div className="ts-wrap">
      <div className="ts-head">
        <span className="ts-stage-tag">{STAGES[stage - 1].icon} {STAGES[stage - 1].name}　{pi + 1} / {probs.length}</span>
        <span className="ts-kind-tag">{KINDS[kind].icon} {KINDS[kind].sub}</span>
        {gainFx && <span className="ts-gain" key={gainFx.id}>💗 +{gainFx.n}</span>}
      </div>
      <div className="ts-goal" role="status">
        <span className="ts-goal-icon" aria-hidden="true">🎯</span>
        <span className="ts-goal-text"><small>ゴール</small>{STAGES[stage - 1].goal}</span>
        {goalSub && <span className="ts-goal-sub">{goalSub}</span>}
      </div>
      <FairyGuide text={msg} mood={mood} />

      <div className={"ts-views" + (glFail ? " ts-nogl" : "")}>
        {!glFail && view("3d")}
        {view("2d")}
      </div>
      {kind === "cuboid" && <PoseBadge block={block2d} />}
      {glFail && <div className="ts-note">この そうちでは ななめの 図が 出せないので、うえから 見た 図で あそぼう</div>}

      {stage === 2 && (
        <div className="ts-letter" aria-label="おてがみ">
          <div className="ts-letter-head"><span aria-hidden="true">✉️</span> おてがみ <small>この じゅんばんで ころがすよ</small></div>
          <StepList moves={p.moves} now={phase === "roll" ? board.moves.length : -1} done={phase === "predict" ? null : board.moves.length} />
          {phase === "predict" && (
            <div className="ts-count">えらんだ マス <b>{predicted.size}</b> / {wantN}こ
              <span className="ts-count-note">（{NUM(1)}は はじめから 色つき）</span></div>
          )}
          {phase === "result" && result && (
            <div className="ts-legend">
              <span className="lg-hit">あたり {result.hit.length}</span>
              <span className="lg-miss">! たりない {result.missed.length}</span>
              <span className="lg-extra">〇 よけい {result.extra.length}</span>
            </div>
          )}
        </div>
      )}
      {stage === 3 && (phase === "input" || phase === "check" || phase === "result") && (
        <div className="ts-mine" aria-label="きみの じゅんばん">
          <div className="ts-mine-head">✏️ きみの じゅんばん <small>{p.moves.length}かい ころがすよ</small></div>
          <StepList moves={seq} slots={p.moves.length} now={phase === "check" ? board.moves.length : phase === "input" ? seq.length : -1}
            done={phase === "check" ? board.moves.length : null} fail={phase === "result" ? failIdx : -1} />
        </div>
      )}
      {stage === 3 && phase === "backDone" && (
        <div className="ts-mine ts-mine-answer" aria-label="こたえ">
          <div className="ts-mine-head">💡 もどった じゅんばんを ぎゃくに すると…</div>
          <StepList moves={reverseMoves(board.moves)} />
        </div>
      )}

      <div className="ts-ctrl">
        {showPad && <DirPad onDir={onDir} disabled={board.busy || !padOK} highlight={stage === 2 && phase === "roll" ? p.moves[board.moves.length] : null} />}
        <div className="ts-actions">
          {stage === 1 && phase !== "done" && <button className={"ts-act" + (phase === "stuck" ? " ts-act-main" : "")} disabled={board.busy || !board.moves.length} onClick={restart1}>はじめから</button>}
          {stage === 1 && phase === "done" && <button className="ts-act ts-act-main" onClick={nextProblem}>{pi + 1 >= probs.length ? "おわる" : "つぎの かたち"} →</button>}
          {stage === 2 && phase === "predict" && <>
            <button className="ts-act ts-act-main ts-act-wide" disabled={!predicted.size} onClick={startRoll2}>よそう できた！ ころがして たしかめる</button>
            <button className="ts-act" disabled={!predicted.size} onClick={() => { sfx.tap(); setPredicted(new Set()); }}>えらびなおす</button>
          </>}
          {stage === 3 && phase === "input" && <>
            <button className="ts-act ts-act-main" disabled={!seq.length} onClick={() => runCheck(seq)}>ころがして<br />たしかめる</button>
            <button className="ts-act" disabled={!seq.length} onClick={() => { sfx.tap(); setSeq(seq.slice(0, -1)); }}>1つ けす</button>
            <button className="ts-act ts-act-back" onClick={startBack}>ゴールから もどる</button>
          </>}
          {stage === 3 && phase === "back" && <button className="ts-act" disabled={board.busy} onClick={retry3}>やめる</button>}
          {stage === 3 && phase === "backStuck" && <button className="ts-act ts-act-main" onClick={startBack}>ゴールから もういちど</button>}
          {stage === 3 && phase === "backDone" && <button className="ts-act ts-act-main" onClick={() => { const f = reverseMoves(bref.current.moves); setSeq(f); runCheck(f); }}>この じゅんばんで<br />たしかめる</button>}
          {stage > 1 && phase === "result" && <>
            {stage === 3 && !result.ok && <button className="ts-act" onClick={retry3}>もういちど<br />かんがえる</button>}
            {stage === 3 && !result.ok && <button className="ts-act ts-act-back" onClick={startBack}>ゴールから もどる</button>}
            <button className="ts-act ts-act-main" onClick={nextProblem}>{pi + 1 >= probs.length ? "おわる" : "つぎの もんだい"} →</button>
          </>}
        </div>
      </div>

      <RollLog stamps={board.stamps} moves={board.moves.map((d) => DIRS[d].label)} title={backTitle ? "もどった じゅんばん" : "ころがした きろく"} />
    </div>
  );
}
