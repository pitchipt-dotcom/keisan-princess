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
   ===================================================================== */
import React, { useState } from "react";
import { stepCorrect, UNIT_SYS, UNIT_LEVELS, pickPraise } from "./yomitori.js";
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
      <div className={"yt-cal" + (cells.length > 35 ? " yt-cal-6" : "")}>
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

export function YomitoriQuestion({ q, stage = "A", sfx, Keypad, isLast, onFinish }) {
  const selfMode = stage === "C";
  const [found, setFound] = useState(selfMode);       // C は さいしょから こたえる らんを ひらく
  const [tapMsg, setTapMsg] = useState(null);          // まちがえて タップした ときの ヒント
  const [oneShot, setOneShot] = useState(null);        // いっぱつで 見つけたか（A・B）
  const [praise, setPraise] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [inputs, setInputs] = useState(() => q.steps[0].slots.map(() => ""));
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState("ask");          // ask | wrong1 | right | reveal
  const [showHint, setShowHint] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [allFirst, setAllFirst] = useState(true);
  const [done, setDone] = useState([]);               // おわった だんかいの こたえ（2だんかい用）
  const [marks, setMarks] = useState(() => new Set()); // マーカーを ひいた ところ（"seg-part"）
  const [askMarked, setAskMarked] = useState(false);  // C：じぶんで「きかれている ところ」に ひいた
  const [selfMarked, setSelfMarked] = useState(false); // C：じぶんで つかう 数に ひいた
  const [markStep, setMarkStep] = useState(null);     // B：いま マーカーを ひいてもらう だんかい
  const [glow, setGlow] = useState(false);            // B：ちがう ところを タップ → 正しい ところを ひからせる
  const [markMsg, setMarkMsg] = useState(null);
  const [through, setThrough] = useState(null);       // 2だんかいで ② まで できた ときの ほめことば

  const st = q.steps[stepIdx];
  const lastStep = stepIdx + 1 >= q.steps.length;
  const partsOf = (seg) => seg.parts || [{ t: seg.t }];
  const keysFor = (k) => q.segs.flatMap((seg, i) => partsOf(seg).map((p, j) => (p.mk === k ? `${i}-${j}` : null)).filter(Boolean));
  const markPending = markStep != null && keysFor(markStep).some((key) => !marks.has(key));

  const tapSeg = (seg) => {
    if (found) return;
    const first = oneShot === null;
    if (seg.ask) {
      sfx.correct(); setFound(true); setTapMsg(null);
      if (first) { setOneShot(true); setPraise(pickPraise("oneShot")); }
      return;
    }
    if (first) setOneShot(false);
    sfx.wrong();
    setUsedHint(true);
    setTapMsg(seg.near
      ? "おしい！ その すぐ あとまで よんでみよう"
      : "そこは もんだいに かいてある ことだよ。さいごまで よんで「何〜ですか」と きいている ところを さがそう");
  };

  // B の マーカー ひき ／ C の じぶんで マーカー
  const tapPart = (seg, i, j, p) => {
    const key = `${i}-${j}`;
    if (selfMode) {
      if (seg.ask) { sfx.tap(); setAskMarked(true); return; }
      if (p.mk != null && !marks.has(key)) { sfx.tap(); setMarks(new Set([...marks, key])); setSelfMarked(true); return; }
      sfx.tap(); return;
    }
    if (!markPending) return;
    if (p.mk === markStep && !marks.has(key)) {
      sfx.tap();
      const nm = new Set([...marks, key]);
      setMarks(nm);
      if (keysFor(markStep).every((k) => nm.has(k))) { setGlow(false); setMarkMsg("ぜんぶ ひけたね！ マーカー めいじん！"); }
      return;
    }
    if (p.mk != null && p.mk !== markStep) return;           // まえの だんかいで ひいた ところ
    sfx.tap();                                               // まちがえても へらさない。正しい ところを ひからせる
    setGlow(true);
    setMarkMsg("そこは この しきでは つかって いないよ。ひかっている ところを タップしてね");
  };

  const submit = () => {
    const empty = inputs.findIndex((v) => v === "");
    if (empty >= 0) { setActive(empty); return; }
    if (stepCorrect(st, inputs)) {
      sfx.correct(); setPhase("right");
      const keys = keysFor(stepIdx);
      if (stage === "A") setMarks((m) => new Set([...m, ...keys]));
      if (stage === "B" && keys.length) { setMarkStep(stepIdx); setGlow(false); setMarkMsg("しきで つかった 数を タップして マーカーを ひいてみよう"); }
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
    setPhase("ask"); setShowHint(false); setMarkStep(null); setMarkMsg(null); setGlow(false);
  };

  const partClass = (key, p) => (marks.has(key) ? `yt-mk yt-mk${p.mk + 1}` : glow && markPending && p.mk === markStep ? "yt-glow" + (p.mk === 1 ? " yt-glow2" : "") : "");
  const partMode = selfMode || markPending;
  const answering = phase === "ask" || phase === "wrong1";
  return (
    <>
      <div className="dm-card dm-qcard yt-card">
        <div className="yt-tag">📖 よみとり チェック{q.unit && <span className="yt-level">　📏 {UNIT_SYS[q.unit.sys].name} ステップ {q.unit.level}/{UNIT_LEVELS}</span>}</div>
        {q.scenes && <YomitoriScenes scenes={q.scenes} />}
        <div className={"yt-text" + (partMode ? " yt-text-mark" : "")}>
          {q.segs.map((s, i) => {
            const askOn = s.ask && (selfMode ? askMarked : found);
            if (partMode) {
              return (
                <span key={i} className={"yt-seg yt-seg-static" + (askOn ? " yt-seg-ask" : "")}>
                  {partsOf(s).map((p, j) => (
                    <span key={j} role="button" tabIndex={0} className={"yt-part " + partClass(`${i}-${j}`, p)}
                      onClick={() => tapPart(s, i, j, p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapPart(s, i, j, p); } }}>{p.t}</span>
                  ))}
                </span>
              );
            }
            return (
              <button key={i} className={"yt-seg" + (askOn ? " yt-seg-ask" : "")} disabled={found} onClick={() => tapSeg(s)}>
                {s.parts ? s.parts.map((p, j) => {
                  const c = partClass(`${i}-${j}`, p);
                  return c ? <span key={j} className={c}>{p.t}</span> : <React.Fragment key={j}>{p.t}</React.Fragment>;
                }) : s.t}
              </button>
            );
          })}
        </div>
        {!found && <div className="yt-guide">🔍 なにを きかれているかな？ その ところを タップしてね</div>}
        {!found && tapMsg && <div className="dm-msg dm-msg-ng yt-small">{tapMsg}</div>}
        {praise && <div className="yt-praise yt-praise-float" role="status">🌟 {praise}</div>}
        {selfMode && answering && !q.pic && <div className="yt-guide yt-guide-self">🖍 文を タップすると マーカーが ひけるよ</div>}

        {q.pic && (q.pic.type === "books" ? <Books pic={q.pic} sfx={sfx} /> : <Calendar pic={q.pic} sfx={sfx} />)}

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
