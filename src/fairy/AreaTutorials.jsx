/* =====================================================================
   妖精の国 — エリアごとの あそびかた（れんしゅうの 場面）
   ほんものの もんだいとは べつの、小さな れんしゅう。部品（入れ物・3Dの はこ・つみき・花畑）は ほんものと 同じ
   なので、さわり ごこちも 同じ。セーブ・なかよし度・クリアには さわらない
     ジュースの泉 … かたむけて そそぐ → はなして とめる → 目もりの 線で とめる（1L と 1dL の 図）→ もどす
     はこの工房 … まわす → めん・へん・ちょうてん（光らせて 1つずつ）→ タップで 色を つける
     つみきの森 … むきの ボタン → スワイプ → よそうで マスを えらぶ
     ますめの花畑 … ドラッグで うごかす（ます目に すいつく）→ タップで まわす → 2つで 1ます
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { useTutorial, TutorialFrame, Spot, Finger } from "./Tutorial.jsx";
import { PourScene } from "./PourScene.jsx";
import { isExact } from "./juice.js";
import Hako3D from "./Hako3D.jsx";
import { CUBE } from "./hako.js";
import Tsumiki3D from "./Tsumiki3D.jsx";
import { TopGrid } from "./TopGrid.jsx";
import { DirPad } from "./TsumikiForest.jsx";
import { tryRoll, legalDirs, footprint, cube, DIRS, NUM } from "./tsumiki.js";
import { MasumeField } from "./MasumeField.jsx";
import { pieceTiles } from "./masume.js";

export const TUTORIAL_TITLE = { juice: "ジュースの泉の あそびかた", hako: "はこの工房の あそびかた", tsumiki: "つみきの森の あそびかた", masume: "ますめの花畑の あそびかた" };
const FAIRY_OF = { juice: "ramune", hako: "peta", tsumiki: "mint", masume: "poppy" };

/* ======================= ジュースの泉 ======================= */
const J_STEPS = [
  { say: "いれものを ゆびで ひっぱって かたむけると、ジュースが でるよ" },
  { say: "ゆびを はなすと とまるよ" },
  { say: "めもりの せんで とめてみよう" },
  { say: "いれすぎたら もどすで もどせるよ" },
];
const jStart = () => [{ id: "pot", type: "pot", amount: 1500, x: 88 }, { id: "L", type: "L", amount: 0, x: 258 }];
const J_POURS = { pot: ["L"] };
const amtOf = (vs, id) => vs.find((v) => v.id === id).amount;

/* 1L と 1dL：1Lますを 10に わけた 図（1かいだけ 見せる） */
function LdLDiagram({ onOk }) {
  return (
    <div className="tt-card tt-diagram" role="dialog" aria-label="1L と 1dL">
      <svg viewBox="0 0 210 150" className="tt-diagram-svg" aria-hidden="true">
        <rect x={30} y={10} width={64} height={120} rx={3} fill="#FFF6E6" stroke="#B98A52" strokeWidth={4} />
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x={32} y={12 + i * 11.6} width={60} height={11.6} fill={i === 9 ? "#FFA94D" : "none"} stroke="#D9B98A" strokeWidth={1} />)}
        <text x={62} y={145} textAnchor="middle" fontSize={12} fontWeight={900} fill="#7A4E22">1Lます</text>
        {Array.from({ length: 10 }, (_, i) => <text key={"n" + i} x={22} y={127 - i * 11.6 + 3} textAnchor="end" fontSize={8} fontWeight={900} fill="#9C7A55">{i + 1}</text>)}
        <path d="M100 124 L136 124" stroke="#E85FA3" strokeWidth={2.5} markerEnd="url(#tt-arr)" />
        <defs><marker id="tt-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#E85FA3" /></marker></defs>
        <rect x={146} y={104} width={36} height={26} rx={2} fill="#FFA94D" stroke="#B98A52" strokeWidth={4} />
        <text x={164} y={145} textAnchor="middle" fontSize={12} fontWeight={900} fill="#7A4E22">1dLます</text>
      </svg>
      <div className="tt-diagram-text"><b>1L</b>の 10こぶんの 1つが <b>1dL</b>だよ</div>
      <button className="ts-act ts-act-main" onClick={onOk}>わかった！</button>
    </div>
  );
}

