/* =====================================================================
   おうちのひとレポート — 画面（保護者向けなので 漢字まじり）
   今ある セーブデータを 表示するだけ。集計は report.js
   ===================================================================== */
import React, { useMemo, useState } from "react";
import { buildReport, fmtSec } from "./report.js";
import { normalizeReadProgress, READ_STAGES, READ_STREAK_UP } from "./yomitori.js";
import "./parentReport.css";

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];
const weekdayOf = (ds) => { const [y, m, d] = ds.split("-").map(Number); return WEEKDAY[new Date(y, m - 1, d).getDay()]; };

/* よみとりチェックの 手つだいの 段階（おうちのひとが 手動で 戻せる。進めるのは アプリが 自動で） */
const READ_STAGE_INFO = {
  A: { name: "レベル1", text: "アプリが「聞かれているところ」を選ばせ、正解したら使った数にアプリがマーカーを引きます。" },
  B: { name: "レベル2", text: "「聞かれているところ」を選んだあと、正解したら使った数を子ども自身がタップしてマーカーを引きます。" },
  C: { name: "レベル3", text: "「聞かれているところ」のタップは必須にしません。自分でタップすればマーカーを引けます。" },
};
function ReadStageSetting({ daily, onSetReadStage }) {
  const cur = normalizeReadProgress(daily.yomiRead);
  const [msg, setMsg] = useState(null);
  const lower = READ_STAGES.slice(0, READ_STAGES.indexOf(cur.stage));
  return (
    <section className="pr-card">
      <h3 className="pr-title">📖 よみとりチェックの 手つだい</h3>
      <div className="pr-line">いまの段階：<b>{READ_STAGE_INFO[cur.stage].name}</b></div>
      <div className="pr-line pr-sub">{READ_STAGE_INFO[cur.stage].text}</div>
      {cur.stage !== "C" && <div className="pr-line pr-sub">「聞かれているところ」を1回目で見つける回が {READ_STREAK_UP}回つづくと、次の段階へ自動で進みます（いま {cur.streak}回）。自動で戻ることはありません。</div>}
      {lower.length > 0 && onSetReadStage && (
        <div className="pr-stage-btns">
          {lower.map((st) => (
            <button key={st} className="pr-stage-btn" onClick={() => { onSetReadStage(st); setMsg(`${READ_STAGE_INFO[st].name}に戻しました`); }}>
              {READ_STAGE_INFO[st].name}に戻す
            </button>
          ))}
        </div>
      )}
      {msg && <div className="pr-line pr-sub">✓ {msg}</div>}
    </section>
  );
}

export function ParentReport({ daily, mastery, onExit, onSetReadStage }) {
  const r = useMemo(() => buildReport({ daily, mastery }), [daily, mastery]);
  const w = r.thisWeek;
  const diff = r.daysDiff;
  return (
    <div className="pr-wrap">
      <h2 className="kk-h2">がんばりレポート</h2>

      <section className="pr-card">
        <h3 className="pr-title">今週のまとめ（直近7日）</h3>
        <div className="pr-big-row">
          <div className="pr-big"><b>{w.days}</b><span>/ 7日 やった</span></div>
          <div className="pr-big"><b>{r.streak}</b><span>日 れんぞく</span></div>
        </div>
        <div className="pr-dots" aria-label="直近7日の記録">
          {w.marks.map((m) => (
            <div key={m.date} className={"pr-dot" + (m.date === r.today ? " pr-dot-today" : "")}>
              <small>{weekdayOf(m.date)}</small>
              <span className={m.mark === "done" ? "pr-dot-done" : m.mark === "ticket" ? "" : "pr-dot-none"}>
                {m.mark === "done" ? "●" : m.mark === "ticket" ? "🌙" : "○"}
              </span>
            </div>
          ))}
        </div>
        <div className="pr-legend">● やった日　🌙 おやすみチケット　○ なし</div>
        <div className="pr-line">
          まいにち けいさん：{w.total > 0
            ? <><b>{w.correct}</b> / {w.total}問 正解（ヒント {w.hints}回）</>
            : "今週の記録は まだ ありません"}
        </div>
        <div className="pr-line pr-sub">
          先週とくらべて：{diff > 0 ? <b className="pr-up">＋{diff}日</b> : diff < 0 ? <b className="pr-down">－{-diff}日</b> : <b>おなじ</b>}
          （先週 {r.lastWeekDays}日）
        </div>
      </section>

      <section className="pr-card">
        <h3 className="pr-title">いま にがてな もんだい</h3>
        {!r.hasWeak && <div className="pr-line">いまは にがてが のこっていません</div>}
        {r.notes.length > 0 && (
          <ul className="pr-notes">
            {r.notes.map((n) => <li key={n.text}><b>{n.text}</b>（{n.miss}かい まちがえた）</li>)}
          </ul>
        )}
        {r.noteTotal > r.notes.length && <div className="pr-line pr-sub">ほかに {r.noteTotal - r.notes.length}問 ノートに あります</div>}
        {r.dans.length > 0 && (
          <div className="pr-line">九九：<b>{r.dans.map((d) => `${d.dan}のだん`).join("・")}</b>が まだ あやしいです</div>
        )}
      </section>

      <ReadStageSetting daily={daily} onSetReadStage={onSetReadStage} />

      <section className="pr-card pr-tip">
        <h3 className="pr-title">💬 声かけのヒント</h3>
        <div className="pr-tip-text">{r.tip}</div>
      </section>

      <section className="pr-card pr-foot">
        {r.bestSec != null && <div className="pr-line">⏱ ベストタイム（全問正解）：<b>{fmtSec(r.bestSec)}</b></div>}
        <div className="pr-line">📅 これまでに やった日：<b>{r.totalDays}日</b></div>
      </section>

      <div className="pr-privacy">このレポートは この端末の中の記録だけで 作っています（どこにも 送りません）</div>
      <button className="kk-big-btn" onClick={onExit}>もどる</button>
    </div>
  );
}
