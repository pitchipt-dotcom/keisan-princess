/* =====================================================================
   妖精の国 — つみきの森（小2：つみきを ころがして、紙に ついた マスに 色が つく）
   時間は はからない。まちがえても バツで 止めない
   だんかい（今回は 立方体だけ）
     1 じゆうに ころがす … すきに ころがして 色が つくのを 見る
     2 よそうして ころがす … しじ（みぎ→みぎ→てまえ など）を 見て、色が つく マスを タップで よそう → じぶんで ころがして こたえあわせ
     3 もようから かんがえる … できあがった もようを 見て じゅんばんを 入れる → ころがして たしかめる。「ゴールから もどる」も ある
   見せ方：メインは ななめ上から 見た 3D、よこに 真上から 見た マス目（同じ うごきを 同時に）。小さい ほうを タップすると 入れかわる
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import Tsumiki3D from "./Tsumiki3D.jsx";
import { TopGrid, RollLog, PoseBadge } from "./TopGrid.jsx";
import {
  GRID, DIRS, cube, roll as rollBlock, inBounds, footprint, key, NUM, stampColor,
  makeRollProblem, makePatternProblem, checkPrediction, checkOrder, reverseMoves, backStart, backStep, backDone,
} from "./tsumiki.js";
import { FAIRIES, GUIDE_FAIRY } from "./fairy.js";
import { fairyArt } from "../assets/fairy/index.js";

export const STAGES = [
  { no: 1, name: "じゆうに ころがす", desc: "すきな ほうへ ころがして、色が つくのを 見よう", icon: "🎲" },
  { no: 2, name: "よそうして ころがす", desc: "どの マスに 色が つくか よそうしてから ころがそう", icon: "🔮" },
  { no: 3, name: "もようから かんがえる", desc: "できあがった もようの じゅんばんを 当てよう", icon: "🧩" },
];
const PER_SET = 3;
const LENS = { 2: [2, 3, 4], 3: [3, 4, 5] };
const FREE_REWARD_AT = 8;            // じゆうに ころがす：8かい ころがしたら なかよし度 +1（1回 入るごとに 1かい）
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
const PRAISE_OK = ["ぴったり！ よそうどおり だったね！", "すごい！ あたまの 中で ころがせたね！", "ばっちり！ ミントも びっくり！"];
const PRAISE_ORDER = ["もようと ぴったり！ じゅんばん 名人だね！", "できた！ もようが そっくり！", "すごい！ じゅんばんが 見えたんだね！"];

/* ---- 案内役の 妖精（仮の SVG。src/assets/fairy/ の 絵を さしかえ できる） ---- */
export function FairyGuide({ text, mood }) {
  const art = fairyArt("fairy-" + GUIDE_FAIRY);
  return (
    <div className="ts-fairy">
      <div className={"ts-fairy-pic" + (mood === "happy" ? " ts-fairy-happy" : "")}>
        {art ? <img src={art} alt={FAIRIES[GUIDE_FAIRY].name} /> : <span aria-hidden="true">🧚</span>}
      </div>
      <div className="ts-bubble" key={text}><b>{FAIRIES[GUIDE_FAIRY].name}</b>{text}</div>
    </div>
  );
}

function DirPad({ onDir, disabled, highlight }) {
  const btn = (d) => (
    <button key={d} className={"ts-dir ts-dir-" + d + (highlight === d ? " ts-dir-hi" : "")} disabled={disabled} onClick={() => onDir(d)} aria-label={DIRS[d].label + "へ ころがす"}>
      <span className="ts-dir-arrow">{DIRS[d].arrow}</span>{DIRS[d].label}
    </button>
  );
  return <div className="ts-pad">{btn("oku")}{btn("hidari")}{btn("temae")}{btn("migi")}</div>;
}

const initBoard = (start, withStamp = true) => ({ block: start, from: start, roll: null, stamps: withStamp ? [{ no: 1, cells: footprint(start) }] : [], moves: [], busy: false });

