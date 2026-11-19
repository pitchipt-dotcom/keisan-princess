/* =====================================================================
   よみとりチェック — 1もんぶんの 画面（まいにち けいさん の 中で つかう）
   1) もんだいぶんの「きかれている ところ」を タップ → こたえる らんが ひらく
      ちがう ところ なら やさしい ヒントを 出して もういちど（バツで とめない）
   2) こたえる（2だんかいの もんだいは ① の あと「まだ つづきが あるよ」で ② へ）
      1かいめ まちがい → ヒントを 出して もういちど ／ 2かいめ → こたえを 見せて すすむ
   けっか：right … ぜんぶの だんかいを 1かいめで せいかい
           hint  … タップを まちがえた／じぶんで ヒントを ひらいた
   ===================================================================== */
import React, { useState } from "react";
import { stepCorrect, UNIT_SYS, UNIT_LEVELS } from "./yomitori.js";
import { UnitHint } from "./UnitHint.jsx";
import { YomitoriScenes } from "./YomitoriScenes.jsx";
import "./yomitori.css";

/* ---- 本だな（タップした じゅんに 1, 2, 3… と 番号が つく） ---- */
const BOOK_COLORS = ["#C9E7FF", "#FFE7A8", "#D9F2D0", "#E7D2F7", "#FFD6C2"];
const MARK_COLORS = { pink: "#FF8FC4", blue: "#6FA8FF" };

function useTapCount() {
  const [taps, setTaps] = useState([]);
  const tap = (k) => setTaps((t) => {
    const at = t.indexOf(k);
    return at < 0 ? [...t, k] : t.slice(0, at);     // もういちど タップ → そこから あとを けす
  });
  return [taps, tap, () => setTaps([])];
}

function TapFooter({ count, onClear }) {
  return (
    <div className="yt-pic-foot">
      <span>タップした かず：<b>{count}</b></span>
      {count > 0 && <button className="yt-clear" onClick={onClear}>けす</button>}
    </div>
  );
}

function Books({ pic, sfx }) {
  const [taps, tap, clear] = useTapCount();
  return (
    <div className="yt-pic">
      <div className="yt-books" style={{ gridTemplateColumns: `repeat(${pic.n}, 1fr)` }}>
        {Array.from({ length: pic.n }, (_, i) => {
          const pos = i + 1, mark = pic.marks[pos], no = taps.indexOf(pos);
          return (
            <button key={pos} className={"yt-book" + (no >= 0 ? " yt-tapped" : "")} aria-label={`左から ${pos}さつ目`}
              onClick={() => { sfx.tap(); tap(pos); }}>
              <span className="yt-tapno">{no >= 0 ? no + 1 : ""}</span>
              <span className="yt-spine" style={{ background: MARK_COLORS[mark] || BOOK_COLORS[i % BOOK_COLORS.length], height: 46 + ((i * 7) % 3) * 6 }} />
            </button>
          );
        })}
      </div>
      <div className="yt-shelf" />
      <div className="yt-lr"><span>← 左</span><span>右 →</span></div>
      <TapFooter count={taps.length} onClear={() => { sfx.tap(); clear(); }} />
    </div>
  );
}

function Calendar({ pic, sfx }) {
  const [taps, tap, clear] = useTapCount();
  const cells = [...Array(pic.first).fill(null), ...Array.from({ length: pic.days }, (_, i) => i + 1)];
  return (
    <div className="yt-pic">
      <div className="yt-cal-title">{pic.month}月</div>
      <div className="yt-cal">
        {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => <span key={w} className={"yt-cal-w" + (i === 0 ? " yt-sun" : i === 6 ? " yt-sat" : "")}>{w}</span>)}
        {cells.map((d, i) => d == null ? <span key={"e" + i} /> : (
          <button key={d} className={"yt-day" + (pic.marks[d] ? " yt-day-mark" : "") + (taps.includes(d) ? " yt-tapped" : "")}
            onClick={() => { sfx.tap(); tap(d); }}>
            {d}
            {taps.includes(d) && <span className="yt-day-no">{taps.indexOf(d) + 1}</span>}
          </button>
        ))}
      </div>
      <TapFooter count={taps.length} onClear={() => { sfx.tap(); clear(); }} />
    </div>
  );
}

/* ---- 絵が ある もんだい用の 横ながの すうじキー（2だん。絵と いっしょに 1画面に おさめる） ---- */
function WideKeypad({ onKey }) {
  const keys = ["1", "2", "3", "4", "5", "けす", "6", "7", "8", "9", "0", "こたえる"];
  return (
    <div className="dm-keys yt-wide-keys">
      {keys.map((k) => (
        <button key={k} className={"dm-key" + (k === "こたえる" ? " dm-key-ok" : k === "けす" ? " dm-key-del" : "")} onClick={() => onKey(k)}>{k}</button>
      ))}
    </div>
  );
}

/* ---- こたえる らん（たんいが 2つの ときは 2つ） ---- */
function Slots({ slots, inputs, active, onFocus, reveal }) {
  return (
    <div className="yt-slots">
      {slots.map((s, i) => (
        <span key={i} className="yt-slot">
          <button className={"yt-slot-box" + (i === active && !reveal ? " yt-slot-active" : "") + (inputs[i] || reveal ? "" : " yt-slot-empty")}
            onClick={() => onFocus(i)}>{reveal ? s.ans : (inputs[i] || "？")}</button>
          <span className="yt-unit">{s.unit}</span>
        </span>
      ))}
    </div>
  );
}

