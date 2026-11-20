/* =====================================================================
   よみとりチェック — 1もんぶんの 画面（まいにち けいさん の 中で つかう）
   1) もんだいぶんの「きかれている ところ」を タップ → こたえる らんが ひらく
      ちがう ところ なら やさしい ヒントを 出して もういちど（バツで とめない）
   2) こたえる（2だんかいの もんだいは ① の あと「まだ つづきが あるよ」で ② へ）
      1かいめ まちがい → ヒントを 出して もういちど ／ 2かいめ → こたえを 見せて すすむ
   けっか：right … ぜんぶの だんかいを 1かいめで せいかい
           hint  … タップを まちがえた／じぶんで ヒントを ひらいた
           oneShot … 「きかれている ところ」を いっぱつで 見つけた（だんかい C では null）
           through … 2だんかいの もんだいで ② まで こたえられた
           selfMark … だんかい C で じぶんから マーカーを ひいた
   だんかい（stage）… A：せいかい したら アプリが マーカー ／ B：子どもが タップして マーカー
                      C：「きかれている ところ」の タップは なし。じぶんで タップすれば マーカー
   「きかれている ところ」・マーカー・絵は YomitoriRead.jsx の 共通部品（おはなし もんだい「むずかしい」でも つかう）
   ===================================================================== */
import React, { useState } from "react";
import { stepCorrect, UNIT_SYS, UNIT_LEVELS, pickPraise } from "./yomitori.js";
import { UnitHint } from "./UnitHint.jsx";
import { YomitoriScenes } from "./YomitoriScenes.jsx";
import { useReadMarks, ReadText, YomitoriPic } from "./YomitoriRead.jsx";     // 読み方の 部品（おはなし もんだい と 共通）
import "./yomitori.css";

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

export function YomitoriQuestion({ q, stage = "A", sfx, Keypad, isLast, onFinish }) {
  const [usedHint, setUsedHint] = useState(false);
  const r = useReadMarks({ q, stage, sfx, onMissTap: () => setUsedHint(true) });
  const { selfMode, found, tapMsg, oneShot, praise, markMsg, markPending, selfMarked } = r;
  const [stepIdx, setStepIdx] = useState(0);
  const [inputs, setInputs] = useState(() => q.steps[0].slots.map(() => ""));
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState("ask");          // ask | wrong1 | right | reveal
  const [showHint, setShowHint] = useState(false);
  const [allFirst, setAllFirst] = useState(true);
  const [done, setDone] = useState([]);               // おわった だんかいの こたえ（2だんかい用）
  const [through, setThrough] = useState(null);       // 2だんかいで ② まで できた ときの ほめことば

  const st = q.steps[stepIdx];
  const lastStep = stepIdx + 1 >= q.steps.length;

  const submit = () => {
    const empty = inputs.findIndex((v) => v === "");
    if (empty >= 0) { setActive(empty); return; }
    if (stepCorrect(st, inputs)) {
      sfx.correct(); setPhase("right");
      r.stepRight(stepIdx);
      if (q.steps.length > 1 && lastStep) setThrough(pickPraise("through"));
      return;
    }
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
    setPhase("ask"); setShowHint(false); r.nextStep();
  };

  const answering = phase === "ask" || phase === "wrong1";
  return (
    <>
      <div className="dm-card dm-qcard yt-card">
        <div className="yt-tag">📖 よみとり チェック{q.unit && <span className="yt-level">　📏 {UNIT_SYS[q.unit.sys].name} ステップ {q.unit.level}/{UNIT_LEVELS}</span>}</div>
        {q.scenes && <YomitoriScenes scenes={q.scenes} />}
        <ReadText q={q} r={r} />
        {!found && <div className="yt-guide">🔍 なにを きかれているかな？ その ところを タップしてね</div>}
        {!found && tapMsg && <div className="dm-msg dm-msg-ng yt-small">{tapMsg}</div>}
        {praise && <div className="yt-praise yt-praise-float" role="status">🌟 {praise}</div>}
        {selfMode && answering && !q.pic && <div className="yt-guide yt-guide-self">🖍 文を タップすると マーカーが ひけるよ</div>}

        {q.pic && <YomitoriPic pic={q.pic} sfx={sfx} />}

        {found && (
          <div className="yt-answer">
            {done.map((d, i) => (
              <div key={i} className="yt-done">{d.label}　<b>{d.slots.map((s) => s.ans + s.unit).join("")}</b> ✓</div>
            ))}
            {st.label && <div className="yt-step">{st.label}</div>}
            <Slots slots={st.slots} inputs={inputs} active={active} onFocus={(i) => { sfx.tap(); setActive(i); }} reveal={phase === "reveal"} />
            {phase === "right" && <div className="dm-msg dm-msg-ok">{lastStep ? "せいかい！✨" : "せいかい！ でも まだ つづきが あるよ！"}</div>}
            {phase === "right" && through && <div className="yt-praise">🌟 {through}</div>}
            {phase === "right" && markMsg && <div className={"yt-mark-msg" + (markPending ? "" : " yt-mark-done")}>🖍 {markMsg}</div>}
            {phase === "wrong1" && <div className="dm-msg dm-msg-ng yt-small">おしい！ ヒントを 見て もういちど やってみよう</div>}
            {phase === "reveal" && <div className="dm-msg dm-msg-ng yt-small">こたえは <b>{st.slots.map((s) => s.ans + s.unit).join("")}</b> だよ。{lastStep ? "また こんど ちょうせん しよう！" : "まだ つづきが あるよ！"}</div>}
            {answering && (showHint
              ? (q.unit ? <UnitHint u={q.unit} text={st.hint} /> : <div className="dm-hint-kuku yt-hint">{st.hint}</div>)
              : <button className="kk-hint-btn" onClick={() => { sfx.tap(); setShowHint(true); setUsedHint(true); }}>？ ヒント</button>)}
          </div>
        )}
      </div>

      {!found || markPending ? null
        : answering ? <div className="yt-keys">{selfMode || q.pic || q.unit || q.scenes ? <WideKeypad onKey={onKey} /> : <Keypad onKey={onKey} />}</div>
          : !lastStep ? <button className="kk-big-btn" onClick={nextStep}>つぎの しきへ →</button>
            : <button className="kk-big-btn" onClick={() => {
              sfx.tap();
              onFinish({ right: allFirst && phase === "right", hint: usedHint, unit: q.unit ? q.unit.sys : undefined,
                oneShot: selfMode ? null : oneShot === true, through: q.steps.length > 1 && phase === "right", selfMark: selfMarked });
            }}>
              {isLast ? "けっかを 見る →" : "つぎへ →"}</button>}
    </>
  );
}
