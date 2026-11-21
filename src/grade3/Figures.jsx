/* =====================================================================
   3年生の 図（うごかして わかる ／ ヒント）
   - わり算：クッキーを おさらに くばる（CookieDeal）。いくつずつ（share）／いくつ分（group）／あまり
   - 小数：ジュースの泉の そそぐ 操作（PourScene）を そのまま つかう。0.1Lます・1Lます（目もりは L）
   - 分数：ケーキ・ピザを 同じ 大きさに わけて 色を ぬる（FracShape）。大きさくらべ（FracWall）
   - ようせいの くに（毎日計算の 1もん）：展開図（NetView）・1Lますの ジュース（JuiceLevel）
   絵：src/assets/grade3/ に 本番の 絵が あれば それ、なければ かりの 絵（ここの SVG）
   ===================================================================== */
import React, { useEffect, useState } from "react";
import { g3Art } from "../assets/grade3/index.js";
import { fmtDec } from "./g3.js";

/* ---------------- かりの 絵 ---------------- */
export function Cookie({ size = 18 }) {
  const a = g3Art("cookie");
  if (a) return <img src={a} alt="" width={size} height={size} className="g3-img" draggable={false} />;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#E9B26A" stroke="#B9792F" strokeWidth="1.4" />
      <circle cx="6.5" cy="7" r="1.6" fill="#6B3E1E" /><circle cx="12.5" cy="6" r="1.3" fill="#6B3E1E" />
      <circle cx="13" cy="12.5" r="1.7" fill="#6B3E1E" /><circle cx="7.5" cy="13" r="1.2" fill="#6B3E1E" />
    </svg>
  );
}
function PlateBg() {
  const a = g3Art("plate");
  if (a) return <img src={a} alt="" className="g3-plate-img" draggable={false} />;
  return (
    <svg className="g3-plate-img" viewBox="0 0 100 70" aria-hidden="true" preserveAspectRatio="none">
      <ellipse cx="50" cy="38" rx="48" ry="30" fill="#fff" stroke="#C9A8F0" strokeWidth="3" />
      <ellipse cx="50" cy="38" rx="34" ry="20" fill="#FBF7FF" stroke="#E7D2F7" strokeWidth="2" />
    </svg>
  );
}
function JarPic() {
  const a = g3Art("cookie-jar");
  if (a) return <img src={a} alt="" className="g3-jar-img" draggable={false} />;
  return (
    <svg className="g3-jar-img" viewBox="0 0 80 90" aria-hidden="true">
      <rect x="16" y="4" width="48" height="12" rx="5" fill="#FFB3C7" stroke="#E85FA3" strokeWidth="2" />
      <path d="M12 22 Q12 16 20 16 H60 Q68 16 68 22 V78 Q68 86 58 86 H22 Q12 86 12 78 Z" fill="rgba(230,244,255,.8)" stroke="#7FB2E8" strokeWidth="3" />
      <circle cx="30" cy="62" r="9" fill="#E9B26A" /><circle cx="50" cy="66" r="9" fill="#E9B26A" /><circle cx="40" cy="48" r="9" fill="#E9B26A" />
    </svg>
  );
}

/* ================= わり算：クッキーを くばる =================
   mode "share"：plates まいの おさらに 同じ数ずつ（いくつずつ？）
     おさらを タップ → 1こ のせる／「1こずつ くばる」→ ぜんぶの おさらに 1こずつ
   mode "group"：per こずつ おさらに のせる（いくつ分？）。びんを タップ → 1こ のせる（いっぱいに なったら つぎの おさら）
   おわり：share … のこりが おさらの 数より 少なく、ぜんぶ 同じ数  → onDone({ each, rest })
           group … さいごの おさらが いっぱいで、のこりが per より 少ない → onDone({ groups, rest }) */