function JuiceTutorial({ t, sfx }) {
  const [vs, setVs] = useState(jStart);
  const [undo, setUndo] = useState([]);
  const [holding, setHolding] = useState(false);
  const [auto, setAuto] = useState(null);
  const [diagram, setDiagram] = useState(false);
  const diaShown = useRef(false);
  const startL = useRef(0);
  const s = t.step;

  useEffect(() => {          // ステップに 入った とき の じゅんび
    setAuto(null);
    if (s === 0 || s === 2) { setVs(jStart()); setUndo([]); }
    if (s === 3) {
      // 「いれすぎた」ところから：1dL の 線を こえて 3dL半。もどすと 1dL に もどる
      setUndo([[{ id: "pot", type: "pot", amount: 1400, x: 88 }, { id: "L", type: "L", amount: 100, x: 258 }]]);
      setVs([{ id: "pot", type: "pot", amount: 1150, x: 88 }, { id: "L", type: "L", amount: 350, x: 258 }]);
      if (!diaShown.current) { diaShown.current = true; setDiagram(true); t.setTip("1Lの 10こぶんの 1つが 1dLだよ"); }
    }
    /* eslint-disable-next-line */
  }, [s]);

  const runAuto = (stopAt) => setAuto({ key: Date.now(), id: "pot", to: "L", stopAt });
  const onChange = (nv) => {
    setVs(nv);
    if (s === 0 && amtOf(nv, "L") > startL.current + 1) t.succeed("できたね！ ジュースが でたね");
  };
  const onGrab = () => { setHolding(true); startL.current = amtOf(vs, "L"); };
  const onRelease = (info) => {
    setHolding(false);
    if (info.auto) { t.autoDone(); return; }
    if (s === 0 && !info.poured) { if (t.fail("1Lますの うえまで うごかして、ゆびを したへ さげてね")) runAuto(amtOf(vs, "L") + 100); }
    if (s === 1) {
      if (info.poured) t.succeed("できたね！ ゆびを はなすと とまったね");
      else if (t.fail("ジュースが でたら、ゆびを はなしてみよう")) runAuto(amtOf(vs, "L") + 100);
    }
  };
  const onPourEnd = (before, after) => {
    setUndo((u) => [...u.slice(-9), before]);
    if (s !== 2 || !t.trying) return;
    const L = amtOf(after, "L");
    if (isExact(L, 100)) { t.succeed("できたね！ ぴったり 1dL だね"); return; }
    if (L > 100.5) {
      setVs(before.map((v) => ({ ...v, stickUntil: 0 })));
      if (t.fail("いきすぎちゃった。もとに もどしたよ。ひかる せんで とめよう")) { setVs(jStart()); setTimeout(() => runAuto(100), 50); }
      return;
    }
    t.setTip("もうすこし！ ひかる せんまで いれよう");
  };
  const doUndo = () => {
    if (!undo.length) return;
    sfx.tap(); setVs(undo[undo.length - 1].map((v) => ({ ...v, stickUntil: 0 }))); setUndo(undo.slice(0, -1));
    if (s === 3) t.succeed("できたね！ ひとつ まえに もどったね");
  };

  const sceneOn = s < 3 && !diagram;
  return (
    <>
      <Spot on={sceneOn} className="tt-juice">
        <PourScene vessels={vs} pours={J_POURS} interactive={t.trying && sceneOn} onChange={onChange} onPourEnd={onPourEnd}
          onGrab={onGrab} onRelease={onRelease} auto={auto}
          demo={t.trying && !holding && s <= 2 && sceneOn ? { id: "pot", to: "L" } : null}
          glowMark={s >= 2 ? { id: "L", ml: 100 } : null} />
        {holding && s === 1 && t.trying && <div className="tt-float">✋ ゆびを はなしてね</div>}
      </Spot>
      <div className="tt-cap">{["つぼを ゆびで おさえて 1Lますの うえへ。そのまま ゆびを したへ さげよう", holding ? "" : "かたむけて ジュースが でたら、ゆびを はなそう", "ひかる 1dLの せんの ところで ゆびを はなそう", "「もどす」を おしてみよう"][s]}</div>
      <div className="tt-acts">
        <Spot on={s === 3 && !diagram} className="tt-anchor">
          <button className="ts-act" disabled={!undo.length || s !== 3 || diagram} onClick={doUndo}>↩ もどす</button>
          <Finger kind="tap" x={50} y={60} show={s === 3 && !diagram && t.trying} />
        </Spot>
      </div>
      {diagram && <LdLDiagram onOk={() => { sfx.tap(); setDiagram(false); t.setTip(null); }} />}
    </>
  );
}

