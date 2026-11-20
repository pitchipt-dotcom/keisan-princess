/* =====================================================================
   ますめの花畑 — 花畑（ます目）と 花だん（形）の 絵（SVG）
   - 花だんは 花の 色で ぬった 区画。うごかせる 部分は 黄色（ヒントで 光る）
   - うごかせる 部分は 指で ドラッグ → ます目に ぴったりの いちで すいつく。タップで 右に 90° まわる
   - かぞえる：1ますずつ ばんごう（三角 2つで 1ますの ときは 2つに 同じ ばんごう）
   計算は masume.js
   ===================================================================== */
import React, { useRef, useState } from "react";
import { pieceTiles, analyze, key, unkey } from "./masume.js";

const FIX = "#FF9EC7", FIX_LINE = "#D9488F", MOV = "#FFD36E", MOV_LINE = "#E59A1A";
const TRI_PTS = { tl: [[0, 0], [1, 0], [0, 1]], tr: [[0, 0], [1, 0], [1, 1]], br: [[1, 0], [1, 1], [0, 1]], bl: [[0, 0], [1, 1], [0, 1]] };
const CENTROID = { f: [0.5, 0.5], tl: [0.32, 0.32], tr: [0.68, 0.32], br: [0.68, 0.68], bl: [0.32, 0.68] };

function Tile({ t, C, fill, line, flower = true }) {
  const px = t.x * C, py = t.y * C;
  const [cx, cy] = CENTROID[t.k];
  return (
    <g>
      {t.k === "f" ? <rect x={px + 1} y={py + 1} width={C - 2} height={C - 2} rx={3} fill={fill} stroke={line} strokeWidth={1.6} />
        : <polygon points={TRI_PTS[t.k].map(([a, b]) => `${px + a * C},${py + b * C}`).join(" ")} fill={fill} stroke={line} strokeWidth={1.6} strokeLinejoin="round" />}
      {flower && C >= 30 && <text x={px + cx * C} y={py + cy * C + C * 0.11} textAnchor="middle" fontSize={C * 0.3} opacity={0.55} pointerEvents="none">✿</text>}
    </g>
  );
}

/* prob：{ fixed, pieces } か { shape:[tiles] }、W・H：ます目の 数
   labels：[{ cells:[key], n }] を shown こ まで 出す、taps：{ key: n }（だんかい1 の タップで かぞえる）
   onPieces(pieces) … うごかした あと、onCellTap(key) … ますを タップ */
