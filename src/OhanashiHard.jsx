/* =====================================================================
   おはなし もんだい「むずかしい」（よみとりチェックの れんしゅうの 場）
   - 読み方の 型を、手あつい 助けつきで おぼえる：
       きかれている ところを 見つける → つかう 数に マーカー → しき（2だんかいは ①②）
   - こたえ方は おはなし もんだい と 同じ ペン：「しき」（□ ○ □ ＝ □）と「こたえ」
   - ヒントは 2だんかい（ことばの ヒント → 図の ヒント）
   - せいかい したら マーカーを ひいて、「どの 数を どう つかったか」を みじかい 解説で 見せる
   - まちがえても とめない。2かい まちがえたら 解説を 見せて つぎへ
   - 補助の 段階 A／B／C は まいにち けいさん とは べつに、セーブの ohanashi.yomiRead で すすむ
   - 時間は はからない。5もん やりきると ドラゴンの「ごはん」（dragon.js の applyStoryFeed）
   読み方の 部品（YomitoriRead.jsx）・場面の 絵（YomitoriScenes.jsx）・たんいの 図（UnitHint.jsx）は まいにち けいさん と 共通
   ===================================================================== */
import React, { useRef, useState } from "react";
import WriteBox from "./handwriting/WriteBox.jsx";
import { useAttempts } from "./WriteModes.jsx";
import { useReadMarks, ReadText, YomitoriPic } from "./YomitoriRead.jsx";
import { YomitoriScenes } from "./YomitoriScenes.jsx";
import { UnitHint } from "./UnitHint.jsx";
import { normalizeReadProgress, applyReadResults, pickPraise, READ_STREAK_UP } from "./yomitori.js";
import { buildOhanashiSet, checkExpr, checkAnswer, explainStep, answerText, OPS, OH_PEOPLE, SPEAKER, OH_PER_SET } from "./ohanashiYomitori.js";
import { applyStoryFeed, STORY_FOOD_PER_POINT, STORY_FOOD_DAY_MAX, todayStr } from "./dragon.js";
import "./ohanashi.css";

const STAR_PER_RIGHT = 10;                 // ★：1もん せいかい ごとに（まいにち けいさん と 同じ）
const charUrls = import.meta.glob("./art/chars/*_idle.webp", { eager: true, query: "?url", import: "default" });
const PEOPLE = Object.fromEntries(Object.entries(OH_PEOPLE).map(([k, name]) => [k, { name, url: charUrls[`./art/chars/${SPEAKER[k]}_idle.webp`] || null }]));
const STAGE_INFO = {
  A: { name: "ステップ A", desc: "せいかい したら マーカーを ひいて あげるね" },
  B: { name: "ステップ B", desc: "せいかい したら、つかった 数に じぶんで マーカーを ひこう" },
  C: { name: "ステップ C", desc: "じぶんで マーカーを ひきながら とこう" },
};