export function YomitoriQuestion({ q, sfx, Keypad, isLast, onFinish }) {
  const [found, setFound] = useState(false);
  const [tapMsg, setTapMsg] = useState(null);          // まちがえて タップした ときの ヒント
  const [stepIdx, setStepIdx] = useState(0);
  const [inputs, setInputs] = useState(() => q.steps[0].slots.map(() => ""));
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState("ask");          // ask | wrong1 | right | reveal
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [allFirst, setAllFirst] = useState(true);
  const [done, setDone] = useState([]);               // おわった だんかいの こたえ（2だんかい用）

  const st = q.steps[stepIdx];
  const lastStep = stepIdx + 1 >= q.steps.length;

  const tapSeg = (seg) => {
    if (found) return;
    if (seg.ask) { sfx.correct(); setFound(true); setTapMsg(null); return; }
    sfx.wrong();
    setUsedHint(true);
    setTapMsg(seg.near
      ? "おしい！ その すぐ あとまで よんでみよう"
      : "そこは もんだいに かいてある ことだよ。さいごまで よんで「何〜ですか」と きいている ところを さがそう");
  };

  const submit = () => {
    const empty = inputs.findIndex((v) => v === "");
    if (empty >= 0) { setActive(empty); return; }
    if (stepCorrect(st, inputs)) { sfx.correct(); setPhase("right"); return; }
    sfx.wrong();
    if (phase === "ask") {
      setAllFirst(false);
      setPhase("wrong1"); setShowHint(true);
      setInputs(st.slots.map(() => "")); setActive(0);
    } else setPhase("reveal");
  };

  const onKey = (k) => {
    if (k === "こたえる") { submit(); return; }
    sfx.tap();
    setInputs((arr) => arr.map((v, i) => {
      if (i !== active) return v;
      if (k === "けす") return v.slice(0, -1);
      return v.length >= 3 ? v : (v === "0" ? k : v + k);
    }));
  };

  const nextStep = () => {
    sfx.tap();
    setDone([...done, { label: st.label, slots: st.slots }]);
    const ns = q.steps[stepIdx + 1];
    setStepIdx(stepIdx + 1); setInputs(ns.slots.map(() => "")); setActive(0);
    setPhase("ask"); setShowHint(false);
  };

  const answering = phase === "ask" || phase === "wrong1";
  return (
    <>
      <div className="dm-card dm-qcard yt-card">
        <div className="yt-tag">📖 よみとり チェック{q.unit && <span className="yt-level">　📏 {UNIT_SYS[q.unit.sys].name} ステップ {q.unit.level}/{UNIT_LEVELS}</span>}</div>
        {q.scenes && <YomitoriScenes scenes={q.scenes} />}
        <div className="yt-text">
          {q.segs.map((s, i) => (
            <button key={i} className={"yt-seg" + (found && s.ask ? " yt-seg-ask" : "")} disabled={found} onClick={() => tapSeg(s)}>{s.t}</button>
          ))}
        </div>
        {!found && <div className="yt-guide">🔍 なにを きかれているかな？ その ところを タップしてね</div>}
        {!found && tapMsg && <div className="dm-msg dm-msg-ng yt-small">{tapMsg}</div>}

        {q.pic && (q.pic.type === "books" ? <Books pic={q.pic} sfx={sfx} /> : <Calendar pic={q.pic} sfx={sfx} />)}

        {found && (
          <div className="yt-answer">
            {done.map((d, i) => (
              <div key={i} className="yt-done">{d.label}　<b>{d.slots.map((s) => s.ans + s.unit).join("")}</b> ✓</div>
            ))}
            {st.label && <div className="yt-step">{st.label}</div>}
            <Slots slots={st.slots} inputs={inputs} active={active} onFocus={(i) => { sfx.tap(); setActive(i); }} reveal={phase === "reveal"} />
            {phase === "right" && <div className="dm-msg dm-msg-ok">{lastStep ? "せいかい！✨" : "せいかい！ でも まだ つづきが あるよ！"}</div>}
            {phase === "wrong1" && <div className="dm-msg dm-msg-ng yt-small">おしい！ ヒントを 見て もういちど やってみよう</div>}
            {phase === "reveal" && <div className="dm-msg dm-msg-ng yt-small">こたえは <b>{st.slots.map((s) => s.ans + s.unit).join("")}</b> だよ。{lastStep ? "また こんど ちょうせん しよう！" : "まだ つづきが あるよ！"}</div>}
            {answering && (showHint
              ? (q.unit ? <UnitHint u={q.unit} text={st.hint} /> : <div className="dm-hint-kuku yt-hint">{st.hint}</div>)
              : <button className="kk-hint-btn" onClick={() => { sfx.tap(); setShowHint(true); setUsedHint(true); }}>？ ヒント</button>)}
          </div>
        )}
      </div>

      {!found ? null
        : answering ? <div className="yt-keys">{q.pic || q.unit || q.scenes ? <WideKeypad onKey={onKey} /> : <Keypad onKey={onKey} />}</div>
          : !lastStep ? <button className="kk-big-btn" onClick={nextStep}>つぎの しきへ →</button>
            : <button className="kk-big-btn" onClick={() => { sfx.tap(); onFinish({ right: allFirst && phase === "right", hint: usedHint, unit: q.unit ? q.unit.sys : undefined }); }}>
              {isLast ? "けっかを 見る →" : "つぎへ →"}</button>}
    </>
  );
}