/* ======================= はこの工房 ======================= */
const NAME = { face: "めん", edge: "へん", vertex: "ちょうてん" };
const H_STEPS = [
  { say: "はこを ゆびで まわしてみよう", dot: 0 },
  { say: "たいらな ところを めん と いうよ", dot: 1, type: "face" },
  { say: "めんと めんの さかいめの まっすぐな せんを へん と いうよ", dot: 1, type: "edge" },
  { say: "とがった かどを ちょうてん と いうよ", dot: 1, type: "vertex" },
  { say: "ぜんぶ かぞえてみよう。タップすると いろが つくよ", dot: 2 },
];
function HakoTutorial({ t }) {
  const [spin, setSpin] = useState(0);
  const [colored, setColored] = useState([]);
  const [gpos, setGpos] = useState(null);
  const [glFail, setGlFail] = useState(false);
  const s = t.step, type = t.cur.type;
  useEffect(() => { if (s === 0) setColored([]); }, [s]);

  const onTurn = (px) => {
    if (s !== 0 || !t.trying) return;
    if (px >= 40) { t.succeed("できたね！ くるっと まわったね"); return; }
    if (t.fail("ゆびを はこに つけたまま、よこに うごかしてね")) { setSpin((n) => n + 1); setTimeout(t.autoDone, 1900); }
  };
  const onTap = (hit) => {
    if (!t.trying) return;
    if (s >= 1 && s <= 3) {
      if (hit.type === type) t.succeed(`できたね！ それが ${NAME[type]} だよ`);
      else if (t.fail(`それは ${NAME[hit.type]} だよ。ひかって いる ${NAME[type]}を タップしてね`)) setTimeout(t.autoDone, 900);
      return;
    }
    if (s === 4) {
      if (hit.type === "face") { setColored([hit.id]); t.succeed("できたね！ いろが ついたね"); }
      else if (t.fail("めんを タップしてね。たいらな ところだよ")) { setColored(["S"]); setTimeout(t.autoDone, 600); }
    }
  };
  const styles = {}; for (const f of ["D", "U", "W", "E", "N", "S"]) styles[f] = colored.includes(f) ? { color: "#FF9EC7", mark: "1" } : { color: "#FFF6E3" };
  const glow = s >= 1 && s <= 3 ? { type, id: "auto" } : null;
  return (
    <>
      <Spot on className="tt-hako hk-box">
        {glFail ? <div className="ts-note">この そうちでは 3Dが 出せないみたい。「とばす」で すすんでね</div> : (
          <div className="tt-anchor">
            <Hako3D mode="box" dims={CUBE} styles={styles} spin={spin} height={250} onFail={() => setGlFail(true)}
              tappable={s >= 1 && t.trying ? { face: true, edge: true, vertex: true } : {}} onTap={onTap} onTurn={onTurn}
              glow={glow} onGlowPos={setGpos} />
            {s === 0 && <Finger kind="swipe" x={28} y={55} x2={72} y2={55} show={t.trying} />}
            {glow && gpos && <Finger kind="tap" x={gpos.x} y={gpos.y} show={t.trying} />}
            {s === 4 && <Finger kind="tap" x={44} y={66} show={t.trying} />}
          </div>
        )}
      </Spot>
      <div className="tt-cap">{s === 0 ? "なにも ない ところでも、はこの うえでも ドラッグすると まわるよ" : s <= 3 ? `ひかって いる ${NAME[type]}と おなじ ものを 1つ タップしてね` : "めんを 1つ タップしてみよう"}</div>
    </>
  );
}

