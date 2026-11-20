/* =====================================================================
   妖精の国 — あそびかた（チュートリアル）の 共通の わく
   見せて → やらせる：
     1. 妖精が みじかく 言う（1文）
     2. 指の アイコンが お手本の うごき（ドラッグ・タップ・スワイプ）を くりかえし 見せる
     3. 子どもが 同じ ことを 1かい できたら「できたね！」で つぎへ。
        できるまで 先に すすまないが、3かい うまく いかなかったら お手本どおりに 自動で うごかして すすむ
   1つの あそびかたは 3〜4ステップ。「とばす」も ある。さわる ところ いがいは すこし 暗く する（Spot）
   エリアごとの 中身（れんしゅうの 場面）は AreaTutorials.jsx
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import { FairyGuide } from "./TsumikiForest.jsx";
import "./tutorial.css";

export const MAX_FAILS = 3;
const OK_MS = 1300;

/* ステップの すすみかた。steps：[{ say, dot }]（dot … 上の まるの なんばんめか。こまかい ステップを 1つの まるに まとめる） */
export function useTutorial(steps, sfx) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("try");      // try … やってみる ／ ok … できたね ／ auto … お手本で うごかし中 ／ end … おわり
  const [okText, setOkText] = useState("");
  const [tip, setTip] = useState(null);             // うまく いかなかった ときの ひとこと
  const [fails, setFails] = useState(0);
  const timer = useRef(0);
  const R = useRef({}); R.current = { step, status, fails };
  useEffect(() => () => clearTimeout(timer.current), []);

  const goStep = (i) => { setStep(i); setStatus("try"); setFails(0); setTip(null); };
  const advance = () => { const i = R.current.step + 1; if (i >= steps.length) setStatus("end"); else goStep(i); };
  /* できた！（try の ときだけ） */
  const succeed = (text = "できたね！") => {
    if (R.current.status !== "try") return false;
    sfx && sfx.correct && sfx.correct();
    setStatus("ok"); setOkText(text); setTip(null);
    clearTimeout(timer.current); timer.current = setTimeout(advance, OK_MS);
    return true;
  };
  /* うまく いかなかった。3かいめなら true（よびだした ほうが お手本どおりに うごかして autoDone を よぶ） */
  const fail = (text) => {
    if (R.current.status !== "try") return false;
    const f = R.current.fails + 1; setFails(f);
    if (f >= MAX_FAILS) { setStatus("auto"); setTip(null); return true; }
    sfx && sfx.tap && sfx.tap(); setTip(text || null);
    return false;
  };
  const autoDone = () => {
    setStatus("ok"); setOkText("こうやって うごかすよ。つぎに いこう！");
    clearTimeout(timer.current); timer.current = setTimeout(advance, OK_MS + 700);
  };
  const restart = () => { clearTimeout(timer.current); goStep(0); };
  return { step, cur: steps[step] || steps[steps.length - 1], status, okText, tip, fails, setTip, succeed, fail, autoDone, restart, trying: status === "try" };
}

/* さわる ところ（on）は 光る わく、それ いがいは すこし 暗く（さわれない） */
export function Spot({ on, children, className = "", style, ...rest }) {
  return <div className={"tt-zone " + (on ? "tt-spot" : "tt-dim") + (className ? " " + className : "")} style={style} {...rest}>{children}</div>;
}

/* お手本の 指。x,y（％）… さいしょの いち、x2,y2 … うごいた さき（スワイプ・ドラッグ）。kind：tap | swipe | drag */
export function Finger({ kind = "tap", x, y, x2 = x, y2 = y, show = true }) {
  if (!show) return null;
  return (
    <span className={"tt-finger tt-finger-" + kind} aria-hidden="true"
      style={{ "--x": x + "%", "--y": y + "%", "--x2": x2 + "%", "--y2": y2 + "%", left: x + "%", top: y + "%" }}>
      <span className="tt-finger-hand">👆</span>
      {kind === "tap" && <span className="tt-finger-ring" />}
    </span>
  );
}

function OkBadge({ text }) {
  const isAuto = !text.startsWith("できたね");
  const rest = isAuto ? text : text.replace(/^できたね！\s*/, "");
  return <div className="tt-ok" role="status"><b>{isAuto ? "👀 おてほん" : "できたね！"}</b>{rest && <small>{rest}</small>}</div>;
}

/* わく：上に タイトル・ステップの まる・とばす、妖精の セリフ、まん中に れんしゅうの 場面 */
export function TutorialFrame({ t, steps, fairy, title, sfx, onClose, children }) {
  const dots = [...new Set(steps.map((s, i) => (s.dot != null ? s.dot : i)))];
  const curDot = t.cur.dot != null ? t.cur.dot : t.step;
  const say = t.status === "end" ? "これで じゅんびは ばっちり！ さあ、はじめよう！" : t.tip || t.cur.say;
  const panel = useRef(null);
  useEffect(() => { if (panel.current) panel.current.focus(); }, []);
  return (
    <div className="tt-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="tt-panel" ref={panel} tabIndex={-1}>
        <div className="tt-top">
          <span className="tt-title">📖 {title}</span>
          <span className="tt-dots" aria-label={`ステップ ${Math.min(curDot + 1, dots.length)} / ${dots.length}`}>
            {dots.map((d) => <i key={d} className={d < curDot || t.status === "end" ? "tt-dot-done" : d === curDot ? "tt-dot-now" : ""} />)}
          </span>
          {t.status !== "end" && <button className="tt-skip" onClick={() => { sfx && sfx.tap && sfx.tap(); onClose("skip"); }}>とばす ⏭</button>}
        </div>
        <FairyGuide fairy={fairy} text={say} mood={t.status === "ok" || t.status === "end" ? "happy" : null} />
        {t.status === "end" ? (
          <div className="tt-end">
            <div className="tt-end-badge">🎉</div>
            <button className="kk-big-btn tt-start" onClick={() => { sfx && sfx.tap && sfx.tap(); onClose("done"); }}>はじめる！</button>
            <button className="kk-text-btn" onClick={() => { sfx && sfx.tap && sfx.tap(); t.restart(); }}>もういちど 見る</button>
          </div>
        ) : (
          <div className={"tt-body tt-status-" + t.status}>
            {children}
            {t.status === "ok" && <OkBadge text={t.okText} />}
          </div>
        )}
      </div>
    </div>
  );
}