/* ------------------------------ 図の ヒント ------------------------------ */
const C = { a: "#FFB3D6", b: "#9FD0FF", q: "#FFF1A8", ink: "#3A2A6B", sub: "#7A5C98", line: "#C9A8F0" };
function Bar({ x, y, w, h = 22, fill, label, dash }) {
  return (
    <g>
      <rect x={x} y={y} width={Math.max(2, w)} height={h} rx={4} fill={fill} stroke={dash ? "#E85FA3" : C.ink} strokeWidth={1.2} strokeDasharray={dash ? "4 3" : undefined} />
      {label && <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>{label}</text>}
    </g>
  );
}
const Brace = ({ x1, x2, y, label, up = true }) => (
  <g>
    <path d={`M${x1} ${y} q0 ${up ? -8 : 8} 8 ${up ? -8 : 8} H${x2 - 8} q8 0 8 ${up ? 8 : -8}`} fill="none" stroke={C.sub} strokeWidth={1.4} />
    <text x={(x1 + x2) / 2} y={up ? y - 12 : y + 22} textAnchor="middle" fontSize={12} fontWeight={900} fill="#E85FA3">{label}</text>
  </g>
);
export function FigHint({ fig, text }) {
  if (fig.type === "unit") return <UnitHint u={fig.u} text={text} />;
  const W = 300, L = 14, R = W - 14;
  let body = null, H = 90;
  if (fig.type === "join" || fig.type === "take" || fig.type === "compare") {
    const max = Math.max(fig.a + (fig.type === "join" ? fig.b : 0), fig.a, fig.b);
    const sc = (v) => (v / max) * (R - L);
    if (fig.type === "join") {
      body = <>
        <Brace x1={L} x2={L + sc(fig.a + fig.b)} y={38} label="ぜんぶで ？" />
        <Bar x={L} y={42} w={sc(fig.a)} fill={C.a} label={`${fig.a}${fig.unit}`} />
        <Bar x={L + sc(fig.a)} y={42} w={sc(fig.b)} fill={C.b} label={`${fig.b}${fig.unit}`} />
        <text x={L + sc(fig.a) / 2} y={80} textAnchor="middle" fontSize={10} fill={C.sub}>{fig.la}</text>
        <text x={L + sc(fig.a) + sc(fig.b) / 2} y={80} textAnchor="middle" fontSize={10} fill={C.sub}>{fig.lb}</text>
      </>;
    } else if (fig.type === "take") {
      body = <>
        <Brace x1={L} x2={R} y={30} label={`はじめ ${fig.a}${fig.unit}`} />
        <Bar x={L} y={34} w={sc(fig.a - fig.b)} fill={C.q} label="のこり ？" />
        <Bar x={L + sc(fig.a - fig.b)} y={34} w={sc(fig.b)} fill={C.b} label={`${fig.b}${fig.unit}`} dash />
        <text x={L + sc(fig.a - fig.b) + sc(fig.b) / 2} y={72} textAnchor="middle" fontSize={10} fill={C.sub}>{fig.lb}（へる）</text>
      </>;
    } else {
      H = 96;
      body = <>
        <text x={L} y={22} fontSize={11} fontWeight={700} fill={C.ink}>{fig.la}</text>
        <Bar x={L + 34} y={10} w={sc(fig.a) - 34} fill={C.a} label={`${fig.a}${fig.unit}`} />
        <text x={L} y={58} fontSize={11} fontWeight={700} fill={C.ink}>{fig.lb}</text>
        <Bar x={L + 34} y={46} w={sc(fig.b) - 34} fill={C.b} label={`${fig.b}${fig.unit}`} />
        <Bar x={L + sc(fig.b)} y={46} w={sc(fig.a) - sc(fig.b)} fill="#fff" label="ちがい ？" dash />
      </>;
    }
  } else if (fig.type === "groups") {
    const gw = Math.min(64, (R - L) / fig.b - 6);
    H = 34 + Math.ceil(fig.a / 3) * 16 + 24;
    body = <>
      {Array.from({ length: fig.b }, (_, g) => {
        const x = L + g * (gw + 6);
        return (
          <g key={g}>
            <rect x={x} y={8} width={gw} height={Math.ceil(fig.a / 3) * 16 + 8} rx={10} fill="#FFF6E3" stroke="#F3D3AE" />
            {Array.from({ length: fig.a }, (_, i) => <circle key={i} cx={x + gw / 2 + ((i % 3) - 1) * 15} cy={20 + Math.floor(i / 3) * 16} r={6} fill={C.a} stroke={C.ink} strokeWidth={0.8} />)}
          </g>
        );
      })}
      <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={12} fontWeight={900} fill="#E85FA3">{fig.a}{fig.unit}ずつ が {fig.b}つ分 → ぜんぶで ？</text>
    </>;
  } else if (fig.type === "line") {
    const step = (R - L) / fig.n, r = Math.min(9, step / 2 - 1);
    const lab = (i) => {                   // その 本に つく 番号（数える じゅん）
      if (fig.between) { const [p, q2] = fig.between; if (i > p && i < q2) return fig.inner ? i - p : null; if (!fig.inner && i === q2) return i - p; return null; }
      if (fig.from === "left") return i <= fig.upto ? i : null;
      const fromRight = fig.n - i + 1; return fromRight <= fig.upto ? fromRight : null;
    };
    H = 70;
    body = <>
      {Array.from({ length: fig.n }, (_, k) => {
        const i = k + 1, cx = L + step * k + step / 2, mk = fig.marks[i], no = lab(i);
        return (
          <g key={i}>
            <rect x={cx - r} y={14} width={r * 2} height={28} rx={3} fill={mk === "pink" ? "#FF8FC4" : mk === "blue" ? "#6FA8FF" : "#F1E9FB"} stroke={C.ink} strokeWidth={0.8} />
            {no != null && <text x={cx} y={58} textAnchor="middle" fontSize={11} fontWeight={900} fill="#E85FA3">{no}</text>}
          </g>
        );
      })}
      <text x={L} y={10} fontSize={9} fill={C.sub}>← 左</text><text x={R} y={10} textAnchor="end" fontSize={9} fill={C.sub}>右 →</text>
    </>;
  } else if (fig.type === "cal") {
    const n = fig.to - fig.from + 1, step = Math.min(30, (R - L) / n);
    H = 70;
    body = <>
      {Array.from({ length: n }, (_, k) => {
        const d = fig.from + k, x = L + k * step;
        return (
          <g key={d}>
            <rect x={x + 1} y={14} width={step - 2} height={24} rx={4} fill={k === 0 || k === n - 1 ? "#FF8FC4" : "#FFFDF7"} stroke={C.line} />
            <text x={x + step / 2} y={30} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.ink}>{d}</text>
            {fig.count && <text x={x + step / 2} y={54} textAnchor="middle" fontSize={10} fontWeight={900} fill="#E85FA3">{k + 1}</text>}
            {!fig.count && k > 0 && <path d={`M${x - step / 2 + 4} 44 q${step / 2 - 4} 8 ${step - 8} 0`} fill="none" stroke="#E85FA3" strokeWidth={1.2} />}
          </g>
        );
      })}
      {!fig.count && <text x={W / 2} y={64} textAnchor="middle" fontSize={11} fontWeight={900} fill="#E85FA3">すすんだ 数（とびうつった 回数）</text>}
    </>;
  }
  return (
    <div className="oh-fig">
      <svg viewBox={`0 0 ${W} ${H}`} className="oh-fig-svg" role="img" aria-label="図の ヒント">{body}</svg>
      {text && <div className="oh-fig-text">{text}</div>}
    </div>
  );
}