/* ======================= つみきの森 ======================= */
const T_STEPS = [
  { say: "やじるしの ボタンを おすと、つみきが ころがるよ" },
  { say: "つみきの うえを ゆびで はらっても ころがるよ" },
  { say: "よそうでは、いろが つく マスを タップして えらぶよ" },
];
const T_BOARD = { w: 3, h: 3, cells: [0, 1, 2].flatMap((y) => [0, 1, 2].map((x) => `${x},${y}`)) };
const T_BOARD2 = { w: 3, h: 2, cells: [0, 1].flatMap((y) => [0, 1, 2].map((x) => `${x},${y}`)) };
const tStart = () => { const b = cube(1, 1); return { block: b, from: null, roll: null, stamps: [{ no: 1, cells: footprint(b), pose: b.pose, kind: b.kind }], busy: false }; };
const paintedOf = (stamps) => new Set(stamps.flatMap((x) => x.cells.map(([a, b]) => `${a},${b}`)));
function TsumikiTutorial({ t }) {
  const [bd, setBdState] = useState(tStart);
  const bref = useRef(bd); const setBd = (b) => { bref.current = b; setBdState(b); };
  const after = useRef(null);
  const rid = useRef(0);
  const [glFail, setGlFail] = useState(false);
  const [pred, setPred] = useState(() => new Set());
  const sw = useRef(null);
  const s = t.step;
  const onBoard = new Set(T_BOARD.cells);
  useEffect(() => { if (s === 0) { setBd(tStart()); setPred(new Set()); } /* eslint-disable-next-line */ }, [s]);

  const roll = (dir, onDone) => {
    const b = bref.current; if (b.busy) return "busy";
    const r = tryRoll(b.block, dir, onBoard, paintedOf(b.stamps));
    if (!r.block) return r.why;
    rid.current += 1;
    setBd({ ...b, from: b.block, block: r.block, roll: { id: rid.current, dir }, busy: true });
    after.current = () => { const c = bref.current; setBd({ ...c, busy: false, stamps: [...c.stamps, { no: c.stamps.length + 1, cells: footprint(r.block), pose: r.block.pose, kind: r.block.kind }] }); onDone && onDone(); };
    if (glFail) setTimeout(onRollEnd, 160);
    return "ok";
  };
  const onRollEnd = () => { const f = after.current; after.current = null; if (f) f(); };
  const autoRoll = () => { const d = legalDirs(bref.current.block, onBoard, paintedOf(bref.current.stamps))[0]; if (d) roll(d, t.autoDone); else t.autoDone(); };

  const onDir = (d) => {
    if (s !== 0 || !t.trying || bref.current.busy) return;
    const r = roll(d, () => t.succeed("できたね！ ころがって いろが ついたね"));
    if (r === "out" || r === "visited") { if (t.fail(r === "out" ? "そっちは いたの そとだよ。ほかの やじるしを おしてね" : "そこは もう いろが ついて いるよ。ほかの やじるしを おしてね")) autoRoll(); }
  };
  const down = (e) => { sw.current = [e.clientX, e.clientY]; };
  const up = (e) => {
    if (!sw.current || s !== 1 || !t.trying || bref.current.busy) { sw.current = null; return; }
    const dx = e.clientX - sw.current[0], dy = e.clientY - sw.current[1]; sw.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { if (t.fail("ゆびを つけたまま、さっと うごかしてね")) autoRoll(); return; }
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "migi" : "hidari") : (dy > 0 ? "temae" : "oku");
    const r = roll(d, () => t.succeed("できたね！ ゆびでも ころがせたね"));
    if (r === "out" || r === "visited") { if (t.fail(r === "out" ? "そっちは いたの そとだよ。ちがう むきに はらってね" : "そこは もう いろが ついて いるよ。ちがう むきに はらってね")) autoRoll(); }
  };
  const tapCell = (k) => {
    if (s !== 2 || !t.trying) return;
    if (k === "1,0") { setPred(new Set([k])); t.succeed("できたね！ その マスに いろが つくよ"); return; }
    if (t.fail("みぎへ 1かい ころがすと、すぐ となりの マスだよ")) { setPred(new Set(["1,0"])); setTimeout(t.autoDone, 700); }
  };

  if (s === 2) {
    const start2 = cube(0, 0);
    return (
      <>
        <div className="tt-letter"><span>おてがみ</span><b>{NUM(1)} <span className="ts-step-arrow">{DIRS.migi.arrow}</span>{DIRS.migi.label}</b></div>
        <Spot on className="tt-tsumiki2">
          <div className="tt-anchor tt-topgrid">
            <TopGrid board={T_BOARD2} block={start2} stamps={[{ no: 1, cells: footprint(start2), pose: start2.pose, kind: "cube" }]} predicted={pred} onCellTap={tapCell} />
            <Finger kind="tap" x={50} y={32} show={t.trying} />
          </div>
        </Spot>
        <div className="tt-cap">①の つみきを みぎへ ころがすと、どこに いろが つくかな？</div>
      </>
    );
  }
  const painted = paintedOf(bd.stamps);
  return (
    <div className="tt-tsumiki">
      <Spot on={s === 1} className="ts-view tt-anchor" onPointerDown={down} onPointerUp={up}>
        {glFail
          ? <TopGrid board={T_BOARD} block={bd.busy && bd.from ? bd.from : bd.block} stamps={bd.stamps} />
          : <Tsumiki3D board={T_BOARD} block={bd.block} from={bd.from} roll={bd.roll} stamps={bd.stamps} onRollEnd={onRollEnd} onFail={() => setGlFail(true)} />}
        <Finger kind="swipe" x={34} y={58} x2={66} y2={58} show={s === 1 && t.trying && !bd.busy} />
      </Spot>
      <Spot on={s === 0} className="tt-anchor tt-pad">
        <DirPad onDir={onDir} disabled={s !== 0 || bd.busy} highlight={s === 0 ? legalDirs(bd.block, onBoard, painted).find((d) => d === "migi") || legalDirs(bd.block, onBoard, painted)[0] : null} />
        <Finger kind="tap" x={84} y={76} show={s === 0 && t.trying && !bd.busy} />
      </Spot>
    </div>
  );
}

