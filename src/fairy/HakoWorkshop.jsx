/* =====================================================================
   妖精の国 — はこの工房（小2：はこの 形。面・辺・頂点、ひらいた 形〈展開図〉と くみたてた 形の 行き来）
   時間は はからない。まちがえても バツで 止めない
   だんかい（ゴールは だんかいの はじめに 帯で 1文。立方体 → 直方体は 立方体の 段階4 クリアで）
     1 はこを しらべよう … はこを まわして 面・辺・頂点を タップ。辺は ひご、頂点は ねんど玉で ほねぐみに
     2 はこを ひらこう … 辺を タップして ハサミで 切る → 面を つまんで ひっぱると ぱたんと ひらく。バラバラは「もどす」。ずかん（11しゅるい）
     3 くみたてよう … 平らな 形の 面を 指で もちあげて おる。はこに ならない 形は「かさなっちゃった！」
     4 どの 面と むかいあう？ … マークの 面と むかいあう 面を タップ → くみたてて たしかめる
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import Hako3D from "./Hako3D.jsx";
import { FairyGuide } from "./TsumikiForest.jsx";
import { makeSet, cutState, unfold, edges as boxEdges, netIdOf, isCube, overlaps, CUBE_NETS, MARKS, COLORS, FACES } from "./hako.js";

export const HAKO_FAIRY = "peta";
export const HSTAGES = [
  { no: 1, name: "はこを しらべよう", desc: "面・辺・頂点を かぞえよう", icon: "🔍" },
  { no: 2, name: "はこを ひらこう", desc: "辺を きって、たいらに ひらこう", icon: "✂️" },
  { no: 3, name: "くみたてよう", desc: "たいらな 形を おって はこに しよう", icon: "📦" },
  { no: 4, name: "どの 面と むかいあう？", desc: "くみたてた ときの 向かいの 面を あてよう", icon: "🔁" },
];
const WHAT = { face: { name: "面", unit: "つ", tap: "面" }, edge: { name: "辺", unit: "本", tap: "辺（はこの へり）" }, vertex: { name: "頂点", unit: "こ", tap: "頂点（かど）" } };
const PAPER = "#FFF6E3";
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/* ずかん：立方体の 展開図 11しゅるい（集めた ものは 色つき） */
export function NetDex({ have }) {
  return (
    <div className="hk-dex">
      {CUBE_NETS.map((n) => {
        const on = have.includes(n.id), W = Math.max(...n.cells.map((c) => c[0])) + 1, H = Math.max(...n.cells.map((c) => c[1])) + 1;
        return (
          <div key={n.id} className={"hk-dex-item" + (on ? " hk-dex-on" : "")} title={n.id}>
            <svg viewBox={`-0.1 -0.1 ${W + 0.2} ${H + 0.2}`} width={W * 12 + 4} height={H * 12 + 4} aria-hidden="true">
              {n.cells.map(([x, y], i) => <rect key={i} x={x} y={y} width={1} height={1} fill={on ? COLORS[i % 6] : "#EEE8F5"} stroke={on ? "#8A6A3A" : "#D3C6E6"} strokeWidth={0.06} />)}
            </svg>
            <small>{on ? n.id.slice(1) : "？"}</small>
          </div>
        );
      })}
    </div>
  );
}

