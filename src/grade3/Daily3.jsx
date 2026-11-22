/* =====================================================================
   毎日計算（3年生）
   - 10もん：3年生 6（しき 4 ＋ よみとりチェック 2）／ 2年生の まいにち けいさん（しき）3 ／ ようせいの くに 1
     よみとりチェックは 2年生と おなじ 画面（YomitoriQuestion）。読み方の だんかい（daily.yomiRead）も 2年生と 共通
   - まちがえた もんだいは 3年生の「まちがいノート」に たまり、1日後・3日後・7日後に もういちど（ようせいの くには 入れない）
   - ヒント・けっか画面・れんぞく日数・ドラゴンは 2年生の まいにち けいさん と おなじ 作り
     ドラゴン・れんぞく日数・スタンプ（カレンダー）・その日の ボーナス★ は 2年生と おなじ daily（applyCompletion）で きめる
     → 2年生版と 3年生版を 同じ日に 両方 やっても、そだつのは 1日1かい ぶん
   - 3年生の もんだいの こたえかた（三択／入力）は、その 単元の モードの すすみに あわせる
   ===================================================================== */
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./grade3.css";
import "../dailyMode.css";
import { todayStr, applyCompletion, needsEgg, currentStreak } from "../dragon.js";
import { DragonMini, EggPicker, StageUpCelebration, DRAGONS } from "../DragonMode.jsx";
import { fmtSec, STAR_PER_RIGHT, STAR_DAILY_BONUS, REVIEW_MAX, Keypad } from "../DailyMode.jsx";
import { YomitoriQuestion } from "../YomitoriQuestion.jsx";
import { normalizeReadProgress, applyReadResults } from "../yomitori.js";
import { DAILY3_COUNT, DAILY3_MIX, buildDaily3Set, makeChoices, noteWrong3, noteRight3, normalizeGrade3, UNIT_INFO } from "./g3.js";
import { G3Question } from "./Question.jsx";
import { G3Footer } from "./Footer.jsx";

const TAG = { div: "🍪 わり算", dec: "🧃 小数", frac: "🍰 分数", yomi: "📖 よみとり", g2: "📘 2年生", fairy: "🧚 ようせいの くに" };

