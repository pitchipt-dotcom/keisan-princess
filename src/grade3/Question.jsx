/* =====================================================================
   3年生の 1もん（わり算・小数・分数・2年生の しき・ようせいの くに で 共通）
   - こたえかた：三択（choice）／入力（input）。2年生の しき は いつも 入力（まいにち けいさんと おなじ）
   - ながれは まいにち けいさんと おなじ：
       1かいめ まちがい → ヒントの 図を 出して もういちど（三択は えらんだ ものを うすく する）
       2かいめ まちがい → こたえを 見せて つぎへ（せめない）
   - ヒントを つかっても ポイントは かわらない（onDone の hint は おわりの ことばに だけ つかう）
   onFirst(right)：1かいめの こたえが でた とき（ノートの きろく 用）
   onDone({ right, hint })：「つぎへ」を おした とき
   ===================================================================== */
import React, { useState } from "react";
import { ColumnHint } from "../DailyMode.jsx";
import { checkInput, fmtDec, parseDiv } from "./g3.js";
import { DivHint, DecBlocks, FracHint, Frac, NetView, JuiceLevel, NET_LABEL } from "./Figures.jsx";

const OP = { "+": "＋", "-": "－", "×": "×" };

/* こたえの 文字列を 見せる */
export function AnsView({ q, s }) {
  if (s == null || s === "") return null;
  if (q.unit === "div") { const { q: qq, r } = parseDiv(s); return <>{qq}{r ? <> <small>あまり</small> {r}</> : null}</>; }
  if (q.unit === "frac") { if (!String(s).includes("/")) return <>{s}</>; const [n, d] = String(s).split("/"); return <Frac n={n} d={d} />; }
  if (q.unit === "fairy") return q.kind === "net" ? <>{NET_LABEL[s]}</> : <>{s}dL</>;
  return <>{s}</>;
}

/* しき（左がわ） */
function Formula({ q }) {
  if (q.unit === "div") return <>{q.a} ÷ {q.b}</>;
  if (q.unit === "dec") return <>{fmtDec(q.x)} {OP[q.op]} {fmtDec(q.y)}</>;
  if (q.unit === "frac") return <>{q.one ? "1" : <Frac n={q.a} d={q.d} />} {OP[q.op]} <Frac n={q.b} d={q.d} /></>;
  if (q.unit === "g2") return <>{q.a} {OP[q.op]} {q.b}</>;
  return null;
}

/* すうじ キー（小数は「.」つき） */
function Pad({ onKey, dot }) {
  const keys = dot ? ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "けす"] : ["7", "8", "9", "4", "5", "6", "1", "2", "3", "けす", "0", "こたえる"];
  return (
    <div className="dm-keys g3-keys">
      {keys.map((k) => (
        <button key={k} className={"dm-key" + (k === "こたえる" ? " dm-key-ok" : k === "けす" ? " dm-key-del" : "")} onClick={() => onKey(k)}>{k}</button>
      ))}
      {dot && <button className="dm-key dm-key-ok g3-key-wide" onClick={() => onKey("こたえる")}>こたえる</button>}
    </div>
  );
}

function Hint({ q, sfx }) {
  if (q.unit === "div") return <DivHint q={q} sfx={sfx} />;
  if (q.unit === "dec") return <DecBlocks x={q.x} y={q.y} op={q.op} />;
  if (q.unit === "frac") return <FracHint q={q} />;
  if (q.unit === "g2") return <ColumnHint q={q} />;
  if (q.kind === "net") return <div className="g3-hint-fig"><div className="g3-fig-note">面は 6まい あるかな？ おりまげた とき、かさなる 面は ないかな？<br />ぜんぶ 同じ 正方形なら さいころの 形、長方形が まざると はこの 形だよ</div></div>;
  return <div className="g3-hint-fig"><JuiceLevel dl={q.dl} numbered /><div className="g3-fig-note">目もり 1つが 1dL。下から かぞえてみよう（10dLで 1L）</div></div>;
}
const HINT_LABEL = { div: "？ クッキーで くばってみる（ヒント）", dec: "？ 0.1の ブロックで 見る（ヒント）", frac: "？ ケーキの 図で 見る（ヒント）", g2: "？ ひっさんで みる（ヒント）", fairy: "？ ヒントを 見る" };

