/* =====================================================================
   3年生：わり算・小数・分数 の モード
   ながれ：① 図で うごかして わかる（Explore）→ ② もんだい 10もん → ③ けっか
   - はじめての ときは すぐ ① から（「じゅんび」のような ボタンは なし）
     2かいめ からは スタート画面で「もんだい」か「図で たしかめる」を えらべる
   - こたえかたは 三択から。10もんで 8もん いじょう（1かいめで）せいかいが 2かい つづくと 入力に なる（g3.js）
   - ごほうびは ★（→ コーデ）だけ。ドラゴンは そだたない
   ===================================================================== */
import React, { useState } from "react";
import "./grade3.css";
import "../dailyMode.css";
import { UNIT_INFO, ROUND, INPUT_AFTER, STAR_PER_RIGHT_UNIT, makeRound, makeChoices, applyUnitRound, setUnitInput, markExplored, normalizeGrade3 } from "./g3.js";
import { DivExplore, DecExplore, FracExplore } from "./Explore.jsx";
import { G3Question } from "./Question.jsx";

const EXPLORE = { div: DivExplore, dec: DecExplore, frac: FracExplore };

export function Grade3Unit({ unit, grade3, character, sfx, onSave, onComplete, onExit }) {
  const g = normalizeGrade3(grade3), u = g.units[unit], info = UNIT_INFO[unit];
  const [stage, setStage] = useState(u.explored ? "intro" : "explore");   // intro | explore | play | done
  const [set, setSet] = useState([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const start = () => {
    const qs = makeRound(unit).map((q) => ({ ...q, choices: makeChoices(q) }));
    if (import.meta.env.DEV) window.__g3Set = qs;      // ブラウザ テスト用（本番には 入らない）
    setSet(qs); setIdx(0); setResults([]); setSummary(null); setStage("play");
  };
  const finishExplore = () => {
    if (!u.explored) onSave(markExplored(g, unit));
    start();
  };
  const finish = (res) => {
    const r = applyUnitRound(g, unit, res);
    const hints = res.filter((x) => x.hint).length;
    const stars = r.correct * STAR_PER_RIGHT_UNIT;
    onComplete(r.g3, stars);
    setSummary({ correct: r.correct, hints, stars, unlock: r.unlock, toUnlock: r.toUnlock, input: r.g3.units[unit].input });
    setStage("done");
  };

  const Ex = EXPLORE[unit];
  const head = <h2 className="kk-h2 g3-title">{info.icon} {info.label}</h2>;

  if (stage === "explore") {
    return (
      <div className="dm-wrap">
        {head}
        <Ex sfx={sfx} onFinish={finishExplore} />
        {u.explored && <button className="kk-text-btn" onClick={() => { sfx.tap(); start(); }}>とばして もんだいへ</button>}
        <button className="kk-text-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }

  if (stage === "intro") {
    return (
      <div className="dm-wrap">
        <div className="dm-chara">{character("idle")}</div>
        {head}
        <div className="dm-card">
          <div className="dm-intro-line">もんだい <b>{ROUND}もん</b>。{u.input ? <>こたえは <b>じぶんで 入力</b> しよう</> : <>こたえは <b>3つから えらぼう</b></>}</div>
          {!u.input && <div className="dm-intro-line g3-intro-sub">10もんで 8もん いじょう できるのが {INPUT_AFTER}かい つづくと、じぶんで 入力に ステップアップ！{u.good > 0 && <>（あと {INPUT_AFTER - u.good}かい）</>}</div>}
          <div className="dm-intro-line g3-intro-sub">わからない ときは ヒントで 図が 見られるよ</div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); start(); }}>もんだい ♪</button>
        <button className="kk-text-btn" onClick={() => { sfx.tap(); setStage("explore"); }}>図で うごかして たしかめる</button>
        {u.input && <button className="kk-tiny-btn g3-mode-toggle" onClick={() => { sfx.tap(); onSave(setUnitInput(g, unit, false)); }}>3つから えらぶ もんだいに もどす</button>}
        <button className="kk-text-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }

  if (stage === "done" && summary) {
    const s = summary, perfect = s.correct === ROUND;
    return (
      <div className="dm-wrap">
        <div className="dm-chara">{character(perfect ? "happy" : "idle")}</div>
        <h2 className="kk-h2">{perfect ? "ぜんもん せいかい！🎉" : `${info.label} おしまい！`}</h2>
        <div className="dm-card">
          <div className="dm-score"><b>{s.correct}</b> / {ROUND} もん</div>
          <div className="dm-comment">
            {s.hints > 0
              ? "ヒントを つかって さいごまで できたね。つぎは ヒントなしで やってみよう！"
              : perfect ? "ヒントなしで ぜんぶ じぶんの ちからで できたね！すごい！"
                : "ヒントを つかわずに さいごまで がんばったね！"}
          </div>
          {s.unlock && <div className="g3-unlock">🎉 ステップアップ！ つぎから こたえを <b>じぶんで 入力</b> してみよう</div>}
          {!s.input && !s.unlock && s.toUnlock > 0 && s.correct >= 8 && <div className="dm-intro-line g3-intro-sub">あと {s.toUnlock}かいで 入力に ステップアップ！</div>}
          <div className="dm-stars">星のかけら ★{s.stars} ゲット！</div>
        </div>
        <button className="kk-big-btn" onClick={() => { sfx.tap(); start(); }}>もういちど ♪</button>
        <button className="kk-text-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }

  const q = set[idx];
  if (!q) return null;
  return (
    <div className="dm-wrap">
      <div className="dm-top">
        <span className="dm-count">{idx + 1} / {set.length}</span>
        <span className="g3-unit-tag">{info.icon} {info.label}</span>
      </div>
      <div className="dm-progress"><div className="dm-progress-fill" style={{ width: (idx / set.length) * 100 + "%" }} /></div>
      <G3Question key={idx} q={q} choices={q.choices} inputMode={u.input} sfx={sfx} character={character} isLast={idx + 1 >= set.length}
        onDone={(r) => {
          const res = [...results, r];
          setResults(res);
          if (idx + 1 >= set.length) finish(res); else setIdx(idx + 1);
        }} />
    </div>
  );
}
