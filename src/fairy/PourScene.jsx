/* =====================================================================
   ジュースの泉 — 入れ物を 指で もって かたむけて そそぐ（SVG）
   - 入れ物を おさえて よこに うごかすと もちあがり、そそげる 入れ物の 上に くる（すいつく）
   - そのまま 指を 下へ うごかすほど かたむく。ふちまで かたむくと ジュースが ながれる
   - 指を はなすと 止まって もとの 場所に もどる
   - 目もりの 線では かるく すいつく（すこし 止まる。はなした ときも 線の ちかくなら ぴったりに）
   りょうの 計算は juice.js（flowStep / releaseSnap）。ここは 絵と 指の うごきだけ
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { TYPES, MAX_TILT, flowStep, applyFlow, releaseSnap, lipAngle } from "./juice.js";

export const SCENE_W = 360, SCENE_H = 306, GROUND = 280;
const JUICE = "#FFA94D", JUICE_TOP = "#FFD08A";
const TILT_PX = 85;                                  // 指を 下へ 85px で いちばん かたむく

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* 入れ物の 絵（ローカル座標：中の 四角が (0,0)-(w,h)） */
function Marks({ v, T, glowL1 }) {
  const { w, h, cap } = T, y = (ml) => h - (ml / cap) * h;
  const out = [];
  if (T.shape === "masu" && !T.fine) {
    for (const m of T.marks) out.push(<line key={m} x1={w - (m % 500 ? 9 : 16)} x2={w} y1={y(m)} y2={y(m)} stroke="#7A4E22" strokeWidth={m % 500 ? 1.2 : 2} />);
    if (T.marks.length) { out.push(<text key="t5" x={w - 18} y={y(500) + 3} textAnchor="end" fontSize={8} fontWeight={900} fill="#7A4E22">5dL</text>); }
  }
  if (T.fine) {
    for (const m of T.marks) {
      out.push(<line key={m} x1={w - 12} x2={w} y1={y(m)} y2={y(m)} stroke="#7A4E22" strokeWidth={1.3} />);
      out.push(<text key={"t" + m} x={w - 14} y={y(m) + 3} textAnchor="end" fontSize={8} fontWeight={900} fill="#7A4E22">{m}</text>);
    }
    out.push(<text key="ml" x={4} y={y(100) + 9} fontSize={7.5} fontWeight={900} fill="#7A4E22">mL</text>);
  }
  if (T.shape === "cup") for (const m of T.marks) {
    out.push(<line key={m} x1={2} x2={w - 2} y1={y(m)} y2={y(m)} stroke="#4A86C5" strokeWidth={1.1} strokeDasharray="3 2" />);
    out.push(<text key={"t" + m} x={3} y={y(m) - 2} fontSize={7.5} fontWeight={900} fill="#2F5E9E">{m / 100}dL</text>);
  }
  if (T.shape === "tank") {
    for (const m of T.marks) {
      if (m % 1000) { out.push(<line key={m} x1={0} x2={m % 500 ? 8 : 14} y1={y(m)} y2={y(m)} stroke="#4A86C5" strokeWidth={1.1} />); continue; }
      const glow = m === 1000 && glowL1;
      out.push(<line key={m} x1={0} x2={w} y1={y(m)} y2={y(m)} stroke={glow ? "#FFC21A" : "#4A86C5"} strokeWidth={glow ? 3.5 : 2} strokeDasharray={glow ? "" : "6 3"} className={glow ? "jc-glow-line" : undefined} />);
      out.push(<text key={"t" + m} x={w - 3} y={y(m) - 3} textAnchor="end" fontSize={10} fontWeight={900} fill={glow ? "#C77700" : "#2F5E9E"}>{m / 1000}L</text>);
    }
  }
  if (T.shape === "mcup") {
    const big = cap > 500;
    for (const m of T.marks) {
      const major = m % 100 === 0, mid = m % 50 === 0;
      out.push(<line key={m} x1={0} x2={major ? 13 : mid ? 8 : 4} y1={y(m)} y2={y(m)} stroke="#4A86C5" strokeWidth={major ? 1.4 : 0.8} />);
      if (major && (!big || m % 200 === 0)) out.push(<text key={"t" + m} x={15} y={y(m) + 3} fontSize={8} fontWeight={900} fill="#2F5E9E">{m}</text>);
    }
    out.push(<text key="ml" x={w - 3} y={11} textAnchor="end" fontSize={8} fontWeight={900} fill="#2F5E9E">mL</text>);
  }
  return <g pointerEvents="none">{out}</g>;
}