export function CookieDeal({ total, plates = 0, per = 0, mode = "share", sfx, onDone, small = false, frozen = false }) {
  const init = () => ({ jar: total, on: mode === "share" ? Array(plates).fill(0) : [] });
  const [st, setSt] = useState(init);
  const [done, setDone] = useState(null);
  useEffect(() => { setSt(init()); setDone(null); /* eslint-disable-next-line */ }, [total, plates, per, mode]);
  const tap = () => sfx && sfx.tap && sfx.tap();

  const check = (s) => {
    if (mode === "share") {
      if (s.jar >= plates) return null;
      const eq = s.on.every((n) => n === s.on[0]);
      return eq ? { each: s.on[0], rest: s.jar } : { uneven: true };
    }
    const last = s.on[s.on.length - 1];
    if ((s.on.length === 0 || last === per) && s.jar < per) return { groups: s.on.length, rest: s.jar };
    return null;
  };
  const apply = (s) => {
    setSt(s);
    const c = check(s);
    if (c && !c.uneven && !done) { setDone(c); sfx && sfx.correct && sfx.correct(); onDone && onDone(c); }
    else if (c && c.uneven) setDone(c);
    else setDone(null);
  };
  const addTo = (i) => {
    if (frozen) return;
    if (done && !done.uneven) return;
    if (st.jar <= 0) return;
    tap();
    const on = st.on.slice(); on[i]++;
    apply({ jar: st.jar - 1, on });
  };
  const dealRound = () => {
    if (frozen) return;
    if (done && !done.uneven) return;
    if (st.jar < plates) return;
    tap();
    apply({ jar: st.jar - plates, on: st.on.map((n) => n + 1) });
  };
  const putGroup = () => {
    if (frozen) return;
    if (done && !done.uneven) return;
    if (st.jar <= 0) return;
    const last = st.on[st.on.length - 1];
    if ((st.on.length === 0 || last === per) && st.jar < per) return;
    tap();
    const on = st.on.slice();
    if (on.length === 0 || on[on.length - 1] >= per) on.push(1); else on[on.length - 1]++;
    apply({ jar: st.jar - 1, on });
  };
  const reset = () => { tap(); setSt(init()); setDone(null); };

  const cs = small ? 14 : 18;
  const restLabel = done && !done.uneven && done.rest > 0;
  return (
    <div className={"g3-cookies" + (small ? " g3-cookies-small" : "")}>
      <div className="g3-jar-row">
        <button className="g3-jar" onClick={mode === "group" ? putGroup : undefined} disabled={mode !== "group"} aria-label="クッキーの びん">
          <JarPic />
          <span className="g3-jar-count">のこり <b>{st.jar}</b>こ</span>
        </button>
        {restLabel && (
          <div className="g3-rest">
            <div className="g3-rest-cookies">{Array.from({ length: st.jar }, (_, i) => <Cookie key={i} size={cs} />)}</div>
            <b>あまり {st.jar}こ</b>
          </div>
        )}
      </div>
      <div className="g3-plates">
        {st.on.map((n, i) => (
          <button key={i} className={"g3-plate" + (mode === "group" && n === per ? " g3-plate-full" : "")} onClick={mode === "share" ? () => addTo(i) : putGroup}
            aria-label={`${i + 1}まいめの おさら ${n}こ`}>
            <PlateBg />
            <span className="g3-plate-cookies" style={{ gridTemplateColumns: `repeat(${n > 4 ? 3 : 2}, auto)` }}>
              {Array.from({ length: n }, (_, k) => <Cookie key={k} size={n > 6 ? cs - 3 : cs} />)}
            </span>
            <span className="g3-plate-n">{n}</span>
          </button>
        ))}
        {mode === "group" && st.on.length === 0 && <div className="g3-plate-empty">びんを タップして おさらに のせよう</div>}
      </div>
      <div className="g3-fig-acts">
        {mode === "share" && <button className="ts-act ts-act-main" disabled={st.jar < plates || (done && !done.uneven)} onClick={dealRound}>1こずつ くばる</button>}
        {mode === "group" && <button className="ts-act ts-act-main" disabled={!!(done && !done.uneven) || st.jar <= 0} onClick={putGroup}>1こ のせる</button>}
        <button className="ts-act" onClick={reset}>やりなおす</button>
      </div>
      {done && done.uneven && <div className="g3-fig-msg g3-fig-msg-ng">おさらの クッキーの 数、ぜんぶ 同じかな？「やりなおす」で もういちど くばってみよう</div>}
    </div>
  );
}

/* ================= 小数：0.1 の いくつ分 ブロック（ヒント） =================
   1L を 10この ます（たて）で あらわす。x（ピンク）と y（き）／ひき算は y を ✕ */
export function DecBlocks({ x, y, op }) {
  const total = op === "+" ? x + y : x;
  const cols = Math.max(1, Math.ceil(total / 10));
  const colsEl = [];
  for (let c = 0; c < cols; c++) {
    const cells = [];
    for (let k = 9; k >= 0; k--) {
      const i = c * 10 + k;
      let cls = "g3-dec-cell";
      if (op === "+") { if (i < x) cls += " g3-dec-a"; else if (i < x + y) cls += " g3-dec-b"; }
      else if (i < x) { cls += " g3-dec-a"; if (i >= x - y) cls += " g3-dec-gone"; }
      cells.push(<span key={k} className={cls} />);
    }
    colsEl.push(<div key={c} className="g3-dec-col"><div className="g3-dec-cells">{cells}</div><small>1L</small></div>);
  }
  return (
    <div className="g3-hint-fig">
      <div className="g3-dec-cols">{colsEl}</div>
      <div className="g3-fig-note">
        1つの ますが <b>0.1L</b>。{fmtDec(x)}は 0.1が <b>{x}こ</b>、{fmtDec(y)}は 0.1が <b>{y}こ</b>。<br />
        {op === "+" ? "あわせて 0.1が 何こ かな？ 10こで 1L だよ" : `${x}こから ${y}こ とると、0.1が 何こ のこる かな？`}
      </div>
    </div>
  );
}