/* ------------------------------ 解説 ------------------------------ */
function Explain({ q, title }) {
  return (
    <div className="oh-explain" role="status">
      <div className="oh-explain-title">{title}</div>
      {q.steps.map((s, i) => {
        const ex = explainStep(s, i, q.steps);
        return (
          <div key={i} className="oh-explain-line">
            <span className={"oh-explain-no oh-mk" + (i + 1)}>{q.steps.length > 1 ? ["①", "②"][i] : "しき"}</span>
            <span className="oh-explain-head">{ex.head}</span>
            <span className="oh-explain-eq">→ {ex.eq}</span>
          </div>
        );
      })}
      <div className="oh-explain-ans">こたえ　<b>{answerText(q)}</b></div>
    </div>
  );
}

/* ------------------------------ 1もん ------------------------------ */
export function OhanashiQuestion({ q, stage, sfx, characters, isLast, onFinish }) {
  const [usedHint, setUsedHint] = useState(false);
  const r = useReadMarks({ q, stage, sfx, onMissTap: () => setUsedHint(true) });
  const pen = useAttempts();
  const [stepIdx, setStepIdx] = useState(0);
  const [ops, setOps] = useState({});
  const [opMarks, setOpMarks] = useState({});
  const [phase, setPhase] = useState("ask");            // ask | stepRight | right | reveal
  const [wrongs, setWrongs] = useState(0);
  const [hintLv, setHintLv] = useState(0);              // 0 なし ／ 1 ことば ／ 2 図
  const [through, setThrough] = useState(null);
  const lock = useRef(false);
  const s = q.steps[stepIdx], last = stepIdx + 1 >= q.steps.length;
  const ch = characters.find((c) => c.id === SPEAKER[q.speaker]) || characters[0];
  const Face = ch.Comp;
  const v = (k) => (pen.res[k] && pen.res[k].text) || "";
  const keys = [`${stepIdx}a`, `${stepIdx}b`, `${stepIdx}r`, ...(last ? q.answer.map((_, i) => `ans${i}`) : [])];
  const ready = keys.every((k) => v(k)) && ops[stepIdx];

  const check = () => {
    if (!ready || lock.current) return;
    sfx.tap();
    const c = checkExpr(s.expr, { a: v(`${stepIdx}a`), b: v(`${stepIdx}b`), r: v(`${stepIdx}r`), op: ops[stepIdx] });
    const m = { [`${stepIdx}a`]: c.a, [`${stepIdx}b`]: c.b, [`${stepIdx}r`]: c.r };
    let ok = c.ok;
    if (last) { const ar = checkAnswer(q.answer, q.answer.map((_, i) => v(`ans${i}`))); ar.forEach((x, i) => { m[`ans${i}`] = x; }); ok = ok && ar.every((x) => x === "right"); }
    setOpMarks({ ...opMarks, [stepIdx]: c.op });
    pen.applyMarks(m);
    if (ok) {
      sfx.correct(); r.stepRight(stepIdx);
      if (!last) { setPhase("stepRight"); return; }
      if (q.steps.length > 1) setThrough(pickPraise("through"));
      lock.current = true; setPhase("right"); return;
    }
    sfx.wrong();
    if (c.op !== "right") setTimeout(() => setOps((o) => ({ ...o, [stepIdx]: null })), 1100);
    const w = wrongs + 1; setWrongs(w);
    if (w >= 2) {                                           // 2かい まちがえたら 解説を 見せて つぎへ
      lock.current = true; r.markAll(q.steps.length - 1); pen.setReveal(true); setPhase("reveal"); return;
    }
    setHintLv((h) => Math.max(h, 1));                       // 1かいめ：ことばの ヒントを 出す
    pen.setMsg(c.close ? "おしい！ かける じゅんばんに 気をつけよう。「1つ分の 数 × いくつ分」だよ"
      : "○が ついていない ところを もういちど かいてみよう。ヒントも 見てね");
  };
  const nextStep = () => { sfx.tap(); r.nextStep(); setStepIdx(stepIdx + 1); setPhase("ask"); pen.setMsg(""); setHintLv(0); };
  const finish = () => {
    sfx.tap();
    onFinish({ right: wrongs === 0 && phase === "right", hint: usedHint, revealed: phase === "reveal",
      oneShot: r.selfMode ? null : r.oneShot === true, through: q.steps.length > 1 && phase === "right", selfMark: r.selfMarked });
  };

  const box = (k, label, reveal) => (
    <WriteBox key={k} small label={label} result={pen.res[k]} onInk={pen.setOne(k)} mark={pen.marks[k] || null}
      locked={pen.marks[k] === "right" || pen.reveal || phase !== "ask"} resetKey={pen.resets[k] || 0} reveal={pen.reveal ? String(reveal) : null} />
  );
  const exprRow = (si) => {
    const e = q.steps[si].expr;
    return (
      <div className="wm-eq oh-eq">
        <div className="wm-slot">{box(`${si}a`, `しき${si + 1}の 1つめの 数`, e.a)}</div>
        <div className="wm-ops oh-ops">
          {["+", "-", "×"].map((o) => (
            <button key={o} type="button" disabled={pen.reveal || opMarks[si] === "right" || phase !== "ask"}
              className={"wm-op" + (ops[si] === o ? " wm-op-on" : "") + (ops[si] === o && opMarks[si] === "right" ? " wm-op-right" : "") + (ops[si] === o && opMarks[si] === "wrong" ? " wm-op-wrong" : "") + (pen.reveal && e.op === o ? " wm-op-on wm-op-right" : "")}
              onClick={() => { sfx.tap(); setOps({ ...ops, [si]: o }); setOpMarks({ ...opMarks, [si]: null }); }}>{OPS[o]}</button>
          ))}
        </div>
        <div className="wm-slot">{box(`${si}b`, `しき${si + 1}の 2つめの 数`, e.b)}</div>
        <div className="wm-sign">＝</div>
        <div className="wm-slot">{box(`${si}r`, `しき${si + 1}の こたえ`, e.r)}</div>
      </div>
    );
  };
  const markWait = r.markPending;            // B：マーカーを ひきおわるまで まつ
  return (
    <div className={"wm-card oh-card" + (r.found ? " oh-found" : "")}>
      <div className="oh-head">
        <div className="oh-face"><Face mood={phase === "right" ? "happy" : "idle"} size={44} /></div>
        <div className="yt-tag oh-tag">📖 よみとり れんしゅう<span className="yt-level">　🖍 {STAGE_INFO[stage].name}{r.selfMode && phase === "ask" ? "：つかう 数を タップで マーカー" : ""}</span></div>
      </div>
      {q.scenes && <YomitoriScenes scenes={q.scenes} people={PEOPLE} />}
      {q.pic && <YomitoriPic pic={q.pic} sfx={sfx} />}
      <ReadText q={q} r={r} />
      {!r.found && <div className="yt-guide">🔍 なにを きかれているかな？ その ところを タップしてね</div>}
      {!r.found && r.tapMsg && <div className="dm-msg dm-msg-ng yt-small">{r.tapMsg}</div>}
      {r.praise && <div className="yt-praise yt-praise-float" role="status">🌟 {r.praise}</div>}

      {r.found && (
        <div className="oh-answer">
          {q.steps.slice(0, stepIdx).map((d, i) => (
            <div key={i} className="yt-done oh-done">{["①", "②"][i]}　<b>{d.expr.a} {OPS[d.expr.op]} {d.expr.b} ＝ {d.expr.r}</b> ✓</div>
          ))}
          <div className="wm-row-label oh-row-label"><span className="wm-tag">{q.steps.length > 1 ? `しき${["①", "②"][stepIdx]}` : "しき"}</span>{s.label && <span className="yt-step oh-step">{s.label.replace(/^[①②]\s*/, "")}</span>}</div>
          {exprRow(stepIdx)}
          {last && (
            <>
              <div className="wm-ans oh-ans">
                <span className="wm-tag oh-tag-ans">こたえ</span>
                {q.answer.map((a, i) => (
                  <React.Fragment key={i}>
                    <div className="wm-slot wm-slot-ans">{box(`ans${i}`, `こたえ${q.answer.length > 1 ? i + 1 : ""}`, a.ans)}</div>
                    <div className="wm-unit">{a.unit}</div>
                  </React.Fragment>
                ))}
              </div>
            </>
          )}

          {phase === "ask" && pen.msg && <div className="wm-msg">{pen.msg}</div>}
          {phase === "stepRight" && <div className="dm-msg dm-msg-ok">せいかい！ でも まだ つづきが あるよ！</div>}
          {phase === "right" && <div className="dm-msg dm-msg-ok">せいかい！✨</div>}
          {phase === "right" && through && <div className="yt-praise">🌟 {through}</div>}
          {(phase === "stepRight" || phase === "right") && r.markMsg && <div className={"yt-mark-msg" + (markWait ? "" : " yt-mark-done")}>🖍 {r.markMsg}</div>}
          {phase === "reveal" && <div className="dm-msg dm-msg-ng yt-small">だいじょうぶ！ 解説を 見て、つぎで ためして みよう</div>}

          {phase === "ask" && (
            <div className="oh-hints">
              {hintLv >= 1 && <div className="dm-hint-kuku yt-hint">💡 {s.hint}</div>}
              {hintLv >= 2 && <FigHint fig={s.fig} text={s.fig.type === "unit" ? "" : null} />}
              {hintLv < 2 && <button className="kk-hint-btn" onClick={() => { sfx.tap(); setHintLv(hintLv + 1); setUsedHint(true); }}>{hintLv === 0 ? "？ ことばの ヒント" : "？ 図の ヒント"}</button>}
            </div>
          )}
          {(phase === "right" && !markWait) && <Explain q={q} title="🔍 どの 数を どう つかったかな？" />}
          {phase === "reveal" && <Explain q={q} title="📘 解説：こう かんがえるよ" />}
        </div>
      )}

      {r.found && phase === "ask" && (
        <>
          <button type="button" className="wm-check" disabled={!ready} onClick={check}>こたえあわせ ✓</button>
          {!ready && <div className="wm-tip">マスに 数字を かいて、まんなかの ＋ − × から えらんでね</div>}
        </>
      )}
      {phase === "stepRight" && !markWait && <button className="wm-check" onClick={nextStep}>つぎの しきへ →</button>}
      {(phase === "right" && !markWait) || phase === "reveal" ? <button className="wm-check" onClick={finish}>{isLast ? "けっかを 見る →" : "つぎへ →"}</button> : null}
    </div>
  );
}