function Vessel({ v, pose, glowL1, hot, grab, onDown }) {
  const T = TYPES[v.type], { w, h, cap } = T;
  const level = (v.amount / cap) * h;
  const { tx, ty, deg, lipX } = pose;
  const clip = `jc-clip-${v.id}`;
  const glass = T.shape !== "masu" && T.shape !== "pot";
  const r = T.shape === "cup" ? 5 : T.shape === "pot" ? 14 : 2;
  return (
    <g transform={`translate(${tx} ${ty}) rotate(${deg} ${lipX} 0)`} onPointerDown={onDown} style={onDown ? { cursor: "grab", touchAction: "none" } : undefined}
      data-vessel={v.id} data-amount={Math.round(v.amount * 100) / 100} className={grab ? "jc-grab" : undefined}>
      <defs><clipPath id={clip}><rect x={0} y={0} width={w} height={h} rx={r} /></clipPath></defs>
      {/* さわれる はんい（すこし ひろめ） */}
      <rect x={-8} y={-10} width={w + 16} height={h + 18} fill="transparent" />
      <rect x={0} y={0} width={w} height={h} rx={r} fill={T.shape === "masu" ? "#FFF6E6" : T.shape === "pot" ? "#FFF3F7" : "rgba(230,244,255,.65)"} />
      {v.amount > 0.01 && (
        <g clipPath={`url(#${clip})`}>
          <g transform={`rotate(${-deg} ${w / 2} ${h - level})`}>
            <rect x={-w * 3} y={h - level} width={w * 7} height={h * 5} fill={JUICE} />
            <rect x={-w * 3} y={h - level} width={w * 7} height={2.5} fill={JUICE_TOP} />
          </g>
        </g>
      )}
      <Marks v={v} T={T} glowL1={glowL1} />
      {T.shape === "masu" && <>
        <rect x={-3} y={-2} width={w + 6} height={h + 5} rx={3} fill="none" stroke="#B98A52" strokeWidth={5} />
        <rect x={-3} y={-2} width={w + 6} height={h + 5} rx={3} fill="none" stroke="#7A4E22" strokeWidth={1} />
      </>}
      {T.shape === "pot" && <>
        <rect x={-2} y={-2} width={w + 4} height={h + 4} rx={r} fill="none" stroke="#E88AB5" strokeWidth={4} />
        <rect x={-5} y={-4} width={w + 10} height={8} rx={4} fill="#FFD3E6" stroke="#E88AB5" strokeWidth={2} />
        <text x={w / 2} y={h * 0.62} textAnchor="middle" fontSize={20} opacity={0.75} pointerEvents="none">🍊</text>
      </>}
      {glass && <>
        <rect x={0} y={0} width={w} height={h} rx={r} fill="none" stroke={hot ? "#E85FA3" : "#7FB2E8"} strokeWidth={hot ? 3.5 : 2.5} />
        <rect x={3} y={4} width={4} height={h - 10} rx={2} fill="#fff" opacity={0.55} pointerEvents="none" />
        {T.shape === "mcup" && <path d={`M${w} ${h * 0.18} q 14 0 14 ${h * 0.22} q 0 ${h * 0.22} -14 ${h * 0.22}`} fill="none" stroke="#7FB2E8" strokeWidth={3} />}
      </>}
      {hot && !glass && <rect x={-7} y={-6} width={w + 14} height={h + 13} rx={6} fill="none" stroke="#E85FA3" strokeWidth={3} strokeDasharray="6 4" />}
    </g>
  );
}

/* vessels：[{ id, type, amount, x, label }]、pours：{ id: [そそげる 相手…] }
   onChange(vessels)：りょうが かわる たびに、onPourEnd(before, after, from, to)：1かい そそぎ おわった とき */
