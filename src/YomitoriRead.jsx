/* =====================================================================
   よみとりチェック — 読み方の 部品（まいにち けいさん と おはなし もんだい「むずかしい」で つかう）
   - useReadMarks … 「きかれている ところ」の タップ と 色マーカー（補助の 段階 A／B／C）の うごき
   - ReadText     … もんだいぶんの 表示（タップできる まとまり・マーカー）
   - YomitoriPic  … はしの 数え方の 絵（本だな・カレンダー。タップした じゅんに 番号）
   段階（stage）… A：せいかい したら アプリが マーカー ／ B：子どもが タップして マーカー
                  C：「きかれている ところ」の タップは なし。じぶんで タップすれば マーカー
   こたえる らん（すうじキー／ペン）は、つかう がわ（YomitoriQuestion.jsx／OhanashiHard.jsx）が もつ
   ===================================================================== */
import React, { useState } from "react";
import { pickPraise } from "./yomitori.js";
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

export function Books({ pic, sfx }) {
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

export function Calendar({ pic, sfx }) {
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

export const YomitoriPic = ({ pic, sfx }) => (pic.type === "books" ? <Books pic={pic} sfx={sfx} /> : <Calendar pic={pic} sfx={sfx} />);

/* ---- 「きかれている ところ」と マーカー ----
   onMissTap … ちがう ところを タップした とき（つかう がわで「ヒントを つかった」に する） */
export function useReadMarks({ q, stage = "A", sfx, onMissTap }) {
  const selfMode = stage === "C";
  const [found, setFound] = useState(selfMode);       // C は さいしょから こたえる らんを ひらく
  const [tapMsg, setTapMsg] = useState(null);          // まちがえて タップした ときの ヒント
  const [oneShot, setOneShot] = useState(null);        // いっぱつで 見つけたか（A・B）
  const [praise, setPraise] = useState(null);
  const [marks, setMarks] = useState(() => new Set()); // マーカーを ひいた ところ（"seg-part"）
  const [askMarked, setAskMarked] = useState(false);  // C：じぶんで「きかれている ところ」に ひいた
  const [selfMarked, setSelfMarked] = useState(false); // C：じぶんで つかう 数に ひいた
  const [markStep, setMarkStep] = useState(null);     // B：いま マーカーを ひいてもらう だんかい
  const [glow, setGlow] = useState(false);            // B：ちがう ところを タップ → 正しい ところを ひからせる
  const [markMsg, setMarkMsg] = useState(null);

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
    onMissTap && onMissTap();
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

  /* その だんかいの しきが せいかい した とき：A は アプリが ひく ／ B は 子どもに ひいてもらう */
  const stepRight = (stepIdx) => {
    const keys = keysFor(stepIdx);
    if (stage === "A") setMarks((m) => new Set([...m, ...keys]));
    if (stage === "B" && keys.length) { setMarkStep(stepIdx); setGlow(false); setMarkMsg("しきで つかった 数を タップして マーカーを ひいてみよう"); }
  };
  /* こたえを 見せる とき（2かい まちがい など）：その だんかいまでの マーカーを ぜんぶ ひく */
  const markAll = (uptoStep) => {
    const keys = []; for (let k = 0; k <= uptoStep; k++) keys.push(...keysFor(k));
    setMarks((m) => new Set([...m, ...keys])); setMarkStep(null); setGlow(false); setMarkMsg(null);
  };
  const nextStep = () => { setMarkStep(null); setMarkMsg(null); setGlow(false); };

  return { stage, selfMode, found, tapMsg, oneShot, praise, marks, askMarked, selfMarked, markStep, glow, markMsg, markPending,
    partsOf, keysFor, tapSeg, tapPart, stepRight, markAll, nextStep };
}

/* ---- もんだいぶん ---- */
export function ReadText({ q, r }) {
  const partClass = (key, p) => (r.marks.has(key) ? `yt-mk yt-mk${p.mk + 1}` : r.glow && r.markPending && p.mk === r.markStep ? "yt-glow" + (p.mk === 1 ? " yt-glow2" : "") : "");
  const partMode = r.selfMode || r.markPending;
  return (
    <div className={"yt-text" + (partMode ? " yt-text-mark" : "")}>
      {q.segs.map((s, i) => {
        const askOn = s.ask && (r.selfMode ? r.askMarked : r.found);
        if (partMode) {
          return (
            <span key={i} className={"yt-seg yt-seg-static" + (askOn ? " yt-seg-ask" : "")}>
              {r.partsOf(s).map((p, j) => (
                <span key={j} role="button" tabIndex={0} className={"yt-part " + partClass(`${i}-${j}`, p)}
                  onClick={() => r.tapPart(s, i, j, p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); r.tapPart(s, i, j, p); } }}>{p.t}</span>
              ))}
            </span>
          );
        }
        return (
          <button key={i} className={"yt-seg" + (askOn ? " yt-seg-ask" : "")} disabled={r.found} onClick={() => r.tapSeg(s)}>
            {s.parts ? s.parts.map((p, j) => {
              const c = partClass(`${i}-${j}`, p);
              return c ? <span key={j} className={c}>{p.t}</span> : <React.Fragment key={j}>{p.t}</React.Fragment>;
            }) : s.t}
          </button>
        );
      })}
    </div>
  );
}
