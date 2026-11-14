/* =====================================================================
   ペンで 数字を かく マス
   - 線を かいて 少し まつと、上の 小さな はこに 読んだ 数字が 出る
   - 小さな はこを タップすると、まちがって 読んだ 数字を なおせる
   - ペンを いちど つかったら、手のひら(タッチ)は むしする
   ===================================================================== */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { recognize } from "./digitRecognizer.js";

let penSeen = false;          // スタイラスを つかったか（つかったら 指は むし）
const WAIT_MS = 650;          // かきおわってから 読むまでの まち時間

export default function WriteBox({ result, onInk, mark = null, locked = false, reveal = null, resetKey = 0, label = "", small = false }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(null);       // いま かいている 線
  const timerRef = useRef(null);
  const [fixOpen, setFixOpen] = useState(false);

  const redraw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#4A2D6B";
    ctx.lineWidth = small ? 4 : 5;
    for (const s of strokesRef.current) {
      ctx.beginPath();
      s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      if (s.length === 1) ctx.lineTo(s[0].x + 0.1, s[0].y);
      ctx.stroke();
    }
  }, [small]);

  // わくの 大きさに キャンバスを あわせる
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      cv.style.width = r.width + "px";
      cv.style.height = r.height + "px";
      redraw();
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(wrap);
    return () => { if (ro) ro.disconnect(); };
  }, [redraw]);

  // けす（親から resetKey が かわったとき）
  useEffect(() => {
    strokesRef.current = [];
    drawingRef.current = null;
    clearTimeout(timerRef.current);
    setFixOpen(false);
    redraw();
  }, [resetKey, redraw]);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const readNow = useCallback(() => {
    const r = recognize(strokesRef.current);
    onInk && onInk(r);
  }, [onInk]);

  const posOf = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const ignore = (e) => locked || (e.pointerType === "touch" && penSeen);

  const onDown = (e) => {
    if (e.pointerType === "pen") penSeen = true;
    if (ignore(e)) return;
    e.preventDefault();
    clearTimeout(timerRef.current);
    setFixOpen(false);
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch (_) {}
    drawingRef.current = { id: e.pointerId, pts: [posOf(e)] };
    strokesRef.current = [...strokesRef.current, drawingRef.current.pts];
    redraw();
  };
  const onMove = (e) => {
    const d = drawingRef.current;
    if (!d || d.id !== e.pointerId) return;
    e.preventDefault();
    const evs = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) d.pts.push(posOf(ev));
    redraw();
  };
  const onUp = (e) => {
    const d = drawingRef.current;
    if (!d || d.id !== e.pointerId) return;
    drawingRef.current = null;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(readNow, WAIT_MS);
  };

  const clearAll = () => {
    if (locked) return;
    strokesRef.current = [];
    clearTimeout(timerRef.current);
    setFixOpen(false);
    redraw();
    onInk && onInk({ text: "", digits: [] });
  };

  // まちがって 読んだ 数字を、こうほ から えらびなおす
  const swapDigit = (pos, d) => {
    if (!result) return;
    const digits = result.digits.map((x, i) => (i === pos ? { ...x, digit: d } : x));
    onInk && onInk({ text: digits.map((x) => x.digit).join(""), digits, fixed: true });
    setFixOpen(false);
  };

  const text = reveal != null ? reveal : (result && result.text) || "";
  const canFix = !locked && result && result.digits && result.digits.length > 0;

  return (
    <div className={"wb" + (small ? " wb-small" : "") + (mark === "wrong" ? " wb-wrong" : "") + (locked ? " wb-locked" : "")}>
      <div className="wb-head">
      <button
        type="button"
        className={"wb-read" + (text ? "" : " wb-read-empty") + (reveal != null ? " wb-read-reveal" : "")}
        onClick={() => canFix && setFixOpen((v) => !v)}
        aria-label={label ? `${label}の よみとり` : "よみとり"}
      >
        {text || "　"}
      </button>
      {!locked && <button type="button" className="wb-clear" onClick={clearAll} aria-label="けす">×</button>}
      </div>
      <div className="wb-pad" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="wb-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label={label ? `${label}を かく ところ` : "かく ところ"}
        />
        {mark === "right" && (
          <svg className="wb-mark" viewBox="0 0 100 100" aria-label="せいかい">
            <ellipse cx="50" cy="52" rx="40" ry="38" fill="none" stroke="#E8473F" strokeWidth="6" strokeLinecap="round"
              strokeDasharray="230 30" transform="rotate(-70 50 52)" opacity=".85" />
          </svg>
        )}
        {mark === "close" && (
          <svg className="wb-mark" viewBox="0 0 100 100" aria-label="おしい">
            <path d="M50 12 L88 82 L12 82 Z" fill="none" stroke="#F2A93B" strokeWidth="6" strokeLinejoin="round" opacity=".85" />
          </svg>
        )}
      </div>
      {fixOpen && canFix && (
        <div className="wb-fix">
          <div className="wb-fix-note">ちがう ときは タップ</div>
          <div className="wb-fix-cols">
            {result.digits.map((d, i) => (
              <div key={i} className="wb-fix-col">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((c) => (
                  <button key={c} type="button" className={"wb-fix-btn" + (c === d.digit ? " wb-fix-btn-on" : "")} onClick={() => swapDigit(i, c)}>{c}</button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