export function TsumikiForest({ stage, sfx, onGain, onClearStage, onExit }) {
  const [board, setBoardState] = useState(() => initBoard(cube(2, 2)));
  const bref = useRef(board);
  const setBoard = (b) => { bref.current = b; setBoardState(b); };
  const rollId = useRef(0);
  const afterRoll = useRef(null);
  const [glFail, setGlFail] = useState(false);
  const [big, setBig] = useState("3d");
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState(null);
  const [gainFx, setGainFx] = useState(null);

  // だんかい1
  const freeCount = useRef(0);
  const freeRewarded = useRef(false);
  // だんかい2・3（1セット 3もん）
  const [probs, setProbs] = useState([]);
  const [pi, setPi] = useState(0);
  const [phase, setPhase] = useState("predict");     // 2: predict | roll | result ／ 3: input | check | result | back | backDone
  const [predicted, setPredicted] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [seq, setSeq] = useState([]);
  const [tries, setTries] = useState(0);
  const [usedBack, setUsedBack] = useState(false);
  const [back, setBack] = useState(null);
  const [score, setScore] = useState({ done: 0, perfect: 0, gained: 0 });
  const [finished, setFinished] = useState(false);
  const p = probs[pi];

  /* ---------- ころがす（3D の アニメーションが おわったら 紙に 色が つく） ---------- */
  const doRoll = (dir, { stampNo, onDone } = {}) => {
    const b = bref.current;
    if (b.busy) return "busy";
    const nb = rollBlock(b.block, dir);
    if (!inBounds(nb, GRID)) return "out";
    rollId.current += 1;
    setBoard({ ...b, from: b.block, block: nb, roll: { id: rollId.current, dir }, busy: true });
    afterRoll.current = () => {
      const cur = bref.current;
      setBoard({ ...cur, busy: false, from: nb, stamps: [...cur.stamps, { no: stampNo || cur.stamps.length + 1, cells: footprint(nb) }], moves: [...cur.moves, dir] });
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
    setFinished(false); setScore({ done: 0, perfect: 0, gained: 0 });
    if (stage === 1) {
      setBoard(initBoard(cube(2, 2))); setBig("3d"); freeCount.current = 0;
      setMsg("すきな ほうへ ころがしてみよう！ つみきが 紙に ついた マスに 色が つくよ"); return;
    }
    const ps = LENS[stage].map((len) => (stage === 2 ? makeRollProblem(len) : makePatternProblem(len)));
    if (import.meta.env.DEV) window.__tsumiki = ps;          // ブラウザ テスト用（本番には 入らない）
    setProbs(ps); setPi(0); loadProblem(ps[0]);
  };
  const loadProblem = (q) => {
    setResult(null); setTries(0); setUsedBack(false); setBack(null); setMood(null);
    if (q.stage === 2) {
      setBoard(initBoard(q.start)); setPredicted(new Set()); setPhase("predict"); setBig("2d");
      setMsg("しじの とおりに ころがすと、どの マスに 色が つくかな？ マスを タップして よそうしてね");
    } else {
      setBoard(initBoard(q.start, false)); setSeq([]); setPhase("input"); setBig("3d");
      setMsg("この もようは、どの じゅんばんで ころがすと できるかな？ むきの ボタンで じゅんばんを 入れてね");
    }
  };
  useEffect(() => { startSet(); /* eslint-disable-next-line */ }, [stage]);

  /* ---------- だんかい2 ---------- */
  const tapCell = (k) => {
    if (stage !== 2 || phase !== "predict" || k === key(p.start.x, p.start.y)) return;
    sfx.tap();
    const ns = new Set(predicted); if (ns.has(k)) ns.delete(k); else ns.add(k);
    setPredicted(ns);
  };
  const startRoll2 = () => {
    sfx.tap(); setPhase("roll"); setBig("3d");
    setMsg(`よそう できたね！ こんどは しじの じゅんに ころがそう。さいしょは「${DIRS[p.moves[0]].label}」`);
  };
  const finish2 = () => {
    const r = checkPrediction(p, predicted);
    setResult(r); setPhase("result"); setBig("2d");
    if (r.ok) { sfx.correct(); setMood("happy"); setMsg(pickOne(PRAISE_OK)); }
    else setMsg(r.missed.length
      ? "おしい！ ピンクの わくの マスにも 色が ついたよ。ころがした じゅんに ①②③と たどってみよう"
      : "おしい！ 点線の 〇の マスには 色が つかなかったね。ころがした じゅんに たどってみよう");
  };

  /* ---------- だんかい3 ---------- */
  const runCheck = (moves) => {
    sfx.tap();
    setTries((t) => t + 1);
    setBoard(initBoard(p.start)); setPhase("check"); setBig("3d"); setResult(null); setBack(null);
    setMsg("ころがして たしかめるよ…");
    let i = 0;
    const next = () => {
      if (i >= moves.length) { finish3(moves); return; }
      const d = moves[i++];
      const r = doRoll(d, { onDone: () => setTimeout(next, 160) });
      if (r === "out") { finish3(moves, i); }
    };
    setTimeout(next, 250);
  };
  const finish3 = (moves, outStep) => {
    const r = checkOrder(p, moves);
    setResult(r); setPhase("result"); setBig("2d");
    if (r.ok) { sfx.correct(); setMood("happy"); setMsg(pickOne(PRAISE_ORDER)); return; }
    setMsg(outStep ? `${outStep}かいめで マスから 出ちゃうね。じゅんばんを かえてみよう`
      : "おしい！ もようと ちがう ところが あるよ。「ゴールから もどる」で たしかめても いいよ");
  };
  const startBack = () => {
    sfx.tap();
    const st = backStart(p);
    rollId.current += 1;
    setBoard({ block: p.goal, from: p.goal, roll: null, stamps: [{ no: p.pattern.length, cells: [[p.goal.x, p.goal.y]] }], moves: [], busy: false });
    setBack(st); setPhase("back"); setBig("3d"); setResult(null); setUsedBack(true);
    setMsg(`ゴール（${NUM(p.pattern.length)}）に いるよ。もようの マスを たどって、スタートまで 1マスずつ もどろう`);
  };

  /* ---------- むきの ボタン・スワイプ ---------- */
  const onDir = (d) => {
    if (bref.current.busy) return;
    if (stage === 1) {
      const r = doRoll(d, { onDone: () => {
        freeCount.current += 1;
        const c = freeCount.current;
        if (c === 1) setMsg("ころん！ ついた マスに 色が ついたね。下の きろくにも ①→② と ならぶよ");
        else if (c === 4) setMsg("ななめの 図と、よこの うえから 見た 図。おなじ うごきを しているね");
        else if (c === FREE_REWARD_AT && !freeRewarded.current) {
          freeRewarded.current = true; setMood("happy");
          setMsg("たくさん ころがしたね！ ミントと なかよしに なったよ"); gain(1, "たくさん ころがした"); onClearStage(1);
        }
      } });
      if (r === "out") { sfx.tap(); setMsg("そっちは マスが ないよ。ほかの むきに ころがしてみよう"); }
      return;
    }
    if (stage === 2 && phase === "roll") {
      const want = p.moves[bref.current.moves.length];
      if (d !== want) { sfx.tap(); setMsg(`つぎの しじは「${DIRS[want].label}」だよ。しじの カードを 見てね`); return; }
      doRoll(d, { onDone: () => {
        const n = bref.current.moves.length;
        if (n >= p.moves.length) finish2();
        else setMsg(`いいね！ つぎは「${DIRS[p.moves[n]].label}」`);
      } });
      return;
    }
    if (stage === 3 && phase === "input") {
      if (seq.length >= p.moves.length) { setMsg(`こたえは ${p.moves.length}かい ころがすよ。けしてから 入れなおしてね`); return; }
      sfx.tap(); setSeq([...seq, d]); return;
    }
    if (stage === 3 && phase === "back") {
      const r = backStep(p, back, d);
      if (!r.ok) { sfx.tap(); setMsg(r.why === "visited" ? "そこは もう もどった マスだよ" : "そっちは もようの ない マスだよ。色の ついた マスを たどろう"); return; }
      setBack(r.state);
      doRoll(d, { stampNo: p.pattern.length - r.state.moves.length, onDone: () => {
        if (backDone(p, r.state)) { setPhase("backDone"); setMood("happy"); sfx.correct(); setMsg("スタートに もどれた！ もどった じゅんばんを ぎゃくに すると、こたえに なるよ"); }
        else setMsg("その ちょうし！ もようの マスを たどろう");
      } });
    }
  };
  const swipe = useRef(null);
  const swipeOK = stage === 1 || (stage === 2 && phase === "roll") || (stage === 3 && (phase === "input" || phase === "back"));
  const onDown = (e) => { swipe.current = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!swipe.current || !swipeOK) return;
    const dx = e.clientX - swipe.current[0], dy = e.clientY - swipe.current[1]; swipe.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "migi" : "hidari") : (dy > 0 ? "temae" : "oku"));
  };

  /* ---------- つぎの もんだい ---------- */
  const nextProblem = () => {
    sfx.tap();
    // ぴったり ボーナス：だんかい2は よそうが ぴったり、だんかい3は 1かいめで ぴったり（ゴールから もどるを つかわずに）
    const perfect = result && result.ok && (stage === 2 || (tries <= 1 && !usedBack)) ? 1 : 0;
    const add = 1 + perfect;
    gain(add, perfect ? "ぴったり ボーナス" : "1もん できた");
    setScore((s) => ({ ...s, done: s.done + 1, perfect: s.perfect + perfect }));
    if (pi + 1 >= probs.length) { setFinished(true); onClearStage(stage); setMood("happy"); setMsg("きょうの もんだい ぜんぶ できたね！ ミントと もっと なかよしに なったよ"); return; }
    setPi(pi + 1); loadProblem(probs[pi + 1]);
  };

  /* ---------- 表示 ---------- */
  const startCell = p ? [p.start.x, p.start.y] : null;
  const pattern = stage === 3 && p ? p.pattern : [];
  const block2d = board.busy ? board.from : board.block;
  const viewLabel = { "3d": "ななめから", "2d": "うえから" };
  const bigNow = glFail ? "2d" : big;          // 3D が 出せない そうちは うえからの 図を 大きく
  const view = (kind) => {
    const isBig = bigNow === kind;
    const cls = "ts-view" + (isBig ? " ts-big" : " ts-small");
    const swap = isBig ? undefined : () => { sfx.tap(); setBig(kind); };
    return (
      <div className={cls} onClick={swap} onPointerDown={isBig ? onDown : undefined} onPointerUp={isBig ? onUp : undefined}>
        {kind === "3d"
          ? <Tsumiki3D n={GRID} block={board.block} roll={board.roll} stamps={board.stamps} pattern={pattern} onRollEnd={onRollEnd} onFail={() => { setGlFail(true); setBig("2d"); }} />
          : <TopGrid n={GRID} block={block2d} stamps={board.stamps} pattern={pattern} startCell={startCell}
            predicted={stage === 2 ? predicted : null} result={phase === "result" ? result : null}
            onCellTap={isBig && stage === 2 && phase === "predict" ? tapCell : undefined} showLabels={isBig} small={!isBig} />}
        <span className="ts-view-cap">{viewLabel[kind]}{!isBig && <small>タップで 大きく</small>}</span>
      </div>
    );
  };

  if (finished) {
    return (
      <div className="ts-wrap">
        <FairyGuide text={msg} mood="happy" />
        <div className="ts-card ts-done">
          <div className="ts-done-title">{STAGES[stage - 1].icon} {STAGES[stage - 1].name} クリア！</div>
          <div>できた もんだい：<b>{score.done}もん</b></div>
          <div>{stage === 2 ? "よそうが ぴったり" : "1かいめで ぴったり"}：<b>{score.perfect}もん</b></div>
          <div className="ts-done-gain">💗 ミントの なかよし度 <b>+{score.gained}</b></div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); startSet(); }}>もういちど ♪</button>
      </div>
    );
  }

  return (
    <div className="ts-wrap">
      <div className="ts-head">
        <span className="ts-stage-tag">{STAGES[stage - 1].icon} {STAGES[stage - 1].name}{stage > 1 && p ? `　${pi + 1} / ${probs.length}` : ""}</span>
        <PoseBadge block={board.block} />
        {gainFx && <span className="ts-gain" key={gainFx.id}>💗 +{gainFx.n}</span>}
      </div>
      <FairyGuide text={msg} mood={mood} />

      <div className={"ts-views" + (glFail ? " ts-nogl" : "")}>
        {!glFail && view("3d")}
        {view("2d")}
      </div>
      {glFail && <div className="ts-note">この そうちでは ななめの 図が 出せないので、うえから 見た 図で あそぼう</div>}

      {stage === 2 && p && (
        <div className="ts-orders" aria-label="しじ">
          <span className="ts-orders-title">しじ</span>
          {p.moves.map((d, i) => (
            <span key={i} className={"ts-order" + (phase === "roll" && i === board.moves.length ? " ts-order-now" : "") + (i < board.moves.length ? " ts-order-done" : "")}>
              {DIRS[d].arrow}{DIRS[d].label}
            </span>
          ))}
        </div>
      )}
      {stage === 3 && p && (phase === "input" || phase === "check" || phase === "result") && (
        <div className="ts-orders" aria-label="入れた じゅんばん">
          <span className="ts-orders-title">じゅんばん</span>
          {Array.from({ length: p.moves.length }, (_, i) => (
            <span key={i} className={"ts-order" + (seq[i] ? "" : " ts-order-empty")}>{seq[i] ? DIRS[seq[i]].arrow + DIRS[seq[i]].label : "？"}</span>
          ))}
        </div>
      )}
      {stage === 3 && p && phase === "backDone" && (
        <div className="ts-orders ts-orders-answer">
          <span className="ts-orders-title">こたえ</span>
          {reverseMoves(back.moves).map((d, i) => <span key={i} className="ts-order">{DIRS[d].arrow}{DIRS[d].label}</span>)}
        </div>
      )}

      <div className="ts-ctrl">
        <DirPad onDir={onDir} disabled={board.busy || !swipeOK} highlight={stage === 2 && phase === "roll" ? p.moves[board.moves.length] : null} />
        <div className="ts-actions">
          {stage === 1 && <button className="ts-act" onClick={() => { sfx.tap(); setBoard(initBoard(cube(2, 2))); setMood(null); setMsg("はじめから！ すきな ほうへ ころがしてね"); }}>はじめから</button>}
          {stage === 2 && phase === "predict" && <button className="ts-act ts-act-main" disabled={!predicted.size} onClick={startRoll2}>よそう できた！<br />ころがす</button>}
          {stage === 3 && phase === "input" && <>
            <button className="ts-act ts-act-main" disabled={!seq.length} onClick={() => runCheck(seq)}>ころがして<br />たしかめる</button>
            <button className="ts-act" disabled={!seq.length} onClick={() => { sfx.tap(); setSeq(seq.slice(0, -1)); }}>1つ けす</button>
            <button className="ts-act ts-act-back" onClick={startBack}>ゴールから もどる</button>
          </>}
          {stage === 3 && phase === "back" && <button className="ts-act" onClick={() => { sfx.tap(); loadProblemKeepSeq(); }}>やめる</button>}
          {stage === 3 && phase === "backDone" && <button className="ts-act ts-act-main" onClick={() => { const f = reverseMoves(back.moves); setSeq(f); runCheck(f); }}>この じゅんばんで<br />たしかめる</button>}
          {phase === "result" && <>
            {stage === 3 && !result.ok && <button className="ts-act" onClick={() => { sfx.tap(); loadProblemKeepSeq(); }}>もういちど<br />かんがえる</button>}
            {stage === 3 && !result.ok && <button className="ts-act ts-act-back" onClick={startBack}>ゴールから もどる</button>}
            <button className="ts-act ts-act-main" onClick={nextProblem}>{pi + 1 >= probs.length ? "おわる" : "つぎの もんだい"} →</button>
          </>}
        </div>
      </div>

      {phase === "back" || phase === "backDone"
        ? <RollLog stamps={board.stamps} moves={board.moves.map((d) => DIRS[d].label)} title="もどった じゅんばん" />
        : <RollLog stamps={board.stamps} moves={board.moves.map((d) => DIRS[d].label)} />}
    </div>
  );

  function loadProblemKeepSeq() {
    setBoard(initBoard(p.start, false)); setPhase("input"); setBig("3d"); setResult(null); setBack(null); setMood(null);
    setMsg("もようを よく 見て、じゅんばんを 入れなおしてみよう");
  }
}

export { stampColor };
