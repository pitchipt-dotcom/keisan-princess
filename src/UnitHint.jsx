/* =====================================================================
   たんいの もんだいの ヒント図（ぜんぶ 自作の SVG）
   ヒント1：cm・mm … テープ図 ＋ ものさし（cmの 目もりと mmの こまかい 目もり）
            L・dL  … 1Lます（10に 区切った 図）
            つかった ぶん／のこり（または あわせた もの）を 色分けし、こたえる ところは「？」
   ヒント2：くりさがりの ある もんだいだけ。1cm（1L）を 10mm（10dL）に ばらす 図
   ===================================================================== */
import React, { useState } from "react";
import { fmtUnit } from "./yomitori.js";

const C = { all: "#BFDDFF", rest: "#FFE58A", used: "#FFB3D6", ink: "#3A2A6B", sub: "#7A5C98", line: "#B9A6D6" };
const tw = (s, size) => [...s].length * size * 0.92;      // 文字の はば（だいたい）

/* ---------- テープ図 ＋ ものさし ---------- */
function Tape({ u }) {
  const { a, b, op } = u;
  const total = op === "+" ? a + b : a;
  const cmMax = Math.ceil(total / 10);
  const X0 = 12, XW = 300, px = XW / (cmMax * 10), X = (mm) => X0 + mm * px;
  const f = (x) => fmtUnit("cm", x);
  const seg = (key, from, to, y, fill, label) => (
    <g key={key}>
      <rect x={X(from)} y={y} width={(to - from) * px} height={22} rx={4} fill={fill} stroke={C.ink} strokeWidth={1.2} />
      {tw(label, 11) < (to - from) * px - 4 && <text x={(X(from) + X(to)) / 2} y={y + 15.5} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>{label}</text>}
    </g>
  );
  const rows = op === "-"
    ? [seg("all", 0, a, 6, C.all, `ぜんぶ ${f(a)}`), seg("rest", 0, a - b, 36, C.rest, "のこり ？"), seg("used", a - b, a, 36, C.used, f(b))]
    : [seg("a", 0, a, 6, C.all, f(a)), seg("b", a, a + b, 6, C.used, f(b)), seg("sum", 0, a + b, 36, C.rest, "ぜんぶで ？")];
  const guides = op === "-" ? [a - b, a] : [a, a + b];
  const step = cmMax > 12 ? 2 : 1;
  const ticks = [];
  for (let i = 0; i <= cmMax * 10; i++) {
    const h = i % 10 === 0 ? 13 : i % 5 === 0 ? 9 : 5;
    ticks.push(<line key={i} x1={X(i)} x2={X(i)} y1={70} y2={70 + h} stroke={C.ink} strokeWidth={i % 10 === 0 ? 1.2 : 0.7} />);
    if (i % (10 * step) === 0) ticks.push(<text key={"n" + i} x={X(i)} y={96} textAnchor="middle" fontSize={10} fill={C.ink}>{i / 10}</text>);
  }
  return (
    <svg viewBox="0 0 340 104" className="uh-svg" role="img" aria-label="テープ図と ものさし">
      {rows}
      {guides.map((g, i) => <line key={i} x1={X(g)} x2={X(g)} y1={58} y2={70} stroke={C.sub} strokeDasharray="2 2" />)}
      <rect x={X0 - 6} y={68} width={XW + 30} height={34} rx={4} fill="#FFF8E1" stroke="#E5C77E" />
      {ticks}
      <text x={334} y={96} textAnchor="end" fontSize={9} fill={C.sub}>cm</text>
    </svg>
  );
}

/* ---------- 1Lます（10に 区切った もの） ---------- */
function Masu({ x, y, cells, w = 30, h = 90 }) {
  // cells[j] … 下から j ばんめの 1dL の 色（null は から）
  const ch = h / 10;
  return (
    <g>
      {cells.map((c, j) => c && <rect key={j} x={x} y={y + h - (j + 1) * ch} width={w} height={ch} fill={c} />)}
      {Array.from({ length: 9 }, (_, j) => <line key={j} x1={x} x2={x + w * (j % 5 === 4 ? 1 : 0.45)} y1={y + h - (j + 1) * ch} y2={y + h - (j + 1) * ch} stroke={C.line} strokeWidth={j === 4 ? 1.2 : 0.8} />)}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={C.ink} strokeWidth={1.5} rx={2} />
    </g>
  );
}
const masuCells = (k, color) => (_, j) => (k * 10 + j < color.n ? color.fill : null);

