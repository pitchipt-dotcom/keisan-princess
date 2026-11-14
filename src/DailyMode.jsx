/* =====================================================================
   まいにち けいさん（計算きそりょく モード）
   - 1日 10もん。タイムは はかるが せいげん時間は なし（せいかくさ さいゆうせん）
   - まちがえた もんだいは「まちがいノート」に たまり、1日後・3日後・7日後に
     もういちど 出る（3かい つづけて できたら ノートから そつぎょう）
   - ヒント（ひっさんで みる）は つかっても ポイントは かわらない。
     おわりに ヒントなしなら ほめる／ありなら「つぎは ヒントなしで」と ひとこと
   - いまは 2年生セット。GRADE_SETS に 学年を ふやして いける
   ===================================================================== */
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./dailyMode.css";
import { todayStr, addDays, EMPTY_DAILY, applyCompletion, needsEgg, currentStreak } from "./dragon.js";
import { DragonMini, EggPicker, StageUpCelebration, DRAGONS } from "./DragonMode.jsx";

export { todayStr, EMPTY_DAILY };

export const DAILY_COUNT = 10;          // 1日の もんだい数
const REVIEW_MAX = 4;                   // 1日に まぜる ノートの おさらい（さいだい）
const REVIEW_GAPS = [1, 3, 7];          // せいかい するたびに つぎに 出す までの 日数
const STAR_PER_RIGHT = 10;
const STAR_DAILY_BONUS = 30;            // その日 はじめて 10もん やりきった ボーナス

const rnd = (lo, hi) => lo + ((Math.random() * (hi - lo + 1)) | 0);

/* 日付（todayStr／addDays）と セーブの 初期値は dragon.js に まとめてある */

/* ======================= 2年生の もんだい ============================== */
// それぞれ { a, b, op, ans }
const G2 = [
  // 2けた＋2けた（くりあがり あり）  例 38＋27
  { id: "add2c", w: 3, make() { const a = rnd(11, 89), b = rnd(11, 99 - a); if ((a % 10) + (b % 10) < 10) return null; return { a, b, op: "+" }; } },
  // 2けた＋2けた（くりあがり なし）  例 34＋25
  { id: "add2", w: 1, make() { const a = rnd(11, 88), b = rnd(10, 99 - a); if ((a % 10) + (b % 10) >= 10) return null; return { a, b, op: "+" }; } },
  // 2けた−2けた（くりさがり あり）  例 72−35
  { id: "sub2b", w: 3, make() { const a = rnd(21, 98), b = rnd(11, a - 1); if ((a % 10) >= (b % 10)) return null; return { a, b, op: "-" }; } },
  // 2けた−2けた（くりさがり なし）
  { id: "sub2", w: 1, make() { const a = rnd(21, 99), b = rnd(10, a - 1); if ((a % 10) < (b % 10)) return null; return { a, b, op: "-" }; } },
  // こたえが 3けたに なる たしざん  例 76＋58
  { id: "add3", w: 2, make() { const a = rnd(41, 99), b = rnd(21, 99); if (a + b < 100 || a + b > 198) return null; return { a, b, op: "+" }; } },
  // 百いくつ − 2けた  例 125−43 / 104−8
  { id: "sub3", w: 2, make() { const a = rnd(101, 180), b = rnd(5, 99); if (a - b >= 100 || a - b <= 0) return null; return { a, b, op: "-" }; } },
  // 何十・何百の けいさん  例 70＋50 / 130−80 / 300＋500 / 800−300
  { id: "tens", w: 1, make() {
      if (Math.random() < 0.5) {
        if (Math.random() < 0.5) { const a = rnd(2, 9) * 10, b = rnd(2, 9) * 10; return { a, b, op: "+" }; }
        const a = rnd(11, 18) * 10, b = rnd(2, 9) * 10; if (a - b <= 0) return null; return { a, b, op: "-" };
      }
      if (Math.random() < 0.5) { const a = rnd(1, 8) * 100, b = rnd(1, 9 - a / 100) * 100; return { a, b, op: "+" }; }
      const a = rnd(3, 10) * 100, b = rnd(1, a / 100 - 1) * 100; return { a, b, op: "-" };
    } },
  // 九九
  { id: "kuku", w: 3, make() { return { a: rnd(2, 9), b: rnd(1, 9), op: "×" }; } },
];