export function MasumeField({ W, H, fixed, pieces = [], onPieces, labels = [], shown = Infinity, taps = null, onCellTap, glow = false, C = 44, small = false, onDragState }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);         // { id, sx, sy, dx, dy }
  const pad = small ? 2 : 4;
  const VW = W * C + pad * 2, VH = H * C + pad * 2;

  const pt = (e) => { const s = svgRef.current, p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(s.getScreenCTM().inverse()); return [q.x, q.y]; };
  const down = (pc) => (e) => {
    if (!onPieces) return;
    e.preventDefault(); e.stopPropagation();
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (_) { /* なし */ }
    const [x, y] = pt(e);
    setDrag({ id: pc.id, sx: x, sy: y, dx: 0, dy: 0 }); onDragState && onDragState(true);
  };
  const move = (e) => { if (!drag) return; const [x, y] = pt(e); setDrag({ ...drag, dx: x - drag.sx, dy: y - drag.sy }); };
  const up = () => {
    if (!drag) return;
    const d = drag; setDrag(null); onDragState && onDragState(false);
    const i = pieces.findIndex((p) => p.id === d.id), pc = pieces[i];
    let np;
    if (Math.hypot(d.dx, d.dy) < 8) np = { ...pc, rot: (pc.rot + 1) % 4 };                       // タップ：まわす
    else np = { ...pc, x: pc.x + Math.round(d.dx / C), y: pc.y + Math.round(d.dy / C) };          // ドラッグ：ます目に すいつく
    const ts = pieceTiles(np);
    const inside = ts.every((t) => t.x >= 0 && t.y >= 0 && t.x < W && t.y < H);
    onPieces(pieces.map((p, j) => (j === i ? (inside ? np : pc) : p)), { moved: inside && np !== pc, rotated: np.rot !== pc.rot, outside: !inside, id: pc.id });
  };

  const all = [...fixed, ...pieces.flatMap((p) => pieceTiles(p))];
  const a = analyze(all);
  const tapMode = !!onCellTap;
  const labelAt = [];
  labels.slice(0, shown).forEach((l) => l.cells.forEach((k) => {
    const [x, y] = unkey(k);
    const ks = all.filter((t) => t.x === x && t.y === y).map((t) => t.k);
    const kind = ks.length === 1 ? ks[0] : "f";
    labelAt.push({ x, y, kind, n: l.n, pair: l.pair });
  }));

  return (
    <svg ref={svgRef} className={"ms-field" + (small ? " ms-field-small" : "")} viewBox={`${-pad} ${-pad} ${VW} ${VH}`} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      role="img" aria-label="花畑の ます目">
      <rect x={-pad} y={-pad} width={VW} height={VH} rx={small ? 6 : 12} fill="#E3F6E4" />
      {Array.from({ length: W + 1 }, (_, i) => <line key={"v" + i} x1={i * C} x2={i * C} y1={0} y2={H * C} stroke="#B5DDB9" strokeWidth={1} />)}
      {Array.from({ length: H + 1 }, (_, i) => <line key={"h" + i} y1={i * C} y2={i * C} x1={0} x2={W * C} stroke="#B5DDB9" strokeWidth={1} />)}
      {fixed.map((t, i) => <Tile key={"f" + i} t={t} C={C} fill={FIX} line={FIX_LINE} />)}
      {tapMode && a.full.map((k) => { const [x, y] = unkey(k); return (
        <rect key={"tap" + k} x={x * C} y={y * C} width={C} height={C} fill="transparent" style={{ cursor: "pointer" }} data-cell={k}
          onClick={() => onCellTap(k)} />); })}
      {pieces.map((p) => {
        const isDrag = drag && drag.id === p.id;
        return (
          <g key={p.id} transform={isDrag ? `translate(${drag.dx} ${drag.dy})` : undefined} onPointerDown={down(p)} data-piece={p.id}
            className={(glow ? "ms-glow" : "") + (isDrag ? " ms-dragging" : "")} style={onPieces ? { cursor: "grab", touchAction: "none" } : undefined}>
            {pieceTiles(p).map((t, i) => <Tile key={i} t={t} C={C} fill={MOV} line={MOV_LINE} />)}
            {/* さわりやすく：ますの 大きさの すきとおった わく */}
            {onPieces && pieceTiles(p).map((t, i) => <rect key={"hit" + i} x={t.x * C} y={t.y * C} width={C} height={C} fill="transparent" />)}
          </g>
        );
      })}
      {!drag && a.overlap.map((k) => { const [x, y] = unkey(k); return <rect key={"ov" + k} x={x * C + 2} y={y * C + 2} width={C - 4} height={C - 4} rx={4} fill="none" stroke="#E0443E" strokeWidth={3} strokeDasharray="5 3" />; })}
      {taps && Object.entries(taps).map(([k, n]) => { const [x, y] = unkey(k); return (
        <g key={"tn" + k} pointerEvents="none">
          <circle cx={x * C + C / 2} cy={y * C + C / 2} r={C * 0.3} fill="#fff" stroke="#E85FA3" strokeWidth={2} />
          <text x={x * C + C / 2} y={y * C + C / 2 + C * 0.12} textAnchor="middle" fontSize={C * 0.34} fontWeight={900} fill="#3A2A6B">{n}</text>
        </g>); })}
      {labelAt.map((l, i) => {
        const [cx, cy] = CENTROID[l.kind];
        return (
          <g key={"lb" + i} pointerEvents="none" className="ms-num">
            <circle cx={l.x * C + cx * C} cy={l.y * C + cy * C} r={C * (l.pair ? 0.2 : 0.27)} fill={l.pair ? "#FFF6D6" : "#fff"} stroke={l.pair ? "#E59A1A" : "#E85FA3"} strokeWidth={small ? 1.2 : 2} />
            <text x={l.x * C + cx * C} y={l.y * C + cy * C + C * (l.pair ? 0.08 : 0.11)} textAnchor="middle" fontSize={C * (l.pair ? 0.24 : 0.32)} fontWeight={900} fill="#3A2A6B">{l.n}</text>
          </g>
        );
      })}
    </svg>
  );
}
export { key };