export function PourScene({ vessels, pours, interactive = true, onChange, onPourEnd, glowL1 = false, hint = null }) {
  const svgRef = useRef(null);
  const vref = useRef(vessels); vref.current = vessels;
  const cbs = useRef({}); cbs.current = { onChange, onPourEnd };
  const H = useRef(null);                       // もっている：{ id, grabDX, startY, fx, fy, side, target, tilt, lip:[x,y], before, moved, flowing }
  const R = useRef(null);                       // もどる アニメ：{ id, from:{tx,ty,deg,lipX}, t0 }
  const raf = useRef(0);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => (t + 1) % 1e6);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const toScene = (e) => {
    const svg = svgRef.current, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return [p.x, p.y];
  };
  const restPose = (v) => { const T = TYPES[v.type]; return { tx: v.x - T.w / 2, ty: GROUND - T.h, deg: 0, lipX: T.w }; };

  /* もっている 入れ物の いち（そそげる 相手の 上に すいつく） */
  function heldPose(hd) {
    const v = vref.current.find((x) => x.id === hd.id), T = TYPES[v.type];
    const cx = hd.fx - hd.grabDX;
    let target = null, best = 110;
    for (const id of (pours[hd.id] || [])) {
      const t = vref.current.find((x) => x.id === id);
      const d = Math.abs(t.x - cx);
      if (d < best) { best = d; target = t; }
    }
    const tilt = clamp((hd.fy - hd.startY) / TILT_PX, 0, 1) * MAX_TILT;
    let side = hd.side || 1, lipX, lipY;
    if (target) {
      side = target.x >= cx ? 1 : -1;
      const G = TYPES[target.type];
      lipX = target.x - side * G.w * 0.16;
      lipY = GROUND - G.h - 10 - Math.max(0, 1 - tilt / 50) * T.h * 0.55;
    } else {
      lipX = clamp(cx, T.w / 2, SCENE_W - T.w / 2) + side * T.w / 2;
      lipY = Math.min(GROUND - T.h - 30, 150);
    }
    const lipLocal = side > 0 ? T.w : 0;
    return { target, side, tilt, lip: [lipX, lipY], pose: { tx: lipX - lipLocal, ty: lipY, deg: side * tilt, lipX: lipLocal } };
  }

  const loop = (tPrev) => (tNow) => {
    const hd = H.current;
    const dt = Math.min(0.05, (tNow - tPrev) / 1000);
    if (hd) {
      const hp = heldPose(hd);
      hd.side = hp.side; hd.target = hp.target ? hp.target.id : null; hd.flowing = false;
      if (hp.target) {
        const vs = vref.current;
        const si = vs.findIndex((x) => x.id === hd.id), ti = vs.findIndex((x) => x.id === hp.target.id);
        const r = flowStep(vs[si], vs[ti], hp.tilt, dt, performance.now());
        if (r.move > 0 || r.stickUntil !== (vs[ti].stickUntil || 0)) {
          const a = applyFlow(vs[si], vs[ti], r);
          const nv = vs.slice(); nv[si] = a.src; nv[ti] = a.tgt;
          vref.current = nv; cbs.current.onChange(nv);
          if (r.move > 0) { hd.moved = true; hd.lastTo = hp.target.id; }
        }
        hd.flowing = r.move > 0 || (hp.tilt > lipAngle(vs[si]) && vs[si].amount > 0.01 && performance.now() < (vref.current[ti].stickUntil || 0));
      }
      rerender();
      raf.current = requestAnimationFrame(loop(tNow));
      return;
    }
    const rt = R.current;
    if (rt) {
      if (tNow - rt.t0 >= 220) R.current = null;
      rerender();
      if (R.current) raf.current = requestAnimationFrame(loop(tNow));
    }
  };

  const onDown = (v) => (e) => {
    if (!interactive || H.current) return;
    e.preventDefault(); e.stopPropagation();
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) { /* なし */ }
    const [fx, fy] = toScene(e);
    cancelAnimationFrame(raf.current); R.current = null;
    H.current = { id: v.id, grabDX: fx - v.x, startY: fy, fx, fy, side: 1, target: null, before: vref.current, moved: false };
    raf.current = requestAnimationFrame(loop(performance.now()));
  };
  const onMove = (e) => { const hd = H.current; if (!hd) return; const [fx, fy] = toScene(e); hd.fx = fx; hd.fy = fy; };
  const onUp = () => {
    const hd = H.current; if (!hd) return;
    const hp = heldPose(hd);
    H.current = null;
    // はなした とき：線の ちかくなら ぴったりに
    if (hd.moved && hd.lastTo) {
      const vs = vref.current, si = vs.findIndex((x) => x.id === hd.id), ti = vs.findIndex((x) => x.id === hd.lastTo);
      const s = releaseSnap(vs[si], vs[ti]);
      const nv = vs.map((x, i) => (i === si ? s.src : i === ti ? { ...s.tgt, stickUntil: 0 } : x));
      vref.current = nv; cbs.current.onChange(nv);
      cbs.current.onPourEnd && cbs.current.onPourEnd(hd.before, nv, hd.id, hd.lastTo);
    }
    R.current = { id: hd.id, from: hp.pose, t0: performance.now() };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop(performance.now()));
  };

  /* ---------- 絵 ---------- */
  const hd = H.current, rt = R.current;
  const poses = {}, now = performance.now();
  let stream = null, held = null;
  for (const v of vessels) {
    if (hd && hd.id === v.id) {
      const hp = heldPose(hd); poses[v.id] = hp.pose; held = { v, hp };
      if (hd.flowing && hp.target) {
        const t = vessels.find((x) => x.id === hp.target.id), G = TYPES[t.type];
        const sy = GROUND - (t.amount / G.cap) * G.h, [lx, ly] = hp.lip, s = hp.side;
        stream = `M${lx} ${ly} C ${lx + s * 9} ${ly - 2}, ${lx + s * 7} ${ly + 12}, ${lx + s * 6} ${sy}`;
      }
    } else if (rt && rt.id === v.id) {
      const k = Math.min(1, (now - rt.t0) / 220), e = 1 - (1 - k) * (1 - k), rp = restPose(v), f = rt.from;
      poses[v.id] = { tx: f.tx + (rp.tx - f.tx) * e, ty: f.ty + (rp.ty - f.ty) * e, deg: f.deg * (1 - e), lipX: f.lipX };
    } else poses[v.id] = restPose(v);
  }
  const order = vessels.filter((v) => !(hd && hd.id === v.id) && !(rt && rt.id === v.id)).concat(vessels.filter((v) => (hd && hd.id === v.id) || (rt && rt.id === v.id)));
  const canDrag = (v) => interactive && (pours[v.id] || []).length > 0;

  return (
    <svg ref={svgRef} className="jc-scene" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      role="img" aria-label="ジュースの 入れ物">
      <rect x={0} y={GROUND} width={SCENE_W} height={SCENE_H - GROUND} fill="#E9F7EF" />
      <line x1={0} x2={SCENE_W} y1={GROUND} y2={GROUND} stroke="#9EE6B8" strokeWidth={2} />
      {vessels.map((v) => (
        <text key={"lb" + v.id} x={v.x} y={GROUND + 15} textAnchor="middle" fontSize={10.5} fontWeight={900} fill="#3A2A6B">
          {v.label ? `${v.label}${v.type === "cup" ? "" : "　"}` : ""}{v.type === "cup" ? "" : TYPES[v.type].name}
        </text>
      ))}
      {interactive && !hd && hint && vessels.filter((v) => hint.includes(v.id)).map((v) => (
        <text key={"h" + v.id} x={v.x} y={GROUND - TYPES[v.type].h - 14} textAnchor="middle" fontSize={16} className="jc-hand" pointerEvents="none">👆</text>
      ))}
      {order.map((v) => (
        <Vessel key={v.id} v={v} pose={poses[v.id]} glowL1={glowL1 && v.type === "tank" && v.amount >= 1000 - 0.5}
          hot={hd && hd.target === v.id} grab={hd && hd.id === v.id} onDown={canDrag(v) ? onDown(v) : undefined} />
      ))}
      {stream && <path d={stream} fill="none" stroke={JUICE} strokeWidth={5} strokeLinecap="round" className="jc-stream" pointerEvents="none" />}
      {held && held.hp.tilt < 8 && (
        <text x={clamp(held.hp.lip[0], 70, SCENE_W - 70)} y={Math.max(14, held.hp.pose.ty - 10)} textAnchor="middle" fontSize={11} fontWeight={900} fill="#E85FA3" pointerEvents="none">
          {held.hp.target ? "↓ ゆびを 下へ うごかすと かたむくよ" : "そそぐ 入れ物の ほうへ うごかそう"}
        </text>
      )}
    </svg>
  );
}