export const GRADE_SETS = { 2: { label: "2年生", kinds: G2 } };

function calc(a, b, op) { return op === "+" ? a + b : op === "-" ? a - b : a * b; }
export const qKey = (q) => `${q.a}${q.op}${q.b}`;

function makeOne(kinds) {
  const total = kinds.reduce((s, k) => s + k.w, 0);
  let r = Math.random() * total, kind = kinds[kinds.length - 1];
  for (const k of kinds) { r -= k.w; if (r <= 0) { kind = k; break; } }
  // しゅるいを きめてから 作りなおす（しゅるいごとの でやすさを w の とおりに するため）
  for (let tries = 0; tries < 200; tries++) {
    const q = kind.make();
    if (q) return { ...q, ans: calc(q.a, q.b, q.op), kind: kind.id };
  }
  return { a: 2, b: 3, op: "×", ans: 6, kind: "kuku" };
}

/* きょうの 10もんを つくる：ノートの おさらい（きょうが きじつ）→ のこりは あたらしい もんだい */
export function buildDailySet(daily, grade = 2) {
  const today = todayStr();
  const due = Object.values(daily.notebook || {})
    .filter((n) => n.due <= today)
    .sort((x, y) => (x.due < y.due ? -1 : 1))
    .slice(0, REVIEW_MAX)
    .map((n) => ({ ...n.q, review: true }));
  const used = new Set(due.map(qKey));
  const out = [...due];
  const kinds = (GRADE_SETS[grade] || GRADE_SETS[2]).kinds;
  let guard = 0;
  while (out.length < DAILY_COUNT && guard++ < 500) {
    const q = makeOne(kinds);
    if (used.has(qKey(q))) continue;
    used.add(qKey(q));
    out.push(q);
  }
  // おさらいが さいしょに かたまらないよう まぜる
  for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/* ---- まちがいノートの こうしん ---- */
function noteWrong(notebook, q) {
  const k = qKey(q);
  const prev = notebook[k];
  return { ...notebook, [k]: { q: { a: q.a, b: q.b, op: q.op, ans: q.ans, kind: q.kind }, level: 0, due: addDays(todayStr(), 1), miss: (prev ? prev.miss : 0) + 1 } };
}
function noteRight(notebook, q) {
  const k = qKey(q);
  const n = notebook[k];
  if (!n || n.due > todayStr()) return notebook;      // ノートに ない／まだ きじつ前 → そのまま
  const level = n.level + 1;
  const next = { ...notebook };
  if (level >= REVIEW_GAPS.length) delete next[k];    // そつぎょう！
  else next[k] = { ...n, level, due: addDays(todayStr(), REVIEW_GAPS[level]) };
  return next;
}

const OP_JA = { "+": "＋", "-": "－", "×": "×" };

/* ---- ヒント：ひっさんの かたち（こたえは 見せない） ---- */
function ColumnHint({ q }) {
  if (q.op === "×") {
    return <div className="dm-hint-kuku">{q.a}の だんだよ。<br />{q.a} を {q.b}かい たすと…？</div>;
  }
  const w = Math.max(String(q.a).length, String(q.b).length, String(q.ans).length);
  const cells = (n) => String(n).padStart(w, " ").split("");
  return (
    <div className="dm-col-wrap">
      <div className="dm-col" style={{ gridTemplateColumns: `28px repeat(${w}, 30px)` }}>
        <span />{cells(q.a).map((c, i) => <span key={"a" + i} className="dm-col-d">{c.trim()}</span>)}
        <span className="dm-col-op">{OP_JA[q.op]}</span>{cells(q.b).map((c, i) => <span key={"b" + i} className="dm-col-d">{c.trim()}</span>)}
        <span className="dm-col-line" style={{ gridColumn: `1 / span ${w + 1}` }} />
        <span />{cells(q.ans).map((_, i) => <span key={"c" + i} className="dm-col-d dm-col-blank">□</span>)}
      </div>
      <div className="dm-col-note">
        {q.op === "+" ? "一のくらいから たそう。10を こえたら くりあげ！" : "一のくらいから ひこう。ひけない ときは となりから かりてくる！"}
      </div>
    </div>
  );
}

/* ---- すうじ キー ---- */
function Keypad({ onKey, disabled }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "けす", "0", "こたえる"];
  return (
    <div className="dm-keys">
      {keys.map((k) => (
        <button key={k} disabled={disabled}
          className={"dm-key" + (k === "こたえる" ? " dm-key-ok" : k === "けす" ? " dm-key-del" : "")}
          onClick={() => onKey(k)}>{k}</button>
      ))}
    </div>
  );
}

