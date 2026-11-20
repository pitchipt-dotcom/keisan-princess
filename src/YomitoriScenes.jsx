/* =====================================================================
   よみとりチェック — 場面の 絵（1つの 式の もんだい）
   お話の じゅんに 場面を ならべる。数の ぶんだけ モノを ならべるのは この SVG で 組み立てる
   - 10こ以上は「10この まとまり（シートや ふくろ）」と「ばら」で あらわす
   - さいごの 場面（ask）は こたえを 出さず「？」
   人物・モノの 絵は src/assets/yomitori/ の 素材を 名前で よぶ（無ければ ○に 1文字で 代わりに する）
   ===================================================================== */
import React from "react";
import { asset, PEOPLE, OBJECTS } from "./assets/yomitori/index.js";

const INK = "#3A2A6B";
const NUM = ["①", "②", "③", "④", "⑤"];

/* people：{ 名前: { name, url } } … おはなし もんだいの ルナ・マリン・ロゼ など（無ければ src/assets/yomitori/ の 人物） */
function Person({ who, x, y, size = 30, people }) {
  const pp = people && people[who];
  const url = pp ? pp.url : asset(who), label = pp ? pp.name : PEOPLE[who];
  return (
    <g>
      {url ? <image href={url} x={x} y={y} width={size} height={size} />
        : <><circle cx={x + size / 2} cy={y + size / 2} r={size / 2 - 1} fill="#FBF7FF" stroke={INK} />
          <text x={x + size / 2} y={y + size / 2 + 4} textAnchor="middle" fontSize={11} fill={INK}>{(label || "?")[0]}</text></>}
      <text x={x + size / 2} y={y + size + 8} textAnchor="middle" fontSize={8} fill="#7A5C98">{label || who}</text>
    </g>
  );
}

function Thing({ name, x, y, w, h }) {
  const url = asset(name);
  return url ? <image href={url} x={x} y={y} width={w} height={h} />
    : <rect x={x} y={y} width={w} height={h} rx={3} fill="#FFE58A" stroke={INK} strokeWidth={0.6} />;
}

// 10この まとまり。素材（名前-10）が 無ければ 1こ分を わくで かこんで「10」
function Pack({ obj, x, y, k = 1 }) {
  const W = 16 * k, H = 21 * k;
  if (asset(obj + "-10")) return <Thing name={obj + "-10"} x={x} y={y} w={W} h={H} />;
  return (
    <g>
      <rect x={x} y={y} width={W} height={H} rx={3} fill="#fff" stroke={INK} strokeWidth={0.8} />
      <Thing name={obj} x={x + 1.5 * k} y={y + 1 * k} w={13 * k} h={13 * k} />
      <text x={x + W / 2} y={y + H - 1.5 * k} textAnchor="middle" fontSize={6.5 * k} fontWeight={700} fill={INK}>10</text>
    </g>
  );
}

// n こを「まとまり」＋「ばら」で 箱（x, y, w, h）の 中に ならべる
// k … 大きさ（人物の いない 場面は 大きく かく）
function Things({ obj, n, x, y, w, h, k = 1 }) {
  const packs = Math.floor(n / 10), ones = n % 10;
  const PH = 21 * k, PW = 17 * k, S = 12 * k, SG = 13 * k;
  const rowsOnes = Math.ceil(ones / 5);
  const totalH = (packs ? PH : 0) + (packs && ones ? 3 : 0) + rowsOnes * SG;
  let cy = y + Math.max(0, (h - totalH) / 2);
  const out = [];
  if (packs) {
    const x0 = x + (w - packs * PW + 1) / 2;
    for (let i = 0; i < packs; i++) out.push(<Pack key={"p" + i} obj={obj} x={x0 + i * PW} y={cy} k={k} />);
    cy += PH + (ones ? 3 : 0);
  }
  for (let r = 0; r < rowsOnes; r++) {
    const k = Math.min(5, ones - r * 5), x0 = x + (w - k * SG + 1) / 2;
    for (let i = 0; i < k; i++) out.push(<Thing key={`o${r}-${i}`} name={obj} x={x0 + i * SG} y={cy + r * SG} w={S} h={S} />);
  }
  return <g>{out}</g>;
}

function Panel({ sc, i, people }) {
  const unit = sc.obj ? (OBJECTS[sc.obj] || {}).unit || "" : "";
  let body;
  if (sc.kind === "move") {
    body = (
      <>
        <Person who={sc.from} x={4} y={5} people={people} />
        <Person who={sc.to} x={86} y={5} people={people} />
        <path d="M38 21 L80 21" stroke="#E85FA3" strokeWidth={3} strokeLinecap="round" />
        <path d="M74 15 L81 21 L74 27" fill="none" stroke="#E85FA3" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <text x={59} y={14} textAnchor="middle" fontSize={8} fontWeight={700} fill="#E85FA3">{sc.cap}</text>
        <Things obj={sc.obj} n={sc.n} x={4} y={47} w={112} h={60} />
      </>
    );
  } else if (sc.kind === "ask") {
    body = (
      <>
        {sc.who && <Person who={sc.who} x={45} y={6} people={people} />}
        <text x={60} y={sc.who ? 88 : 72} textAnchor="middle" fontSize={sc.who ? 34 : 46} fontWeight={900} fill="#C9A8F0">？</text>
      </>
    );
  } else {
    body = (
      <>
        {sc.who && <Person who={sc.who} x={45} y={3} people={people} />}
        <Things obj={sc.obj} n={sc.n} x={4} y={sc.who ? 44 : 14} w={112} h={sc.who ? 52 : 82} k={sc.who ? 1 : 1.35} />
      </>
    );
  }
  return (
    <svg viewBox="0 0 120 128" className="ys-panel" role="img"
      aria-label={sc.kind === "ask" ? sc.cap : `${(people && people[sc.who || sc.from] ? people[sc.who || sc.from].name : PEOPLE[sc.who || sc.from]) || ""} ${sc.n}${unit}`}>
      <rect x={0.5} y={0.5} width={119} height={127} rx={10} fill={sc.kind === "ask" ? "#FBF7FF" : "#FFFDF7"} stroke="#EAD9F5" />
      <text x={7} y={14} fontSize={12} fontWeight={700} fill="#B48CE8">{NUM[i]}</text>
      {body}
      {sc.kind === "ask"
        ? <text x={60} y={118} textAnchor="middle" fontSize={11} fontWeight={900} fill={INK}>{sc.cap}</text>
        : <>
          {sc.kind !== "move" && <text x={60} y={106} textAnchor="middle" fontSize={9} fill="#7A5C98">{sc.cap}</text>}
          <text x={60} y={121} textAnchor="middle" fontSize={13} fontWeight={900} fill={INK}>{sc.n}{unit}</text>
        </>}
    </svg>
  );
}

export function YomitoriScenes({ scenes, people }) {
  const wide = scenes.length > 3;
  return (
    <div className="ys-wrap">
      <div className={"ys-strip" + (wide ? " ys-scroll" : "")}>
        {scenes.map((sc, i) => <Panel key={i} sc={sc} i={i} people={people} />)}
      </div>
      {wide && <div className="ys-more">よこに うごかすと つづきが 見られるよ →</div>}
    </div>
  );
}
