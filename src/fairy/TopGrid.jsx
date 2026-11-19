/* =====================================================================
   つみきの森 — 真上から 見た 盤（紙の テストと 同じ 見え方。SVG）
   ななめの 3D と 同じ じょうたいを 同時に 見せる。だんかい2では ここを タップして よそうする
   - board：{ w, h, cells } … 盤の マスだけ かく（L字・T字・すき間の ある 形も）
   - stamps：紙に ついた マス（ばんごうと 色は 3D・きろくと 同じ。同じ マスは あとの ものが 上）
   - pattern：だんかい3の「ぬる マス」（点線）
   - predicted：よそうした マス、result：こたえあわせ（hit あたり／missed たりない／extra よけい）
   - startTag：「スタート」の ふだ
   ===================================================================== */
import React from "react";
import { footprint, stampColor, NUM, key, POSE_LABEL } from "./tsumiki.js";

const INK = "#3A2A6B";

export function TopGrid({ board, block, stamps = [], pattern = [], startTag, predicted, result, onCellTap, showLabels = true, small = false }) {
  const C = 40, PAD = showLabels ? 16 : 3, W = board.w * C + 6, H = board.h * C + PAD * 2;
  const on = new Set(board.cells), pat = new Set(pattern);
  const last = {};
  for (const st of stamps) for (const [x, y] of st.cells) last[key(x, y)] = st.no;
  const res = result ? { hit: new Set(result.hit), missed: new Set(result.missed), extra: new Set(result.extra) } : null;
  const cells = [];
  for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) {
    const k = key(x, y);
    if (!on.has(k)) continue;
    const px = 3 + x * C, py = PAD + y * C, no = last[k];
    const tap = onCellTap && !no;
    cells.push(
      <g key={k} onClick={tap ? () => onCellTap(k) : undefined} style={tap ? { cursor: "pointer" } : undefined}
        role={tap ? "button" : undefined} aria-label={tap ? `よこ ${x + 1} たて ${y + 1}` : undefined} data-cell={k}>
        <rect x={px} y={py} width={C} height={C} fill="#FFFDF7" stroke="#C9B3E6" strokeWidth={1.2} />
        {pat.has(k) && !no && <rect x={px + 3} y={py + 3} width={C - 6} height={C - 6} rx={6} fill="rgba(201,168,240,.45)" stroke="#9B7BD0" strokeWidth={1.5} strokeDasharray="4 3" />}
        {no && <>
          <rect x={px + 2.5} y={py + 2.5} width={C - 5} height={C - 5} rx={6} fill={stampColor(no)} />
          <text x={px + C / 2} y={py + C / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={900} fill={INK}>{NUM(no)}</text>
        </>}
        {predicted && predicted.has(k) && !no && !res && <circle cx={px + C / 2} cy={py + C / 2} r={12} fill="#BFE3FF" stroke="#4A7BD0" strokeWidth={2.5} />}
        {res && res.hit.has(k) && <rect x={px + 1.5} y={py + 1.5} width={C - 3} height={C - 3} rx={7} fill="rgba(95,199,154,.28)" stroke="#2FAF8E" strokeWidth={3.5} />}
        {res && res.missed.has(k) && <>
          <rect x={px + 1.5} y={py + 1.5} width={C - 3} height={C - 3} rx={7} fill="rgba(255,143,196,.25)" stroke="#E85FA3" strokeWidth={3.5} strokeDasharray="6 3" />
          <text x={px + C - 7} y={py + 13} textAnchor="middle" fontSize={13} fontWeight={900} fill="#E85FA3">!</text>
        </>}
        {res && res.extra.has(k) && <circle cx={px + C / 2} cy={py + C / 2} r={12} fill="rgba(154,139,176,.18)" stroke="#9A8BB0" strokeWidth={2.5} strokeDasharray="3 3" />}
      </g>,
    );
  }
  const fp = block ? footprint(block) : [];
  const xs = fp.map((c) => c[0]), ys = fp.map((c) => c[1]);
  const st = startTag ? footprint(startTag)[0] : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={"ts-top" + (small ? " ts-top-small" : "")} role="img" aria-label="真上から 見た 盤">
      {showLabels && <text x={W / 2} y={12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#7A5C98">おく ↑</text>}
      {cells}
      {fp.length > 0 && (
        <g pointerEvents="none">
          <rect x={3 + Math.min(...xs) * C + 6} y={PAD + Math.min(...ys) * C + 6} width={(Math.max(...xs) - Math.min(...xs) + 1) * C - 12} height={(Math.max(...ys) - Math.min(...ys) + 1) * C - 12}
            rx={5} fill="rgba(255,241,210,.55)" stroke="#C89A5A" strokeWidth={3} />
          {block.kind === "cuboid" && block.pose === "stand" && <rect x={3 + xs[0] * C + 14} y={PAD + ys[0] * C + 14} width={C - 28} height={C - 28} rx={2} fill="#C89A5A" opacity={0.55} />}
        </g>
      )}
      {st && (
        <g pointerEvents="none">
          <rect x={3 + st[0] * C + C / 2 - 21} y={PAD + st[1] * C - 7} width={42} height={14} rx={7} fill="#E85FA3" />
          <text x={3 + st[0] * C + C / 2} y={PAD + st[1] * C + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={900} fill="#fff">スタート</text>
        </g>
      )}
      {showLabels && <text x={W / 2} y={H - 3} textAnchor="middle" fontSize={11} fontWeight={700} fill="#7A5C98">てまえ ↓</text>}
    </svg>
  );
}

/* 直方体の「たっている／ねている」の 見た目と ことば */
export function PoseIcon({ pose, size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {pose === "stand" ? <rect x="8" y="2" width="8" height="20" rx="2" fill="#FFF1D2" stroke={INK} strokeWidth="1.8" />
        : <rect x="2" y="8" width="20" height="8" rx="2" fill="#FFF1D2" stroke={INK} strokeWidth="1.8" />}
      <line x1={pose === "stand" ? 8 : 12} y1={pose === "stand" ? 12 : 8} x2={pose === "stand" ? 16 : 12} y2={pose === "stand" ? 12 : 16} stroke="#C89A5A" strokeWidth="1.4" />
    </svg>
  );
}
export function PoseBadge({ block }) {
  if (!block || block.kind !== "cuboid") return null;
  const p = POSE_LABEL[block.pose];
  return (
    <span className={"ts-pose ts-pose-" + (block.pose === "stand" ? "stand" : "lie")} aria-live="polite">
      <PoseIcon pose={block.pose} size={20} />
      <b>{p.short}</b><small>（紙に つくのは {block.pose === "stand" ? "1マス" : "2マス"}）</small>
    </span>
  );
}

/* 転がした きろく：紙に ついた マスを じゅんに ①→②→③（色は 盤面と 同じ。直方体は たつ／ねるも） */
export function RollLog({ stamps, moves, title = "ころがした きろく" }) {
  return (
    <div className="ts-log">
      <span className="ts-log-title">{title}</span>
      <div className="ts-log-row" ref={(el) => { if (el) el.scrollLeft = el.scrollWidth; }}>
        {stamps.map((st, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="ts-log-arrow">{moves[i - 1] || ""}→</span>}
            <span className="ts-log-chip" style={{ background: stampColor(st.no) }}>
              {NUM(st.no)}{st.pose && st.kind === "cuboid" && <PoseIcon pose={st.pose} size={13} />}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