/* ================= 分数：ケーキ・ピザ =================
   d こに わけた まる。painted（ぬった）・extra（2つめの 色）・eaten（✕）は きれの ばんごうの Set */
const SHAPE_COLORS = {
  cake: { base: "#FFF1D6", line: "#D9A35B", paint: "#FF8FC4", extra: "#FFD34D", rim: "#F5C9A0" },
  pizza: { base: "#FFE2A8", line: "#C9822E", paint: "#5B8DEF", extra: "#FFD34D", rim: "#E3A04F" },   // ぬる 色は ピザの 赤と まざらない 青
};
// 絵（512×512）の 中で、ケーキ・ピザの まるの 半径が しめる わりあい（tools なしで はかった 値：ケーキ 446/453、ピザ 467/471）
const ART_FILL = { cake: 0.985, pizza: 0.992 };
export function FracShape({ d, kind = "cake", painted = new Set(), extra = new Set(), eaten = new Set(), onTap, size = 170, cut = true }) {
  const C = SHAPE_COLORS[kind] || SHAPE_COLORS.cake;
  const art = g3Art(kind === "pizza" ? "pizza-top" : "cake-top");
  const R = 46, cx = 50, cy = 50;
  const pt = (a) => [cx + R * Math.sin(a), cy - R * Math.cos(a)];
  const slices = [];
  const n = cut ? d : 1;
  // ケーキの ふちの かざり（いちご 8こ・クリーム 8こ。いちごが 0°・45°…）の あいだに 切れめが くるよう 11.25° まわす
  // （2・4・8 に わけた ときは かざりの とちゅうで 切れない）
  const rot = kind === "cake" ? (11.25 * Math.PI) / 180 : 0;
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = rot + ((i + 1) / n) * Math.PI * 2;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const path = n === 1 ? `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} Z` : `M${cx} ${cy} L${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z`;
    const fill = eaten.has(i) ? (art ? "rgba(255,255,255,.7)" : C.base) : painted.has(i) ? C.paint : extra.has(i) ? C.extra : art ? "transparent" : C.base;
    const am = (a0 + a1) / 2, [mx, my] = [cx + R * 0.58 * Math.sin(am), cy - R * 0.58 * Math.cos(am)];
    slices.push(
      <g key={i} onClick={onTap ? () => onTap(i) : undefined} style={onTap ? { cursor: "pointer" } : undefined} data-slice={i}>
        <path d={path} fill={fill} fillOpacity={art && (painted.has(i) || extra.has(i)) ? 0.62 : 1} stroke={C.line} strokeWidth={art ? 1.8 : 1.4} />
        {eaten.has(i) && <text x={mx} y={my + 5} textAnchor="middle" fontSize={16} fontWeight={900} fill="#C0568A" pointerEvents="none">✕</text>}
      </g>
    );
  }
  return (
    <svg className="g3-frac-shape" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={kind === "pizza" ? "ピザ" : "ケーキ"}>
      {!art && <circle cx={cx} cy={cy} r={R + 3} fill={C.rim} />}
      {/* 絵の まるが R に ぴったり かさなるよう 少し 大きく おく（絵の ふちの かざりが まるから すこし はみだす ぶん） */}
      {art && <image href={art} x={cx - R / ART_FILL[kind]} y={cy - R / ART_FILL[kind]} width={(R * 2) / ART_FILL[kind]} height={(R * 2) / ART_FILL[kind]} />}
      {slices}
    </svg>
  );
}
/* 分数の 字（たて書き：分子／せん／分母） */
export function Frac({ n, d, big = false }) {
  return <span className={"g3-frac" + (big ? " g3-frac-big" : "")}><span>{n}</span><span className="g3-frac-bar" /><span>{d}</span></span>;
}
/* 分数の かべ：1・1/2・1/3・1/4 … を ならべて 大きさを くらべる */
export function FracWall({ ds = [1, 2, 3, 4], hi = [] }) {
  return (
    <div className="g3-wall">
      {ds.map((d) => (
        <div key={d} className={"g3-wall-row" + (hi.includes(d) ? " g3-wall-hi" : "")}>
          {Array.from({ length: d }, (_, i) => <span key={i} className={i === 0 ? "g3-wall-one" : ""}>{d === 1 ? "1" : <Frac n={1} d={d} />}</span>)}
        </div>
      ))}
    </div>
  );
}
export function FracHint({ q }) {
  const range = (a, b) => new Set(Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i));
  const painted = range(0, q.a);
  const extra = q.op === "+" ? range(q.a, q.a + q.b) : new Set();
  const eaten = q.op === "-" ? range(q.a - q.b, q.a) : new Set();
  return (
    <div className="g3-hint-fig">
      <FracShape d={q.d} painted={painted} extra={extra} eaten={eaten} size={150} />
      <div className="g3-fig-note">
        1つの きれが <Frac n={1} d={q.d} />。
        {q.op === "+" ? <> <Frac n={1} d={q.d} />が {q.a}こと {q.b}こ。あわせて 何こ かな？</>
          : q.one ? <> 1は <Frac n={q.d} d={q.d} />（{q.d}こ ぜんぶ）。{q.b}こ たべると、のこりは 何こ？</>
            : <> <Frac n={1} d={q.d} />が {q.a}こ。{q.b}こ たべると、のこりは 何こ？</>}
      </div>
    </div>
  );
}

