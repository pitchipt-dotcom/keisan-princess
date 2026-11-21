/* =====================================================================
   はじめて あそんだ 日（セーブの firstPlayedAt）— ロジックだけ（画面は App.jsx）
   - firstPlayedAt は ISO の 日時の 文字列（例 "2026-11-21T01:23:45.000Z"）
   - まだ 無い セーブ：のこっている きろく（やった日・カレンダー など）の いちばん古い 日（その日の 0時）。
     きろくも 無ければ 今の 日時
   - 一度 入ったら 上書きしない。バックアップコードを 読みこむ ときは、今の 値と コードの 値の 古い ほうを のこす
   - くわしくは docs/first-played.md
   画面や JSX を ふくまないので、node から そのまま テストできる
   ===================================================================== */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/* 正しい 日時の 文字列か */
export function validFirstPlayed(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v));
}

/* "YYYY-MM-DD" → その日の 0時（端末の 時間）の ISO 文字列 */
const dayToIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toISOString(); };
const localDay = (date) => { const p = (n) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`; };

/* セーブの 中の「すでに やった」きろくの 日付で いちばん 古い もの（"YYYY-MM-DD"）。無ければ null
   つかう もの：2年生 まいにち けいさん（history・calendar・lastDate）、おはなし もんだいの ごはん（storyFeed）、
              3年生 毎日計算（grade3.daily の history・lastDate）
   つかわない もの：まちがいノートの due（これからの 日）、lastTicketWeek（週の 月曜日。あそぶ まえの 日に なることが ある） */
export function earliestRecordDay(save, now = new Date()) {
  if (!save || typeof save !== "object") return null;
  const today = localDay(now);
  const days = [];
  const add = (v) => { if (typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(v)) && v <= today) days.push(v); };
  const daily = save.daily && typeof save.daily === "object" ? save.daily : {};
  if (Array.isArray(daily.history)) daily.history.forEach((h) => h && add(h.date));
  if (daily.calendar && typeof daily.calendar === "object") Object.keys(daily.calendar).forEach(add);
  add(daily.lastDate);
  if (daily.storyFeed && typeof daily.storyFeed === "object") add(daily.storyFeed.date);
  const g3d = save.grade3 && typeof save.grade3 === "object" && save.grade3.daily && typeof save.grade3.daily === "object" ? save.grade3.daily : {};
  if (Array.isArray(g3d.history)) g3d.history.forEach((h) => h && add(h.date));
  add(g3d.lastDate);
  if (!days.length) return null;
  return days.sort()[0];
}

/* セーブから わかる はじめた 日：firstPlayedAt が あれば それ、無ければ いちばん古い きろくの 日。どちらも 無ければ null */
export function firstPlayedFromSave(save, now = new Date()) {
  if (save && validFirstPlayed(save.firstPlayedAt)) return save.firstPlayedAt;
  const day = earliestRecordDay(save, now);
  return day ? dayToIso(day) : null;
}

/* 読みこんだ セーブに 入れる 値：わかれば それ、わからなければ 今の 日時 */
export function resolveFirstPlayed(save, now = new Date()) {
  return firstPlayedFromSave(save, now) || now.toISOString();
}

/* 2つの うち 古い ほう（かたほうが 無い／こわれている ときは もう かたほう） */
export function earlierFirstPlayed(a, b) {
  const va = validFirstPlayed(a), vb = validFirstPlayed(b);
  if (va && vb) return Date.parse(a) <= Date.parse(b) ? a : b;
  return va ? a : vb ? b : null;
}

/* 画面に 出す 形：「2026年11月21日」（端末の 時間） */
export function fmtFirstPlayed(v) {
  if (!validFirstPlayed(v)) return "";
  const d = new Date(v);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