export function Daily3Play({ daily, grade3, character, sfx, onComplete, onPickEgg, onExit }) {
  const g = normalizeGrade3(grade3);
  const [stage, setStage] = useState("intro");
  const [set, setSet] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [sec, setSec] = useState(0);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(0);
  const [readStage, setReadStage] = useState("A");      // 読み方の 手つだいの だんかい（2年生の よみとりチェックと 共通）
  const nbRef = useRef(g.daily.notebook);

  const today = todayStr();
  const dueCount = useMemo(() => Object.values(g.daily.notebook).filter((n) => n.due <= today).length, [grade3, today]); // eslint-disable-line
  const noteCount = Object.keys(g.daily.notebook).length;
  const doneToday = g.daily.lastDate === today;

  useEffect(() => {
    if (stage !== "play") return undefined;
    const t = setInterval(() => setSec(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  const start = () => {
    sfx.tap();
    nbRef.current = g.daily.notebook;
    const ns = buildDaily3Set(g).map((q) => (q.wp || q.unit === "fairy" || q.unit === "g2" ? q : { ...q, choices: makeChoices(q) }));
    setReadStage(normalizeReadProgress(daily.yomiRead).stage);
    if (import.meta.env.DEV) window.__daily3Set = ns;   // ブラウザ テスト用（本番には 入らない）
    setSet(ns); setIdx(0); setResults([]); setSec(0); startRef.current = Date.now();
    setStage("play");
  };

  const finish = (res) => {
    const total = Math.floor((Date.now() - startRef.current) / 1000);
    const correct = res.filter((r) => r.right).length;
    const hints = res.filter((r) => r.hint).length;
    // れんぞく・ドラゴン・その日の ボーナスは 2年生と 共通の daily で（その日 はじめての ときだけ）
    const { daily: nd0, report } = applyCompletion(daily, { correct, hints, total: DAILY3_COUNT }, today);
    // 読み方の だんかい（いっぱつで 見つけた かず）は 2年生と 共通の daily.yomiRead に つみあげる
    const nd = { ...nd0, yomiRead: applyReadResults(daily.yomiRead, res.filter((x) => x.wp)) };
    const firstToday = report.firstToday;
    const prevBest = g.daily.bestSec;
    const isBest = correct === DAILY3_COUNT && (prevBest == null || total < prevBest);
    const stars = correct * STAR_PER_RIGHT + (firstToday ? STAR_DAILY_BONUS : 0);
    const ng = {
      ...g,
      daily: {
        ...g.daily, lastDate: today, bestSec: isBest ? total : prevBest, notebook: nbRef.current,
        history: [...g.daily.history, { date: today, correct, total: DAILY3_COUNT, sec: total, hints }].slice(-60),
      },
    };
    onComplete(nd, ng, stars);
    const by = (u) => res.filter((r) => r.unit === u);
    setSummary({ correct, hints, total, isBest, stars, firstToday, streakDays: nd.streakDays || 0, noteCount: Object.keys(nbRef.current).length,
      dragon: report, dragonNow: nd.dragon, parts: ["div", "dec", "frac", "yomi", "g2", "fairy"].map((u) => ({ u, n: by(u).length, ok: by(u).filter((r) => r.right).length })).filter((p) => p.n > 0) });
    setStage("done");
  };

  /* ---------------- intro ---------------- */
  if (stage === "intro") {
    return (
      <div className="dm-wrap g3-scope">
        <div className="dm-chara">{character("idle")}</div>
        <h2 className="kk-h2">📅 毎日計算 <small className="g3-grade-chip">3年生</small></h2>
        <div className="dm-card">
          <div className="dm-intro-line">きょうの もんだい <b>{DAILY3_COUNT}もん</b></div>
          <div className="dm-intro-line g3-intro-sub">わり算・小数・分数が {DAILY3_MIX.g3}もん（そのうち 📖 よみとりチェックが {DAILY3_MIX.g3yomi}もん）、2年生の けいさんが {DAILY3_MIX.g2}もん、ようせいの くにから {DAILY3_MIX.fairy}もん</div>
          <div className="dm-intro-line">じかんは はかるけど、<b>あわてなくて だいじょうぶ</b>。</div>
          {!needsEgg(daily) && <DragonMini daily={daily} />}
          {dueCount > 0 && <div className="dm-intro-line dm-intro-review">📒 まちがいノートの おさらいが <b>{Math.min(dueCount, REVIEW_MAX)}もん</b> まざってるよ</div>}
          <div className="dm-badges">
            <div><b>{currentStreak(daily, today)}</b><small>れんぞく 日</small></div>
            <div><b>{g.daily.bestSec != null ? fmtSec(g.daily.bestSec) : "—"}</b><small>ぜんもん せいかいの<br />さいこう タイム</small></div>
            <div><b>{noteCount}</b><small>ノートの もんだい</small></div>
          </div>
          {doneToday && <div className="dm-intro-done">きょうの ぶんは もう できたよ！ もういちど やっても いいよ♪</div>}
          {!doneToday && daily.lastDate === today && <div className="dm-intro-line g3-intro-sub">🐉 きょうの ドラゴンの そだちポイントは 2年生の まいにち けいさんで もう もらったよ</div>}
        </div>
        {needsEgg(daily) ? (
          <div className="dm-card">
            {daily.dragon && <div className="dm-intro-line">🐉 {DRAGONS[daily.dragon.element].name}ドラゴンが おとなに なったよ！</div>}
            <EggPicker dex={daily.dragonDex} sfx={sfx} onPick={onPickEgg}
              title={daily.dragon ? "つぎの たまごを えらんでから はじめよう" : "毎日計算 で そだてる たまごを えらんでね"} />
          </div>
        ) : <button className="kk-big-btn" onClick={start}>はじめる ♪</button>}
        <G3Footer onBack={onExit} backLabel="ほかの れんしゅうに もどる" />
      </div>
    );
  }

  /* ---------------- done ---------------- */
  if (stage === "done" && summary) {
    const s = summary, perfect = s.correct === DAILY3_COUNT;
    return (
      <div className="dm-wrap g3-scope">
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
          <div className="dm-score"><b>{s.correct}</b> / {DAILY3_COUNT} もん</div>
          <div className="dm-intro-line">タイム：<b>{fmtSec(s.total)}</b>{s.isBest && <span className="dm-best"> さいこう きろく！</span>}</div>
          {s.firstToday && <div className="dm-intro-line">🔥 <b>{s.streakDays}日</b> れんぞく！</div>}
          {s.dragon.ticketUsed && <div className="dr-ticket">🌙 おやすみチケットで れんぞく キープ！</div>}
          <div className="dm-comment">
            {s.hints > 0
              ? "ヒントを つかって さいごまで できたね。つぎは ヒントなしで ちょうせん してみよう！"
              : perfect ? "ヒントなしで ぜんぶ じぶんの ちからで できたね！すごい！"
                : "ヒントを つかわずに さいごまで がんばったね！まちがえた もんだいは ノートで おさらい しよう。"}
          </div>
          <div className="g3-parts">{s.parts.map((p) => <span key={p.u}>{TAG[p.u]} <b>{p.ok}/{p.n}</b></span>)}</div>
          <div className="dm-intro-line">📒 まちがいノート：<b>{s.noteCount}もん</b>{s.noteCount > 0 ? "（また こんど 出るよ）" : ""}</div>
          {s.dragon.gains.length > 0 && (
            <div className="dr-gains">
              <div className="dr-gains-title">🐉 ドラゴンの そだちポイント +{s.dragon.gained}</div>
              {s.dragon.gains.map((x, i) => <div key={i} className="dr-gain"><span>{x.icon} {x.label}</span><b>+{x.pt}</b></div>)}
            </div>
          )}
          {!s.firstToday && <div className="dm-intro-line" style={{ fontSize: 12 }}>そだちポイントは 1日1かい（2年生と 3年生 あわせて）。また あしたね！</div>}
          <div className="dm-stars">星のかけら ★{s.stars} ゲット！{s.firstToday && <small>（きょうの ボーナス ★{STAR_DAILY_BONUS} こみ）</small>}</div>
        </div>
        <button className="kk-big-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }

  /* ---------------- play ---------------- */
  const q = set[idx];
  if (!q) return null;
  const inputMode = q.unit in UNIT_INFO ? g.units[q.unit].input : true;
  const top = (
    <>
      <div className="dm-top">
        <span className="dm-count">{idx + 1} / {set.length}</span>
        {q.review ? <span className="dm-review-tag">📒 おさらい</span> : <span className="g3-unit-tag">{q.wp ? `${TAG.yomi}（${UNIT_INFO[q.g3unit].label}）` : TAG[q.unit]}</span>}
        {!q.wp && <span className="dm-timer">⏱ {fmtSec(sec)}</span>}
      </div>
      <div className="dm-progress"><div className="dm-progress-fill" style={{ width: (idx / set.length) * 100 + "%" }} /></div>
    </>
  );
  const done1 = (r, unit) => {
    const res = [...results, { ...r, unit }];
    setResults(res);
    if (idx + 1 >= set.length) finish(res); else setIdx(idx + 1);
  };
  if (q.wp) {
    return (
      <div className="dm-wrap g3-scope">
        {top}
        <YomitoriQuestion key={q.id} q={q} stage={readStage} sfx={sfx} Keypad={Keypad} isLast={idx + 1 >= set.length}
          onFinish={(r) => done1({ ...r, wp: true }, "yomi")} />
      </div>
    );
  }
  return (
    <div className="dm-wrap g3-scope">
      {top}
      <G3Question key={idx} q={q} choices={q.choices} inputMode={inputMode} notebook sfx={sfx} character={character} isLast={idx + 1 >= set.length}
        onFirst={(right) => { nbRef.current = right ? noteRight3(nbRef.current, q) : noteWrong3(nbRef.current, q); }}
        onDone={(r) => done1(r, q.unit)} />
    </div>
  );
}