/* わり算の ヒント：じっさいに くばってみる（九九の だんも ひとこと） */
export function DivHint({ q, sfx }) {
  return (
    <div className="g3-hint-fig">
      <div className="g3-fig-note">{q.a}この クッキーを {q.b}まいの おさらに 同じ数ずつ くばると、1さら 何こ？{q.r ? " あまりは？" : ""}</div>
      <div className="g3-fig-note g3-fig-sub">わかったら くばりおわる まえでも こたえて いいよ</div>
      <CookieDeal total={q.a} plates={q.b} mode="share" sfx={sfx} small />
      <div className="g3-fig-note g3-fig-sub">{q.r ? `${q.b}の だんの 九九で、${q.a}を こえない いちばん 大きい 答えを さがそう` : `${q.b}の だんの 九九：${q.b} × □ ＝ ${q.a}`}</div>
    </div>
  );
}

/* ================= ようせいの くに：展開図・1Lます ================= */
const NET_COLORS = ["#FFB3D6", "#BFE3FF", "#FFE08A", "#BDEFD0", "#E0CCFA", "#FFCFAE"];
export function NetView({ layout, w = 220, h = 170 }) {
  const cells = layout.cells;
  const x0 = Math.min(...cells.map((c) => c.rect[0])), x1 = Math.max(...cells.map((c) => c.rect[2]));
  const y0 = Math.min(...cells.map((c) => c.rect[1])), y1 = Math.max(...cells.map((c) => c.rect[3]));
  const s = Math.min((w - 12) / (x1 - x0), (h - 12) / (y1 - y0));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="g3-net" role="img" aria-label="てんかいず">
      {cells.map((c, i) => (
        <rect key={c.id} x={ox + (c.rect[0] - x0) * s} y={oy + (c.rect[1] - y0) * s} width={(c.rect[2] - c.rect[0]) * s} height={(c.rect[3] - c.rect[1]) * s}
          fill={NET_COLORS[i % NET_COLORS.length]} stroke="#7A5C98" strokeWidth={2} />
      ))}
    </svg>
  );
}
export function JuiceLevel({ dl, numbered = false }) {
  const W = 70, H = 150, y = (k) => H - (k / 10) * H;
  return (
    <svg viewBox={`-30 -8 ${W + 60} ${H + 26}`} width={W + 60} height={H + 26} className="g3-juice" role="img" aria-label="1Lます">
      <rect x={0} y={y(dl)} width={W} height={H - y(dl)} fill="#FFA94D" />
      <rect x={0} y={y(dl)} width={W} height={3} fill="#FFD08A" />
      {Array.from({ length: 9 }, (_, i) => i + 1).map((k) => (
        <g key={k}>
          <line x1={W - (k === 5 ? 18 : 10)} x2={W} y1={y(k)} y2={y(k)} stroke="#7A4E22" strokeWidth={k === 5 ? 2 : 1.3} />
          {numbered && <text x={W + 4} y={y(k) + 4} fontSize={10} fontWeight={900} fill="#C77700">{k}</text>}
        </g>
      ))}
      <rect x={-3} y={-2} width={W + 6} height={H + 5} rx={3} fill="none" stroke="#B98A52" strokeWidth={5} />
      <text x={W / 2} y={H + 18} textAnchor="middle" fontSize={11} fontWeight={900} fill="#3A2A6B">1Lます</text>
    </svg>
  );
}
export const NET_LABEL = { cube: "さいころの 形（立方体）", box: "はこの 形（直方体）", none: "くみたてられない" };

