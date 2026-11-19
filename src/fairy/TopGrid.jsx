/* =====================================================================
   つみきの森 — 真上から 見た マス目（紙の テストと 同じ 見え方。SVG）
   ななめの 3D と 同じ じょうたいを 同時に 見せる。だんかい2では ここを タップして よそうする
   - stamps：紙に ついた マス（ばんごうと 色は 3D・きろくと 同じ。同じ マスは あとの ものが 上）
   - pattern：だんかい3の もよう（うすい 色）
   - predicted：よそうした マス、result：こたえあわせ（hit／missed／extra）
   ===================================================================== */
import React from "react";
import { footprint, stampColor, NUM, unkey, key, POSE_LABEL } from "./tsumiki.js";

const INK = "#3A2A6B";

export function TopGrid({ n, block, stamps = [], pattern = [], startCell, predicted, result, onCellTap, showLabels = true, small = false }) {
  const C = 40, PAD = showLabels ? 16 : 3, W = n * C + 6, H = n * C + PAD * 2;
  const last = {};
  for (const st of stamps) for (const [x, y] of st.cells) last[key(x, y)] = st.no;
  const res = result ? { hit: new Set(result.hit), missed: new Set(result.missed), extra: new Set(result.extra) } : null;
  const cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const k = key(x, y), px = 3 + x * C, py = PAD + y * C, no = last[k];
    const pat = pattern.includes(k);
    cells.push(
      <g key={k} onClick={onCellTap ? () => onCellTap(k) : undefined} style={onCellTap ? { cursor: "pointer" } : undefined}
        role={onCellTap ? "button" : undefined} aria-label={onCellTap ? `よこ ${x + 1} たて ${y + 1}` : undefined}>
        <rect x={px} y={py} width={C} height={C} fill="#FFFDF7" stroke="#C9B3E6" strokeWidth={1} />
        {pat && !no && <rect x={px + 3} y={py + 3} width={C - 6} height={C - 6} rx={6} fill="rgba(201,168,240,.45)" stroke="#9B7BD0" strokeWidth={1.5} strokeDasharray="4 3" />}
        {no && <>
          <rect x={px + 2.5} y={py + 2.5} width={C - 5} height={C - 5} rx={6} fill={stampColor(no)} />
          <text x={px + C / 2} y={py + C / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={900} fill={INK}>{NUM(no)}</text>
        </>}
        {predicted && predicted.has(k) && !no && !res && <circle cx={px + C / 2} cy={py + C / 2} r={11} fill="#BFE3FF" stroke="#4A7BD0" strokeWidth={2.5} />}
        {res && res.hit.has(k) && <circle cx={px + C / 2} cy={py + C / 2} r={16} fill="none" stroke="#2FAF8E" strokeWidth={3} />}
        {res && res.missed.has(k) && <rect x={px + 1.5} y={py + 1.5} width={C - 3} height={C - 3} rx={6} fill="none" stroke="#E85FA3" strokeWidth={3} strokeDasharray="5 3" />}
        {res && res.extra.has(k) && <circle cx={px + C / 2} cy={py + C / 2} r={11} fill="none" stroke="#9A8BB0" strokeWidth={2} strokeDasharray="3 3" />}
      </g>,
    );
  }
  const fp = block ? footprint(block) : [];
  const xs = fp.map((c) => c[0]), ys = fp.map((c) => c[1]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={"ts-top" + (small ? " ts-top-small" : "")} role="img" aria-label="真上から 見た マス目">
      {showLabels && <text x={W / 2} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#7A5C98">おく ↑</text>}
      {cells}
      {startCell && !last[key(...startCell)] && (
        <text x={3 + startCell[0] * C + 4} y={PAD + startCell[1] * C + 12} fontSize={10} fontWeight={900} fill="#E85FA3">S</text>
      )}
      {fp.length > 0 && (
        <g pointerEvents="none">
          <rect x={3 + Math.min(...xs) * C + 6} y={PAD + Math.min(...ys) * C + 6} width={(Math.max(...xs) - Math.min(...xs) + 1) * C - 12} height={(Math.max(...ys) - Math.min(...ys) + 1) * C - 12}
            rx={5} fill="rgba(255,241,210,.55)" stroke="#C89A5A" strokeWidth={3} />
        </g>
      )}
      {showLabels && <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={11} fontWeight={700} fill="#7A5C98">てまえ ↓</text>}
    </svg>
  );
}

/* 直方体を 入れる ときの「たっている／ねている」の 見た目と ことば（今回の 立方体では 出さない） */
export function PoseBadge({ block }) {
  if (!block || block.kind !== "cuboid") return null;
  const p = POSE_LABEL[block.pose];
  return (
    <span className={"ts-pose ts-pose-" + (block.pose === "stand" ? "stand" : "lie")} title={p.text}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        {block.pose === "stand" ? <rect x="8" y="2" width="8" height="20" rx="2" fill="#FFF1D2" stroke={INK} strokeWidth="1.6" />
          : <rect x="2" y="8" width="20" height="8" rx="2" fill="#FFF1D2" stroke={INK} strokeWidth="1.6" />}
      </svg>
      {p.text}
    </span>
  );
}

/* 転がした きろく：紙に ついた マスを じゅんに ①→②→③（色は 盤面と 同じ） */
export function RollLog({ stamps, moves, title = "ころがした きろく", reverse = false }) {
  return (
    <div className="ts-log">
      <span className="ts-log-title">{title}</span>
      <div className="ts-log-row" ref={(el) => { if (el) el.scrollLeft = reverse ? 0 : el.scrollWidth; }}>
        {stamps.map((st, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="ts-log-arrow">{moves[i - 1] ? moves[i - 1] : ""}{reverse ? "←" : "→"}</span>}
            <span className="ts-log-chip" style={{ background: stampColor(st.no) }}>{NUM(st.no)}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
export { unkey };