export function G3Question({ q, choices, inputMode, sfx, character, isLast, notebook = false, onFirst, onDone }) {
  const mode = q.unit === "g2" ? "input" : q.unit === "fairy" ? "choice" : inputMode ? "input" : "choice";
  const [phase, setPhase] = useState("ask");          // ask | right | wrong1 | reveal
  const [hint, setHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [firstRight, setFirstRight] = useState(null);
  const [tried, setTried] = useState([]);            // 三択で えらんで ちがった もの
  const [val, setVal] = useState(q.unit === "div" ? { q: "", r: "" } : "");
  const [field, setField] = useState("q");           // わり算の 入力：q（しょう）| r（あまり）

  const showHint = () => { sfx.tap(); setHint(true); setUsedHint(true); };
  const judge = (ok) => {
    if (ok) {
      sfx.correct();
      if (phase === "ask") { setFirstRight(true); onFirst && onFirst(true); }
      setPhase("right");
      return;
    }
    sfx.wrong();
    if (phase === "ask") {
      setFirstRight(false); onFirst && onFirst(false);
      setPhase("wrong1"); setHint(true);
      setVal(q.unit === "div" ? { q: "", r: "" } : ""); setField("q");
    } else setPhase("reveal");
  };
  const pickChoice = (c) => {
    if (phase !== "ask" && phase !== "wrong1") return;
    if (c !== q.ans) setTried((t) => [...t, c]);
    judge(c === q.ans);
  };
  const submit = () => {
    if (q.unit === "div" ? val.q === "" : val === "" || val === ".") return;
    judge(q.unit === "g2" ? Number(val) === q.ans : checkInput(q, val));
  };
  const onKey = (k) => {
    if (phase === "right" || phase === "reveal") return;
    if (k === "こたえる") { submit(); return; }
    sfx.tap();
    const edit = (s) => {
      if (k === "けす") return s.slice(0, -1);
      if (k === ".") return s.includes(".") ? s : (s === "" ? "0." : s + ".");
      if (s.length >= (q.unit === "dec" ? 4 : 3)) return s;
      return s === "0" ? k : s + k;
    };
    if (q.unit === "div") setVal((v) => ({ ...v, [field]: edit(v[field]) }));
    else setVal((v) => edit(v));
  };

  const finished = phase === "right" || phase === "reveal";
  const blank = (s, on, onClick, label) => (
    <button className={"g3-box" + (on ? " g3-box-on" : "") + (s ? "" : " g3-box-empty")} onClick={onClick} aria-label={label} disabled={finished}>{s || "？"}</button>
  );
  let rhs;
  if (finished) rhs = <span className="dm-ans g3-ans-done"><AnsView q={q} s={q.ans} /></span>;
  else if (mode === "choice") rhs = <span className="dm-ans dm-ans-empty">？</span>;
  else if (q.unit === "div") rhs = <>{blank(val.q, field === "q", () => setField("q"), "こたえの らん")} <small className="g3-amari">あまり</small> {blank(val.r, field === "r", () => setField("r"), "あまりの らん")}</>;
  else if (q.unit === "frac") rhs = <span className="g3-frac g3-frac-in">{blank(val, true, undefined, "分子の らん")}<span className="g3-frac-bar" /><span>{q.d}</span></span>;
  else rhs = <span className={"dm-ans" + (val ? "" : " dm-ans-empty")}>{val || "？"}</span>;

  const fairyQ = q.unit === "fairy";
  return (
    <>
      <div className="dm-mini-chara">{character(phase === "right" ? "happy" : phase === "ask" ? "idle" : "oops", 72, phase === "right")}</div>
      <div className="dm-card dm-qcard">
        {fairyQ ? (
          <div className="g3-fairy-q">
            <div className="g3-fairy-tag">🧚 ようせいの くに</div>
            {q.kind === "net"
              ? <><div className="g3-q-text">この てんかいずを くみたてると、どんな 形に なる？</div><NetView layout={q.layout} /></>
              : <><div className="g3-q-text">1Lますに 入った ジュースは 何dL？</div>{!hint && <JuiceLevel dl={q.dl} />}</>}
          </div>
        ) : (
          <div className={"dm-q g3-q" + (q.unit === "frac" ? " g3-q-frac" : "") + (q.unit === "div" && mode === "input" && !finished ? " g3-q-div" : "")}><Formula q={q} /> ＝ {rhs}</div>
        )}
        {mode === "input" && q.unit === "div" && !finished && <div className="g3-small-note">あまりが ない ときは「あまり」は からっぽで いいよ</div>}
        {finished && q.unit === "frac" && q.n === q.d && <div className="g3-small-note"><Frac n={q.d} d={q.d} /> は 1 と おなじ だよ</div>}

        {phase === "right" && <div className="dm-msg dm-msg-ok">せいかい！✨</div>}
        {phase === "wrong1" && <div className="dm-msg dm-msg-ng">おしい！ ヒントを 見て もういちど やってみよう</div>}
        {phase === "reveal" && <div className="dm-msg dm-msg-ng">こたえは <b><AnsView q={q} s={q.ans} /></b> だよ。{notebook && q.unit !== "fairy" ? "ノートに いれておくね。" : ""}<br />図で たしかめて、また こんど ちょうせん しよう！</div>}

        {(phase === "ask" || phase === "wrong1") && !hint && <button className="kk-hint-btn g3-hint-btn" onClick={showHint}>{HINT_LABEL[q.unit]}</button>}
        {hint && <Hint q={q} sfx={sfx} />}
      </div>

      {finished
        ? <button className="kk-big-btn" onClick={() => { sfx.tap(); onDone({ right: !!firstRight, hint: usedHint }); }}>{isLast ? "けっかを 見る →" : "つぎへ →"}</button>
        : mode === "choice"
          ? <div className={"g3-choices" + (fairyQ && q.kind === "net" ? " g3-choices-wide" : "")}>
              {(choices || q.choices).map((c) => (
                <button key={c} className={"g3-choice" + (tried.includes(c) ? " g3-choice-tried" : "")} disabled={tried.includes(c)} onClick={() => pickChoice(c)}>
                  <AnsView q={q} s={c} />
                </button>
              ))}
            </div>
          : <Pad onKey={onKey} dot={q.unit === "dec"} />}
    </>
  );
}