/* ------------------------------ 5もん セット ------------------------------ */
export function OhanashiHard({ ohanashi, daily, characters, sfx, onComplete, onExit }) {
  const [set, setSet] = useState(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const read = normalizeReadProgress(ohanashi && ohanashi.yomiRead);
  const today = todayStr();
  const fedToday = daily.storyFeed && daily.storyFeed.date === today ? daily.storyFeed.food || 0 : 0;

  const start = () => {
    sfx.tap();
    const s = buildOhanashiSet();
    if (import.meta.env.DEV) window.__ohanashiSet = s;      // ブラウザ テスト用（本番には 入らない）
    setSet(s); setIdx(0); setResults([]); setSummary(null);
  };
  const onFinish = (res) => {
    const all = [...results, res];
    if (idx + 1 < set.length) { setResults(all); setIdx(idx + 1); return; }
    const correct = all.filter((x) => x.right).length, hints = all.filter((x) => x.hint).length;
    const feed = applyStoryFeed(daily, { total: all.length, correct, hints });
    const readAfter = applyReadResults(ohanashi && ohanashi.yomiRead, all);
    const stars = correct * STAR_PER_RIGHT;
    onComplete(feed.daily, { ...(ohanashi || {}), yomiRead: readAfter }, stars);
    setSummary({ all, correct, hints, feed: feed.report, readBefore: read, readAfter, stars, dragon: feed.daily.dragon });
    setSet(null);
  };

  if (summary) {
    const f = summary.feed;
    const up = summary.readAfter.stage !== summary.readBefore.stage;
    return (
      <div className="oh-wrap">
        <h2 className="kk-h2">📖 おはなし もんだい（むずかしい）</h2>
        <div className="wm-card oh-result">
          <div className="oh-result-big">{summary.correct === summary.all.length ? "ぜんもん せいかい！✨" : "さいごまで できたね！"}</div>
          <div className="oh-result-line">1かいで せいかい <b>{summary.correct}</b> / {summary.all.length}もん</div>
          {summary.stars > 0 && <div className="oh-result-line">★ <b>+{summary.stars}</b></div>}
          <div className="oh-result-line oh-result-read">{up ? `🎉 ${STAGE_INFO[summary.readAfter.stage].name} に すすんだよ！` : `🖍 ${STAGE_INFO[summary.readAfter.stage].name}`}</div>
        </div>
        <div className="wm-card oh-dragon">
          <div className="oh-dragon-title">🐉 ドラゴンの ごはん</div>
          {f.noDragon ? <div className="oh-dragon-line">まいにち けいさん で たまごを えらぶと、ここでも ごはんを あげられるよ</div> : <>
            {f.given > 0 && <div className="oh-dragon-line">ごはん <b>+{f.given}</b>{f.earned > 1 && f.given === f.earned ? "（ヒントなし ぜんもん せいかい ボーナス つき）" : ""}</div>}
            <div className="oh-food" aria-label={`ごはん ${f.food} / ${STORY_FOOD_PER_POINT}`}>
              {Array.from({ length: STORY_FOOD_PER_POINT }, (_, i) => <span key={i} className={"oh-food-dot" + (i < f.food ? " on" : "")}>🍙</span>)}
              <small>{STORY_FOOD_PER_POINT}つで そだちポイント 1</small>
            </div>
            {f.gained > 0 && <div className="oh-dragon-line oh-dragon-up">そだちポイント <b>+{f.gained}</b>！</div>}
            {f.stageTo && <div className="oh-dragon-line oh-dragon-up">🎉 ドラゴンが おおきく なった！</div>}
            {f.full && <div className="oh-full">🍽 きょうの ドラゴンの ごはんは おなかいっぱい！ また あした あげてね</div>}
          </>}
        </div>
        <button className="kk-big-btn" onClick={start}>もういちど ♪</button>
        <button className="kk-text-btn" onClick={onExit}>もどる</button>
      </div>
    );
  }
  if (set) {
    const q = set[idx];
    return (
      <div className="oh-wrap">
        <div className="oh-progress"><span>{idx + 1} / {set.length}</span><div className="oh-progress-bar"><i style={{ width: ((idx) / set.length) * 100 + "%" }} /></div></div>
        <OhanashiQuestion key={q.id} q={q} stage={read.stage} sfx={sfx} characters={characters} isLast={idx + 1 >= set.length} onFinish={onFinish} />
      </div>
    );
  }
  return (
    <div className="oh-wrap">
      <h2 className="kk-h2">📖 おはなし もんだい（むずかしい）</h2>
      <div className="wm-card oh-intro">
        <div className="oh-intro-title">よみとり れんしゅう</div>
        <ol className="oh-intro-steps">
          <li>🔍 なにを きかれているか さがす</li>
          <li>🖍 つかう 数に マーカー</li>
          <li>✏️ しき（2だんかいは ①②）と こたえを かく</li>
        </ol>
        <div className="oh-intro-line">{OH_PER_SET}もん ／ 時間は はからないよ ／ ヒントは 2つ（ことば → 図）</div>
        <div className="oh-intro-stage">🖍 {STAGE_INFO[read.stage].name}：{STAGE_INFO[read.stage].desc}{read.stage !== "C" && <small>（いっぱつで 見つける 回が {READ_STREAK_UP}かい つづくと つぎへ。いま {read.streak}かい）</small>}</div>
        <div className="oh-intro-food">🐉 きょうの ドラゴンの ごはん {fedToday} / {STORY_FOOD_DAY_MAX}{fedToday >= STORY_FOOD_DAY_MAX ? "（おなかいっぱい）" : ""}</div>
      </div>
      <button className="kk-big-btn" onClick={start}>はじめる ♪</button>
      <button className="kk-text-btn" onClick={onExit}>もどる</button>
    </div>
  );
}