const fmtSec = (s) => (s >= 60 ? `${Math.floor(s / 60)}ふん ${s % 60}びょう` : `${s}びょう`);

/* ============================== 本体 ================================== */
export function DailyPlay({ daily, character, sfx, onComplete, onPickEgg, onExit }) {
  const [stage, setStage] = useState("intro");           // intro | play | done
  const [set, setSet] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("ask");              // ask | right | wrong1 | reveal
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState([]);             // { right:boolean(1かいめ), hint:boolean }
  const [sec, setSec] = useState(0);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(0);
  const nbRef = useRef(daily.notebook || {});

  const today = todayStr();
  const dueCount = useMemo(() => Object.values(daily.notebook || {}).filter((n) => n.due <= today).length, [daily, today]);
  const noteCount = Object.keys(daily.notebook || {}).length;
  const doneToday = daily.lastDate === today;

  useEffect(() => {
    if (stage !== "play") return;
    const t = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  const q = set[idx];

  const start = () => {
    sfx.tap();
    nbRef.current = daily.notebook || {};
    setSet(buildDailySet(daily, 2));
    setIdx(0); setInput(""); setPhase("ask"); setShowHint(false); setResults([]);
    setSec(0); startRef.current = Date.now();
    setStage("play");
  };

  const finish = (res) => {
    const total = Math.floor((Date.now() - startRef.current) / 1000);
    const correct = res.filter((r) => r.right).length;
    const hints = res.filter((r) => r.hint).length;
    // れんぞく日数・おやすみチケット・ドラゴンの そだちポイント（その日 はじめての ときだけ）
    const { daily: base, report } = applyCompletion(daily, { correct, hints, total: DAILY_COUNT }, today);
    const firstToday = report.firstToday;
    const streakDays = base.streakDays || 0;
    const prevBest = daily.bestSec;
    const isBest = correct === DAILY_COUNT && (prevBest == null || total < prevBest);
    const stars = correct * STAR_PER_RIGHT + (firstToday ? STAR_DAILY_BONUS : 0);
    const nd = {
      ...base,
      bestSec: isBest ? total : prevBest,
      notebook: nbRef.current,
      history: [...(daily.history || []), { date: today, correct, total: DAILY_COUNT, sec: total, hints }].slice(-60),
    };
    onComplete(nd, stars);
    setSummary({ correct, hints, total, streakDays, isBest, prevBest, stars, firstToday, noteCount: Object.keys(nd.notebook).length, dragon: report, dragonNow: nd.dragon });
    setStage("done");
  };

  const goNext = (res) => {
    setInput(""); setShowHint(false); setPhase("ask");
    if (idx + 1 >= set.length) { finish(res); return; }
    setIdx(idx + 1);
  };

  const submit = () => {
    if (!input) return;
    const v = Number(input);
    if (v === q.ans) {
      sfx.correct();
      if (phase === "ask") nbRef.current = noteRight(nbRef.current, q);
      const res = phase === "ask" ? [...results, { right: true, hint: showHint }] : results;
      setResults(res);
      setPhase("right");
      return;
    }
    sfx.wrong();
    if (phase === "ask") {
      // 1かいめの まちがい：ノートに いれて、ヒントを 出して もういちど
      nbRef.current = noteWrong(nbRef.current, q);
      setResults([...results, { right: false, hint: showHint }]);
      setPhase("wrong1");
      setShowHint(true);
      setInput("");
    } else {
      setPhase("reveal");
    }
  };

  const onKey = (k) => {
    if (phase === "right" || phase === "reveal") return;
    if (k === "けす") { sfx.tap(); setInput((s) => s.slice(0, -1)); return; }
    if (k === "こたえる") { submit(); return; }
    sfx.tap();
    setInput((s) => (s.length >= 4 ? s : (s === "0" ? k : s + k)));
  };

  /* ---------------- intro ---------------- */
  if (stage === "intro") {
    return (
      <div className="dm-wrap">
        <div className="dm-chara">{character("idle")}</div>
        <h2 className="kk-h2">まいにち けいさん</h2>
        <div className="dm-card">
          <div className="dm-intro-line">きょうの もんだい <b>{DAILY_COUNT}もん</b>（2年生）</div>
          <div className="dm-intro-line">じかんは はかるけど、<b>あわてなくて だいじょうぶ</b>。<br />まずは まちがえない ことが いちばん！</div>
          {!needsEgg(daily) && <DragonMini daily={daily} />}
          {dueCount > 0 && <div className="dm-intro-line dm-intro-review">📒 まちがいノートの おさらいが <b>{Math.min(dueCount, REVIEW_MAX)}もん</b> まざってるよ</div>}
          <div className="dm-badges">
            <div><b>{currentStreak(daily, today)}</b><small>れんぞく 日</small></div>
            <div><b>{daily.bestSec != null ? fmtSec(daily.bestSec) : "—"}</b><small>ぜんもん せいかいの<br />さいこう タイム</small></div>
            <div><b>{noteCount}</b><small>ノートの もんだい</small></div>
          </div>
          {doneToday && <div className="dm-intro-done">きょうの ぶんは もう できたよ！ もういちど やっても いいよ♪</div>}
        </div>
        {needsEgg(daily) ? (
          <div className="dm-card">
            {daily.dragon && <div className="dm-intro-line">🐉 {DRAGONS[daily.dragon.element].name}ドラゴンが おとなに なったよ！</div>}
            <EggPicker dex={daily.dragonDex} sfx={sfx} onPick={onPickEgg}
              title={daily.dragon ? "つぎの たまごを えらんでから はじめよう" : "まいにち けいさん で そだてる たまごを えらんでね"} />
          </div>
        ) : <button className="kk-big-btn" onClick={start}>はじめる ♪</button>}
        <button className="kk-text-btn" onClick={onExit}>ほかの れんしゅうに もどる</button>
      </div>
    );
  }

  /* ---------------- done ---------------- */
  if (stage === "done" && summary) {
    const s = summary;
    const perfect = s.correct === DAILY_COUNT;
    return (
      <div className="dm-wrap">
        <div className="dm-chara">{character(perfect ? "happy" : "idle")}</div>
        <h2 className="kk-h2">{perfect ? "ぜんもん せいかい！🎉" : "きょうの ぶん おしまい！"}</h2>
        {s.dragon.stageTo && s.dragonNow && (
          <div className="dm-card">
            <StageUpCelebration element={s.dragonNow.element} from={s.dragon.stageFrom} to={s.dragon.stageTo} />
            {s.dragon.dexAdded && <div className="dr-dex-msg">📖 ドラゴンずかんに とうろく！</div>}
            {s.dragon.becameMaster && <div className="dr-title-badge">👑 しょうごう「ドラゴンマスター」！</div>}
          </div>
        )}
        <div className="dm-card">
          <div className="dm-score"><b>{s.correct}</b> / {DAILY_COUNT} もん</div>
          <div className="dm-intro-line">タイム：<b>{fmtSec(s.total)}</b>{s.isBest && <span className="dm-best"> さいこう きろく！</span>}</div>
          {s.firstToday && <div className="dm-intro-line">🔥 <b>{s.streakDays}日</b> れんぞく！</div>}
          {s.dragon.ticketUsed && <div className="dr-ticket">🌙 おやすみチケットで れんぞく キープ！</div>}
          <div className="dm-comment">
            {s.hints > 0
              ? "ヒントを つかって さいごまで できたね。つぎは ヒントなしで ちょうせん してみよう！"
              : perfect
                ? "ヒントなしで ぜんぶ じぶんの ちからで できたね！すごい！"
                : "ヒントを つかわずに さいごまで がんばったね！まちがえた もんだいは ノートで おさらい しよう。"}
          </div>
          <div className="dm-intro-line">📒 まちがいノート：<b>{s.noteCount}もん</b>{s.noteCount > 0 ? "（また こんど 出るよ）" : ""}</div>
          {s.dragon.gains.length > 0 && (
            <div className="dr-gains">
              <div className="dr-gains-title">🐉 ドラゴンの そだちポイント +{s.dragon.gained}</div>
              {s.dragon.gains.map((g, i) => <div key={i} className="dr-gain"><span>{g.icon} {g.label}</span><b>+{g.pt}</b></div>)}
            </div>
          )}
          {!s.firstToday && <div className="dm-intro-line" style={{ fontSize: 12 }}>そだちポイントは 1日1かい。また あしたね！</div>}
          <div className="dm-stars">星のかけら ★{s.stars} ゲット！{s.firstToday && <small>（きょうの ボーナス ★{STAR_DAILY_BONUS} こみ）</small>}</div>
        </div>
        <button className="kk-big-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }

  /* ---------------- play ---------------- */
  if (!q) return null;
  return (
    <div className="dm-wrap">
      <div className="dm-top">
        <span className="dm-count">{idx + 1} / {set.length}</span>
        {q.review && <span className="dm-review-tag">📒 おさらい</span>}
        <span className="dm-timer">⏱ {fmtSec(sec)}</span>
      </div>
      <div className="dm-progress"><div className="dm-progress-fill" style={{ width: (idx / set.length) * 100 + "%" }} /></div>

      <div className="dm-mini-chara">{character(phase === "right" ? "happy" : phase === "ask" ? "idle" : "oops", 72)}</div>
      <div className="dm-card dm-qcard">
        <div className="dm-q">
          {q.a} {OP_JA[q.op]} {q.b} ＝ <span className={"dm-ans" + (input ? "" : " dm-ans-empty")}>{phase === "reveal" ? q.ans : (input || "？")}</span>
        </div>

        {phase === "right" && <div className="dm-msg dm-msg-ok">せいかい！✨</div>}
        {phase === "wrong1" && <div className="dm-msg dm-msg-ng">おしい！ ヒントを 見て もういちど やってみよう</div>}
        {phase === "reveal" && <div className="dm-msg dm-msg-ng">こたえは <b>{q.ans}</b> だよ。ノートに いれておくね。<br />また こんど ちょうせん しよう！</div>}

        {(phase === "ask" || phase === "wrong1") && (showHint
          ? <ColumnHint q={q} />
          : <button className="kk-hint-btn" onClick={() => { sfx.tap(); setShowHint(true); }}>？ ひっさんで みる（ヒント）</button>)}
      </div>

      {(phase === "right" || phase === "reveal")
        ? <button className="kk-big-btn" onClick={() => { sfx.tap(); goNext(results); }}>{idx + 1 >= set.length ? "けっかを 見る →" : "つぎへ →"}</button>
        : <Keypad onKey={onKey} />}
    </div>
  );
}