export function HakoWorkshop({ stage, kind = "cube", sfx, onGain, onClearStage, dex = [], onDex }) {
  const [probs, setProbs] = useState(() => makeSet(stage, kind));
  const [pi, setPi] = useState(0);
  const p = probs[pi];
  const [phase, setPhase] = useState("play");
  const [msg, setMsg] = useState("");
  const [mood, setMood] = useState(null);
  const [tries, setTries] = useState(0);
  const [gainFx, setGainFx] = useState(null);
  const [score, setScore] = useState({ done: 0, perfect: 0, gained: 0 });
  const [finished, setFinished] = useState(false);
  const [spin, setSpin] = useState(0);
  const [glFail, setGlFail] = useState(false);
  // だんかい1
  const [found, setFound] = useState(() => new Set());
  // だんかい2
  const [cuts, setCuts] = useState([]);
  const [layout, setLayout] = useState(null);
  const [angles, setAngles] = useState(null);
  const [apart, setApart] = useState(false);
  // だんかい3・4
  const [guess, setGuess] = useState(null);
  const [sel, setSel] = useState(null);
  const [bad, setBad] = useState([]);
  const anim = useRef(0);
  const drag = useRef(null);
  const angRef = useRef(null);
  // 角度は ref も すぐ かえる（つづけて おる とき、まえの 角度が 古いまま 使われない ように）
  const setAng = (a) => { angRef.current = a; setAngles(a); };

  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  const allAngles = (L, a) => Object.fromEntries(L.cells.filter((c) => c.parent).map((c) => [c.id, a]));
  /* 角度を なめらかに かえる（ぱたん） */
  const animate = (target, ms, done) => {
    cancelAnimationFrame(anim.current);
    const from = { ...angRef.current }, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const a = {}; for (const id of Object.keys(target)) a[id] = from[id] + (target[id] - from[id]) * e;
      setAng(a);
      if (k < 1) anim.current = requestAnimationFrame(step); else done && done();
    };
    anim.current = requestAnimationFrame(step);
  };

  const load = (q) => {
    cancelAnimationFrame(anim.current);
    setPhase("play"); setMood(null); setTries(0); setFound(new Set()); setCuts([]); setApart(false); setGuess(null); setSel(null); setBad([]);
    const box = isCube(q.dims) ? "立方体の はこ" : "直方体の はこ";
    if (q.stage === 1) {
      setLayout(null); setAng(null);
      setMsg({ face: `${box}の 面を ぜんぶ タップしよう。はこは ゆびで まわせるよ`, edge: "こんどは 辺。タップすると ひごが つくよ。12本 あるかな？", vertex: "さいごは 頂点（かど）。タップすると ねんど玉が つくよ" }[q.what]);
    } else if (q.stage === 2) {
      setLayout(null); setAng(null);
      setMsg("辺を タップすると ハサミで チョキンと きれるよ。どこを きると たいらに ひらけるかな？");
    } else if (q.stage === 3) {
      setLayout(q.layout); setAng(allAngles(q.layout, 0)); setPhase("predict");
      setMsg("この 形を おると はこに なるかな？ さきに よそうしてね");
    } else {
      setLayout(q.layout); setAng(allAngles(q.layout, 0));
      setMsg("★の 面と、くみたてた とき むかいあう 面は どれかな？ タップして えらんでね");
    }
  };
  useEffect(() => { if (import.meta.env.DEV) window.__hako = probs; load(probs[0]); /* eslint-disable-next-line */ }, []);

  const gain = (n) => { if (n <= 0) return; onGain(n); setScore((s) => ({ ...s, gained: s.gained + n })); setGainFx({ n, id: Date.now() }); };
  const right = (text) => { sfx.correct(); setMood("happy"); setMsg(text); setPhase("done"); };

  /* ---------- 1：しらべる ---------- */
  const tap1 = (hit) => {
    if (phase !== "play" || hit.type !== p.what) return;
    if (found.has(hit.id)) { setMsg(`そこは もう かぞえたよ。はこを まわして ほかの ${WHAT[p.what].name}を さがそう`); return; }
    sfx.tap(); const nf = new Set(found); nf.add(hit.id); setFound(nf);
    setMsg(`${nf.size}${WHAT[p.what].unit}め！`);
  };
  const check1 = () => {
    sfx.tap();
    if (found.size === p.total) {
      const extra = p.what === "vertex" ? "！ ひご 12本と ねんど玉 8こで、はこの ほねぐみが できたね！" : p.what === "edge" ? "！ ひごが 12本 つかえたね" : isCube(p.dims) ? "！ どの 面も おなじ 大きさの 正方形だね" : "！ 長方形の 面が あるね。むかいあう 面は おなじ 形だよ";
      right(`${WHAT[p.what].name}は ${p.total}${WHAT[p.what].unit}${extra}`); return;
    }
    setTries((t) => t + 1);
    setMsg(`まだ 色の ついて いない ${WHAT[p.what].name}が あるよ。はこを ゆびで まわして、うらがわも しらべてみよう`);
  };

  /* ---------- 2：ひらく ---------- */
  const decoOf = (face) => (p.deco ? p.deco[face] : null);
  const tap2 = (hit) => {
    if (phase !== "play" || hit.type !== "edge" || layout) return;
    if (apart) { setMsg("バラバラに なっちゃったよ。「もどす」で 1つ もどそう"); return; }
    if (cuts.includes(hit.id)) { setMsg("そこは もう きったよ"); return; }
    sfx.tap();
    const nc = [...cuts, hit.id]; setCuts(nc);
    const st = cutState(nc, p.dims);
    if (st.state === "apart") { setApart(true); setTries((t) => t + 1); setMsg("あっ、きりすぎて バラバラに なっちゃった！「もどす」で もどそう"); return; }
    if (st.state === "tree") {
      const L = unfold(p.dims, boxEdges(p.dims).filter((e) => !nc.includes(e.id)).map((e) => e.id));
      setLayout(L); setAng(allAngles(L, 90));
      setMsg("チョキン！ ひらけそう！ 面を つまんで ひっぱってみよう"); return;
    }
    setMsg(nc.length === 1 ? "チョキン！ まだ ひらけないね。ほかの 辺も きってみよう" : `チョキン！ あと ${st.need}本 きると ひらけるよ`);
  };
  const undo2 = () => {
    sfx.tap(); cancelAnimationFrame(anim.current);
    if (!cuts.length) return;
    setCuts(cuts.slice(0, -1)); setApart(false); setLayout(null); setAng(null);
    setMsg("1つ もどしたよ");
  };
  const pull2 = (id, ph, dx, dy) => {
    if (phase !== "play" || !layout) return;
    if (ph === "start") { cancelAnimationFrame(anim.current); const a = Object.values(angRef.current || {}); drag.current = { open: 1 - (a.length ? a[0] : 90) / 90 }; return; }
    const t = Math.max(0, Math.min(1, drag.current.open + Math.hypot(dx, dy) / 150));
    if (ph === "move") { setAng(allAngles(layout, 90 * (1 - t))); return; }
    if (t > 0.4) {
      sfx.tap();
      animate(allAngles(layout, 0), 450, () => {
        const id = isCube(p.dims) ? netIdOf(layout) : null;
        let text = "ぱたん！ たいらに ひらけたね！ マークは ひらいても 同じ 面に ついて いるよ";
        if (id) {
          const isNew = !dex.includes(id); onDex && onDex(id);
          const n = dex.length + (isNew ? 1 : 0);
          text = isNew ? `ぱたん！ あたらしい 形！ ずかんに はいったよ（${n} / 11）` : `ぱたん！ ひらけたね。この 形は ずかんの ${id.slice(1)}ばん（${n} / 11）。ちがう 切り方も ためしてね`;
        }
        right(text);
      });
    } else animate(allAngles(layout, 90), 250);
  };

  /* ---------- 3：くみたてる ---------- */
  const evalFold = (a0) => {
    const a = Object.fromEntries(Object.entries(a0).map(([k, v]) => [k, v >= 89.5 ? 90 : v <= 0.5 ? 0 : v]));
    const L = p.layout, ov = overlaps(L, a);
    if (ov.length) {
      const ids = [...new Set(ov.flat())]; setBad(ids);
      const ok = guess === "no";
      sfx.tap(); setPhase("done"); setMood(ok ? "happy" : null); if (!ok) setTries((t) => t + 1);
      setMsg(`かさなっちゃった！ 同じ ところに 面が 2まい きて、べつの ところに あなが あいたね。この 形は はこに ならないよ${ok ? "。よそう ぴったり！" : ""}`);
      return;
    }
    if (L.cells.every((c) => !c.parent || a[c.id] >= 89.5)) {
      const ok = guess === "yes"; if (!ok) setTries((t) => t + 1);
      setSpin((s) => s + 1); setPhase("done"); sfx.correct(); setMood("happy");
      setMsg(`はこに なった！ くるっと まわして たしかめよう${ok ? "。よそう ぴったり！" : ""}`);
    }
  };
  const fold3 = (id, ph, dx, dy, isTap) => {
    if (phase !== "fold") return;
    const c = p.layout.cells.find((x) => x.id === id);
    if (!c.parent) { if (ph === "end") setMsg("この 面は ゆかに ついた まま。ほかの 面を もちあげて おってね"); return; }
    if (ph === "start") { cancelAnimationFrame(anim.current); drag.current = { a0: angRef.current[id] }; return; }
    if (ph === "move") { setAng({ ...angRef.current, [id]: Math.max(0, Math.min(90, drag.current.a0 - dy * 1.3)) }); return; }
    // はなした：半分 いじょうなら ぱたんと おれる。タップは おる／もどす
    const cur = angRef.current[id];
    const target = isTap ? (drag.current.a0 >= 45 ? 0 : 90) : cur >= 45 ? 90 : 0;
    sfx.tap();
    animate({ ...angRef.current, [id]: target }, 220, () => evalFold({ ...angRef.current, [id]: target }));
  };
  const foldAll = () => {
    sfx.tap();
    // ねもと から じゅんばんに おる
    const L = p.layout, maxD = Math.max(...L.cells.map((c) => c.depth));
    let d = maxD;
    const next = () => {
      if (d < 1) { evalFold(angRef.current); return; }
      const t = { ...angRef.current }; for (const c of L.cells) if (c.depth === d) t[c.id] = 90;
      d -= 1; animate(t, 380, next);
    };
    next();
  };

  /* ---------- 4：むかいあう 面 ---------- */
  const tap4 = (hit) => {
    if (phase !== "play" || hit.type !== "cell") return;
    if (hit.id === p.mark) { setMsg("そこは ★の 面だよ。むかいあう 面を えらんでね"); return; }
    sfx.tap(); setSel(hit.id); setMsg("その 面で いいかな？「くみたてて たしかめる」を おしてね");
  };
  const check4 = () => {
    sfx.tap(); setPhase("check");
    const L = p.layout, maxD = Math.max(...L.cells.map((c) => c.depth));
    let d = maxD;
    const next = () => {
      if (d < 1) {
        setSpin((s) => s + 1);
        if (sel === p.answer) right("ぴったり！ くみたてると ★の 面と むかいあったね！");
        else { setTries((t) => t + 1); setPhase("done"); sfx.tap(); setMsg("おしい！ むかいあうのは みどりの わくの 面 だったよ。「ひらく」で もういちど 見てみよう"); }
        return;
      }
      const t = { ...angRef.current }; for (const c of L.cells) if (c.depth === d) t[c.id] = 90;
      d -= 1; animate(t, 420, next);
    };
    next();
  };

  const next = () => {
    sfx.tap();
    const perfect = tries === 0 ? 1 : 0;
    gain(1 + perfect);
    setScore((s) => ({ ...s, done: s.done + 1, perfect: s.perfect + perfect }));
    if (pi + 1 >= probs.length) { setFinished(true); onClearStage(stage); setMood("happy"); setMsg("きょうの もんだい ぜんぶ できたね！ ペタと もっと なかよしに なったよ"); return; }
    setPi(pi + 1); load(probs[pi + 1]);
  };
  const again = () => { const ps = makeSet(stage, kind); if (import.meta.env.DEV) window.__hako = ps; setProbs(ps); setPi(0); setFinished(false); setScore({ done: 0, perfect: 0, gained: 0 }); load(ps[0]); };

  if (finished) {
    return (
      <div className="ts-wrap">
        <FairyGuide fairy={HAKO_FAIRY} text={msg} mood="happy" />
        <div className="ts-card ts-done">
          <div className="ts-done-title">{HSTAGES[stage - 1].icon} {HSTAGES[stage - 1].name} クリア！</div>
          <div className="ts-done-kind">{kind === "cube" ? "🎲 立方体" : "📦 直方体"}</div>
          <div>できた もんだい：<b>{score.done}もん</b></div>
          <div>1かいめで ぴったり：<b>{score.perfect}もん</b></div>
          <div className="ts-done-gain">💗 ペタの なかよし度 <b>+{score.gained}</b></div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); again(); }}>もういちど ♪</button>
      </div>
    );
  }

  /* ---------- 表示 ---------- */
  let view, goal, extra = null;
  if (p.stage === 1) {
    const st = {}; if (p.what === "face") for (const f of FACES) st[f] = { color: found.has(f) ? "#FF9EC7" : PAPER, mark: found.has(f) ? String([...found].indexOf(f) + 1) : "" };
    else for (const f of FACES) st[f] = {};
    view = <Hako3D mode="box" dims={p.dims} styles={st} wire={p.what !== "face"} edgesOn={p.what === "edge" ? found : new Set(boxEdges(p.dims).map((e) => e.id))}
      verticesOn={p.what === "vertex" ? found : null} tappable={{ [p.what]: phase === "play" }} onTap={tap1} spin={spin} onFail={() => setGlFail(true)} />;
    goal = `はこの ${WHAT[p.what].name}は いくつ？ ぜんぶ タップして かぞえよう`;
    extra = <div className="hk-counter"><span>{WHAT[p.what].name}</span><b>{found.size}</b><span>{WHAT[p.what].unit}</span></div>;
  } else if (p.stage === 2) {
    const st = {};
    if (layout) for (const c of layout.cells) st[c.id] = decoOf(c.face); else for (const f of FACES) st[f] = decoOf(f);
    view = layout
      ? <Hako3D mode="net" dims={p.dims} layout={layout} angles={angles} styles={st} onFaceDrag={pull2} onFail={() => setGlFail(true)} />
      : <Hako3D mode="box" dims={p.dims} styles={st} cuts={cuts} tappable={{ edge: phase === "play" && !apart }} onTap={tap2} onFail={() => setGlFail(true)} />;
    goal = "辺を きって はこを ひらき、たいらな 形に しよう";
    extra = <div className="hk-counter"><span>✂️ きった 辺</span><b>{cuts.length}</b><span>本</span>{isCube(p.dims) && <span className="hk-dexcount">📖 {dex.length}/11</span>}</div>;
  } else if (p.stage === 3) {
    const st = {}; p.layout.cells.forEach((c, i) => { st[c.id] = { color: p.deco[FACES[i]].color, mark: p.deco[FACES[i]].mark, hl: bad.includes(c.id) ? "bad" : null }; });
    view = <Hako3D mode="net" dims={p.dims} layout={p.layout} angles={angles} styles={st} onFaceDrag={phase === "fold" ? fold3 : undefined} spin={spin} onFail={() => setGlFail(true)} />;
    goal = "たいらな 形を おって、はこを くみたてよう";
  } else {
    const st = {};
    for (const c of p.layout.cells) {
      const hl = c.id === p.mark ? "mark" : phase === "done" && c.id === p.answer ? "ok" : c.id === sel ? "pick" : null;
      st[c.id] = { color: c.id === p.mark ? "#FFE08A" : c.id === sel ? "#FFD6E8" : phase === "done" && c.id === p.answer ? "#C8F2DE" : PAPER, mark: c.id === p.mark ? "★" : c.id === sel ? "?" : "", markColor: c.id === p.mark ? "#C77700" : "#E85FA3", hl };
    }
    view = <Hako3D mode="net" dims={p.dims} layout={p.layout} angles={angles} styles={st} onTap={tap4} spin={spin} onFail={() => setGlFail(true)} />;
    goal = "★の 面と むかいあう 面は どれ？";
  }

  return (
    <div className="ts-wrap hk-wrap">
      <div className="ts-head">
        <span className="ts-stage-tag hk-stage-tag">{HSTAGES[stage - 1].icon} {HSTAGES[stage - 1].name}　{pi + 1} / {probs.length}</span>
        <span className="ts-kind-tag">{kind === "cube" ? "🎲 立方体" : "📦 直方体"}</span>
        {gainFx && <span className="ts-gain" key={gainFx.id}>💗 +{gainFx.n}</span>}
      </div>
      <div className="ts-goal" role="status">
        <span className="ts-goal-icon" aria-hidden="true">🎯</span>
        <span className="ts-goal-text"><small>ゴール</small>{goal}</span>
      </div>
      <FairyGuide fairy={HAKO_FAIRY} text={msg} mood={mood} />
      <div className="hk-box">
        {glFail ? <div className="ts-note">この そうちでは 3Dが 出せないみたい。おうちの ひとに パソコンや べつの たんまつで ためして もらってね</div> : view}
        <span className="hk-cap">{p.stage === 3 && phase === "fold" ? "面を 上へ もちあげて おろう（タップでも おれる）" : layout && p.stage === 2 && phase === "play" ? "面を つまんで ひっぱろう" : "なにも ない ところを ドラッグすると まわるよ"}</span>
      </div>
      {extra}
      <div className="jc-acts">
        {p.stage === 1 && phase === "play" && <button className="ts-act ts-act-main" onClick={check1}>かぞえた！</button>}
        {p.stage === 2 && phase === "play" && <button className={"ts-act" + (apart ? " ts-act-main" : "")} disabled={!cuts.length} onClick={undo2}>↩ もどす</button>}
        {p.stage === 3 && phase === "predict" && <>
          <button className="ts-act ts-act-main" onClick={() => { sfx.tap(); setGuess("yes"); setPhase("fold"); setMsg("「なる」と よそうしたね。面を 上へ もちあげて おってみよう"); }}>はこに なる</button>
          <button className="ts-act ts-act-back" onClick={() => { sfx.tap(); setGuess("no"); setPhase("fold"); setMsg("「ならない」と よそうしたね。ほんとうか、おって たしかめよう"); }}>ならない</button>
        </>}
        {p.stage === 3 && phase === "fold" && <>
          <button className="ts-act" onClick={() => { sfx.tap(); animate(allAngles(p.layout, 0), 300); }}>ひらきなおす</button>
          <button className="ts-act ts-act-main" onClick={foldAll}>まとめて おる</button>
        </>}
        {p.stage === 4 && phase === "play" && <button className="ts-act ts-act-main" disabled={!sel} onClick={check4}>くみたてて たしかめる</button>}
        {p.stage === 4 && phase === "done" && <button className="ts-act" onClick={() => { sfx.tap(); const open = Object.values(angRef.current)[0] > 45; animate(allAngles(p.layout, open ? 0 : 90), 500); }}>ひらく／とじる</button>}
        {phase === "done" && <button className="ts-act ts-act-main" onClick={next}>{pi + 1 >= probs.length ? "おわる" : "つぎの もんだい"} →</button>}
      </div>
    </div>
  );
}
export { pickOne, MARKS };
