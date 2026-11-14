/* =====================================================================
   おうちのひとレポート — 集計だけ（純粋関数）
   - 今ある セーブデータ（daily / mastery）を 読むだけ。保存形式は 変えない・何も 送らない
   - 画面や JSX を ふくまないので、node から そのまま テストできる
   ===================================================================== */
import { todayStr, addDays, currentStreak, normalizeDaily } from "./dragon.js";

const NOTE_MAX = 5;        // にがてな もんだい（ノート）の 表示数
const DAN_MAX = 2;         // にがてな 九九の だんの 表示数
const OP_JA = { "+": "＋", "-": "－", "×": "×" };

// from から 7日分の 日付（古い順）
const week = (from) => Array.from({ length: 7 }, (_, i) => addDays(from, i));

function weekSummary(daily, dates) {
  const set = new Set(dates);
  const marks = dates.map((date) => ({ date, mark: daily.calendar[date] || null }));   // "done" | "ticket" | null
  let correct = 0, total = 0, hints = 0, sessions = 0;
  for (const h of daily.history) {
    if (!h || !set.has(h.date)) continue;
    correct += h.correct || 0; total += h.total || 0; hints += h.hints || 0; sessions += 1;
  }
  return { days: marks.filter((m) => m.mark === "done").length, marks, correct, total, hints, sessions };
}

// まちがいノート：miss の 多い順（同じなら 期限の 早い順）に 最大5件
function weakNotes(notebook) {
  return Object.values(notebook || {})
    .filter((n) => n && n.q)
    .sort((x, y) => (y.miss || 0) - (x.miss || 0) || String(x.due).localeCompare(String(y.due)))
    .slice(0, NOTE_MAX)
    .map((n) => ({ text: `${n.q.a}${OP_JA[n.q.op] || n.q.op}${n.q.b}`, miss: n.miss || 0 }));
}

// 九九：mastery が 0以下の 式を だんごとに 数え、多い順（同じなら 小さい だんから）に 最大2つ
// ※ 記録が ある 式だけ 数える（まだ 出ていない 式は にがてに 入れない）
function weakDans(mastery) {
  const count = {};
  for (const [key, v] of Object.entries(mastery || {})) {
    const m = /^(\d)x(\d)$/.exec(key);
    if (m && typeof v === "number" && v <= 0) count[m[1]] = (count[m[1]] || 0) + 1;
  }
  return Object.entries(count)
    .map(([dan, n]) => ({ dan: Number(dan), count: n }))
    .sort((x, y) => y.count - x.count || x.dan - y.dan)
    .slice(0, DAN_MAX);
}

// 声かけの ヒント：上から 順に、当てはまった 最初の 1つ
function pickTip({ thisWeek, dans, noteTotal, streak }) {
  if (thisWeek.days === 0)
    return "今週は まだ あそんでいません。『1日10もんだけ』と さそってみてください";
  if (thisWeek.total > 0 && thisWeek.hints === 0 && thisWeek.correct / thisWeek.total >= 0.9)
    return "ヒントなしで ほとんど 正解です。『じぶんで とけたね』と 伝えてあげてください";
  if (dans.length > 0)
    return `${dans.map((d) => `${d.dan}のだん`).join("・")}が のこっています。おふろや 車の中で いっしょに となえるのが おすすめです`;
  if (noteTotal >= 3)
    return "まちがえた もんだいは 1日後・3日後・7日後に また 出ます。できなくても だいじょうぶと 伝えてください";
  if (streak >= 3)
    return `${streak}日 つづいています。つづけている ことを ほめてあげてください`;
  return "きのうも がんばったね、の ひとことが いちばん ききます";
}

/* レポート 1まい分の 集計。save = { daily, mastery }（どちらも 無くてよい） */
export function buildReport(save, today = todayStr()) {
  const daily = normalizeDaily(save && save.daily);
  const mastery = (save && save.mastery) || {};
  const thisWeek = weekSummary(daily, week(addDays(today, -6)));
  const lastWeek = weekSummary(daily, week(addDays(today, -13)));
  const streak = currentStreak(daily, today);
  const notes = weakNotes(daily.notebook);
  const dans = weakDans(mastery);
  const noteTotal = Object.keys(daily.notebook || {}).length;
  return {
    today,
    thisWeek,
    lastWeekDays: lastWeek.days,
    daysDiff: thisWeek.days - lastWeek.days,
    streak,
    notes,
    noteTotal,
    dans,
    hasWeak: notes.length > 0 || dans.length > 0,
    tip: pickTip({ thisWeek, dans, noteTotal, streak }),
    bestSec: daily.bestSec == null ? null : daily.bestSec,
    totalDays: daily.totalDays || 0,
  };
}

export const fmtSec = (s) => (s >= 60 ? `${Math.floor(s / 60)}分${s % 60}秒` : `${s}秒`);