/* ======================= ますめの花畑 ======================= */
const M_STEPS = [
  { say: "さんかくを ゆびで うごかすと、ますめに ぴたっと すいつくよ" },
  { say: "さんかくを タップすると、くるっと まわるよ" },
  { say: "2つの さんかくを あわせて、1ますに してみよう" },
];
const MW = 5, MH = 3;
const M_FIXED = [{ x: 1, y: 1, k: "tl" }];
const mStart = () => [{ id: "p", tiles: [{ x: 0, y: 0, k: "tl" }], x: 3, y: 1, rot: 0, home: { x: 3, y: 1, rot: 0 } }];
const pieceAt = (ps) => pieceTiles(ps[0])[0];
const pct = (tile, ox = 0.5, oy = 0.5) => ({ x: ((tile.x + ox) * 44 + 4) / (MW * 44 + 8) * 100, y: ((tile.y + oy) * 44 + 4) / (MH * 44 + 8) * 100 });
function MasumeTutorial({ t }) {
  const [pieces, setPieces] = useState(mStart);
  const s = t.step;
  const solved = (ps) => { const tl = pieceAt(ps); return tl.x === 1 && tl.y === 1 && tl.k === "br"; };
  useEffect(() => { if (s === 0 || (s === 2 && solved(pieces))) setPieces(mStart()); /* eslint-disable-next-line */ }, [s]);
  const onPieces = (np, info) => {
    if (!t.trying) return;
    setPieces(np);
    if (s === 0) {
      if (info.moved && !info.rotated) t.succeed("できたね！ ますめに ぴたっと くっついたね");
      else if (t.fail(info.outside ? "はなの はたけの なかで うごかしてね" : "ゆびを つけたまま、すーっと うごかしてね")) { setPieces([{ ...np[0], x: 2, y: 1 }]); setTimeout(t.autoDone, 500); }
      return;
    }
    if (s === 1) {
      if (info.rotated) t.succeed("できたね！ くるっと まわったね");
      else if (t.fail("ゆびで ちょんと タップしてね")) { setPieces([{ ...np[0], rot: (np[0].rot + 1) % 4 }]); setTimeout(t.autoDone, 500); }
      return;
    }
    if (solved(np)) { t.succeed("できたね！ 2つで 1ますに なったね"); return; }
    if (info.moved || info.rotated) {
      const tl = pieceAt(np);
      if (tl.x === 1 && tl.y === 1) { t.setTip("おなじ ますに きたね！ タップして まわして、すきまを うめよう"); return; }
      if (t.fail("ピンクの さんかくの ある ますに もっていって、まわして あわせてね")) { setPieces([{ ...np[0], x: 1, y: 1, rot: 2 }]); setTimeout(t.autoDone, 600); }
    }
  };
  const tl = pieceAt(pieces), from = pct(tl), to = pct({ x: tl.x - 1, y: tl.y }), goal = pct({ x: 1, y: 1 });
  return (
    <>
      <Spot on className="tt-masume tt-anchor">
        <MasumeField W={MW} H={MH} fixed={M_FIXED} pieces={pieces} onPieces={onPieces} glow={t.trying} />
        {s === 0 && <Finger kind="drag" x={from.x} y={from.y} x2={to.x} y2={to.y} show={t.trying} />}
        {s === 1 && <Finger kind="tap" x={from.x} y={from.y} show={t.trying} />}
        {s === 2 && !(tl.x === 1 && tl.y === 1) && <Finger kind="drag" x={from.x} y={from.y} x2={goal.x} y2={goal.y} show={t.trying} />}
        {s === 2 && tl.x === 1 && tl.y === 1 && <Finger kind="tap" x={goal.x} y={goal.y} show={t.trying} />}
      </Spot>
      <div className="tt-cap">{s === 2 ? "きいろの さんかくを ピンクの さんかくの ますへ。むきが ちがったら タップで まわそう" : "きいろの さんかくが うごかせるよ"}</div>
    </>
  );
}

/* ======================= まとめ ======================= */
const BODY = { juice: [J_STEPS, JuiceTutorial], hako: [H_STEPS, HakoTutorial], tsumiki: [T_STEPS, TsumikiTutorial], masume: [M_STEPS, MasumeTutorial] };
export const TUTORIAL_AREAS = Object.keys(BODY);

/* onClose("done" | "skip") */
export function AreaTutorial({ area, sfx, onClose }) {
  const [steps, Body] = BODY[area];
  const t = useTutorial(steps, sfx);
  useEffect(() => { if (import.meta.env.DEV) window.__tutorial = { area, step: t.step, status: t.status, fails: t.fails }; }, [area, t.step, t.status, t.fails]);
  return (
    <TutorialFrame t={t} steps={steps} fairy={FAIRY_OF[area]} title={TUTORIAL_TITLE[area]} sfx={sfx} onClose={onClose}>
      <Body key={t.status === "end" ? "end" : "run"} t={t} sfx={sfx} />
    </TutorialFrame>
  );
}