function Masus({ u }) {
  const { a, b, op } = u;
  const f = (x) => fmtUnit("L", x);
  const out = [];
  let x = 6;
  const y = 14, W = 30, G = 6;
  if (op === "-") {
    const n = Math.ceil(a / 10), r = a - b;
    for (let k = 0; k < n; k++) {
      const cells = Array.from({ length: 10 }, (_, j) => { const i = k * 10 + j; return i < r ? C.rest : i < a ? C.used : null; });
      out.push(<Masu key={k} x={x} y={y} cells={cells} />); x += W + G;
    }
    out.push(<text key="t" x={6} y={124} fontSize={11} fontWeight={700} fill={C.ink}>ぜんぶ {f(a)}</text>);
  } else {
    const group = (amt, fill, key) => {
      const x0 = x;
      for (let k = 0; k < Math.ceil(amt / 10); k++) {
        out.push(<Masu key={key + k} x={x} y={y} cells={Array.from({ length: 10 }, masuCells(k, { n: amt, fill }))} />); x += W + G;
      }
      out.push(<text key={key + "t"} x={(x0 + x - G) / 2} y={124} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>{f(amt)}</text>);
    };
    group(a, C.all, "a");
    out.push(<text key="plus" x={x + 2} y={y + 52} fontSize={20} fontWeight={700} fill={C.ink}>＋</text>); x += 26;
    group(b, C.used, "b");
    out.push(<text key="eq" x={x + 2} y={y + 52} fontSize={16} fontWeight={700} fill={C.ink}>＝？</text>);
  }
  return (
    <svg viewBox="0 0 340 130" className="uh-svg" role="img" aria-label="1Lますの 図">
      <text x={6} y={10} fontSize={9} fill={C.sub}>1つの ますが 1L（1目もりが 1dL）</text>
      {out}
    </svg>
  );
}

/* ---------- ヒント2：1cm（1L）を ばらす ---------- */
function BreakCm() {
  const cells = Array.from({ length: 10 }, (_, i) => (
    <g key={i}>
      <rect x={20 + i * 30} y={70} width={30} height={22} fill={i % 2 ? "#FFD6EA" : "#FFE9F3"} stroke={C.ink} strokeWidth={1} />
      <text x={35 + i * 30} y={85} textAnchor="middle" fontSize={10} fill={C.ink}>1mm</text>
    </g>
  ));
  return (
    <svg viewBox="0 0 340 120" className="uh-svg" role="img" aria-label="1cmを 10mmに ばらす 図">
      <rect x={140} y={6} width={60} height={22} rx={3} fill={C.used} stroke={C.ink} strokeWidth={1.2} />
      <text x={170} y={21} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>1cm</text>
      <path d="M140 30 L20 66 M200 30 L320 66" stroke={C.sub} strokeDasharray="3 3" fill="none" />
      <text x={170} y={52} textAnchor="middle" fontSize={11} fill={C.sub}>ひろげて 見ると…</text>
      {cells}
      <text x={170} y={113} textAnchor="middle" fontSize={15} fontWeight={900} fill="#E85FA3">1cm ＝ 10mm</text>
    </svg>
  );
}
function BreakL() {
  const cups = Array.from({ length: 10 }, (_, i) => (
    <g key={i}>
      <rect x={18 + i * 31} y={74} width={24} height={20} rx={2} fill={C.rest} stroke={C.ink} strokeWidth={1} />
      <text x={30 + i * 31} y={104} textAnchor="middle" fontSize={9} fill={C.ink}>1dL</text>
    </g>
  ));
  return (
    <svg viewBox="0 0 340 130" className="uh-svg" role="img" aria-label="1Lを 10dLに ばらす 図">
      <Masu x={155} y={4} w={30} h={52} cells={Array(10).fill(C.rest)} />
      <text x={195} y={34} fontSize={12} fontWeight={700} fill={C.ink}>1L</text>
      <path d="M155 58 L24 72 M185 58 L330 72" stroke={C.sub} strokeDasharray="3 3" fill="none" />
      {cups}
      <text x={170} y={124} textAnchor="middle" fontSize={15} fontWeight={900} fill="#E85FA3">1L ＝ 10dL</text>
    </svg>
  );
}

const Legend = ({ u }) => (
  <div className="uh-legend">
    {u.op === "-"
      ? <><span><i style={{ background: C.rest }} />のこり（？）</span><span><i style={{ background: C.used }} />{u.sys === "cm" ? "つかった" : "へった"} {fmtUnit(u.sys, u.b)}</span></>
      : <><span><i style={{ background: C.all }} />{fmtUnit(u.sys, u.a)}</span><span><i style={{ background: C.used }} />{fmtUnit(u.sys, u.b)}</span><span><i style={{ background: C.rest }} />ぜんぶで（？）</span></>}
  </div>
);

export function UnitHint({ u, text }) {
  const [tab, setTab] = useState(0);
  const big = u.sys === "cm" ? "cm" : "L", small = u.sys === "cm" ? "mm" : "dL";
  const A = Math.floor(u.a / 10), a2 = u.a % 10;
  return (
    <div className="uh-wrap">
      {u.borrow && (
        <div className="uh-tabs">
          <button className={tab === 0 ? "uh-tab-on" : ""} onClick={() => setTab(0)}>ヒント1：{u.sys === "cm" ? "テープ図" : "ますの 図"}</button>
          <button className={tab === 1 ? "uh-tab-on" : ""} onClick={() => setTab(1)}>ヒント2：1{big}を ばらす</button>
        </div>
      )}
      {tab === 0 ? (
        <>
          {u.sys === "cm" ? <Tape u={u} /> : <Masus u={u} />}
          <Legend u={u} />
        </>
      ) : (
        <>
          {u.sys === "cm" ? <BreakCm /> : <BreakL />}
          <div className="uh-break">{fmtUnit(u.sys, u.a)} → <b>{A - 1}{big} と {10 + a2}{small}</b></div>
        </>
      )}
      <div className="uh-text">{text}</div>
    </div>
  );
}
