/* =====================================================================
   ドラゴンそだて（まいにち けいさん の つづけた ごほうび）— ロジックだけ
   - ★・コーデ・とびら とは べつの ごほうび。まいにち けいさん でしか そだたない
   - やらなかった日が あっても ドラゴンは よわらない（ポイントは へらない）
   - 画面や JSX を ふくまないので、node から そのまま テストできる
   ===================================================================== */

/* ---------------- 日付（端末の ローカル時間で YYYY-MM-DD） ---------------- */
let todayOverride = null;  // テスト用：setTodayOverride("2026-11-20") で「きょう」を さしかえる
export function setTodayOverride(s) { todayOverride = s || null; }

const fmt = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export function todayStr(d) {
  if (d) return fmt(d);
  return todayOverride || fmt(new Date());
}
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export function addDays(dateStr, n) {
  const d = parse(dateStr);
  return fmt(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}
export function daysBetween(a, b) {   // b − a（日数）
  const [ya, ma, da] = a.split("-").map(Number), [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}
export function weekKey(dateStr) {    // その週の 月曜日（月曜はじまり）
  const dow = (parse(dateStr).getDay() + 6) % 7;  // 月=0 … 日=6
  return addDays(dateStr, -dow);
}

/* ---------------- ドラゴン ---------------- */
export const ELEMENTS = ["fire", "water", "light"];
export const STAGES = ["egg", "baby", "child", "adult"];
export const STAGE_AT = { egg: 0, baby: 3, child: 8, adult: 15 };   // その すがたに なる ポイント
const CALENDAR_KEEP = 60;                                           // カレンダーに のこす 日数

export function stageFor(points) {
  let s = "egg";
  for (const st of STAGES) if (points >= STAGE_AT[st]) s = st;
  return s;
}
export function nextStageInfo(dragon) {   // つぎの すがたまで（おとななら null）
  if (!dragon) return null;
  const i = STAGES.indexOf(dragon.stage);
  if (i < 0 || i >= STAGES.length - 1) return null;
  const next = STAGES[i + 1], from = STAGE_AT[dragon.stage], to = STAGE_AT[next];
  return { next, left: Math.max(0, to - dragon.points), ratio: Math.min(1, (dragon.points - from) / (to - from)) };
}
// いま えらべる たまご：まだ そだてきって いない ぞくせい。3びき そろったら どれでも
export function selectableElements(dex = []) {
  const rest = ELEMENTS.filter((e) => !dex.includes(e));
  return rest.length ? rest : ELEMENTS;
}
export const isMaster = (dex = []) => ELEMENTS.every((e) => dex.includes(e));
// たまごを えらぶ ひつようが ある？（まだ いない／おとなに なって ずかんに はいった）
export const needsEgg = (daily) => !daily.dragon || daily.dragon.stage === "adult";

// きょう 時点の れんぞく日数（表示用）：きのう／きょう やっていれば つづき、
// 1日あき で チケットが のこっていれば つづき、それ以外は 0（きょう やれば 1 から）
export function currentStreak(daily, today = todayStr()) {
  if (!daily.lastDate) return 0;
  const gap = daysBetween(daily.lastDate, today);
  if (gap <= 1) return daily.streakDays || 0;
  if (gap === 2 && daily.lastTicketWeek !== weekKey(addDays(today, -1))) return daily.streakDays || 0;
  return 0;
}

export function chooseEgg(daily, element) {
  return { ...daily, dragon: { element, points: 0, stage: "egg" } };
}

/* ---------------- セーブの 初期値（古いセーブでも うごくように おぎなう） ---------------- */
export const EMPTY_DAILY = {
  lastDate: null, streakDays: 0, bestSec: null, history: [], notebook: {},
  dragon: null, dragonDex: [], totalDays: 0, lastTicketWeek: null, calendar: {},
};
export function normalizeDaily(d) {
  const out = { ...EMPTY_DAILY, ...(d || {}) };
  if (!out.calendar || typeof out.calendar !== "object") out.calendar = {};
  if (!Array.isArray(out.dragonDex)) out.dragonDex = [];
  if (!Array.isArray(out.history)) out.history = [];
  // まえの バージョンの セーブ：履歴から カレンダーと 日数を つくる
  if (d && d.calendar === undefined) {
    const cal = {};
    for (const h of out.history) if (h && h.date) cal[h.date] = "done";
    out.calendar = cal;
    if (d.totalDays === undefined) out.totalDays = Object.keys(cal).length;
  }
  if (out.dragon && !STAGES.includes(out.dragon.stage)) out.dragon = { ...out.dragon, stage: stageFor(out.dragon.points || 0) };
  return out;
}

/* ---------------- 10もん おわった ときの きろく ----------------
   res = { correct, hints, total }。その日 はじめて なら、れんぞく・そだちポイントを 判定する。
   かえりち：{ daily: あたらしい daily, report: 結果画面に 出す ないよう } */
export function applyCompletion(daily, res, today = todayStr()) {
  const firstToday = daily.lastDate !== today;
  const report = { firstToday, streakDays: daily.streakDays || 0, ticketUsed: false, gains: [], gained: 0, stageFrom: null, stageTo: null, dexAdded: null, becameMaster: false };
  if (!firstToday) return { daily, report };

  // れんぞく 日数（おやすみチケット：週1かい、1日だけ あいても きれない）
  const calendar = { ...(daily.calendar || {}) };
  let streak = 1, lastTicketWeek = daily.lastTicketWeek || null;
  if (daily.lastDate) {
    const gap = daysBetween(daily.lastDate, today);
    if (gap === 1) streak = (daily.streakDays || 0) + 1;
    else if (gap === 2) {
      const skipped = addDays(today, -1);
      if (lastTicketWeek !== weekKey(skipped)) {
        streak = (daily.streakDays || 0) + 1;
        lastTicketWeek = weekKey(skipped);
        calendar[skipped] = "ticket";
        report.ticketUsed = true;
      }
    }
  }
  calendar[today] = "done";
  for (const k of Object.keys(calendar)) if (daysBetween(k, today) >= CALENDAR_KEEP) delete calendar[k];
  report.streakDays = streak;

  // そだちポイント
  const gains = [{ icon: "📅", label: "10もん やりきった", pt: 1 }];
  if (res.correct === res.total && res.hints === 0) gains.push({ icon: "💯", label: "ヒントなしで ぜんもん せいかい", pt: 1 });
  if (streak === 3) gains.push({ icon: "🔥", label: "3日れんぞく ボーナス", pt: 1 });
  if (streak >= 7 && streak % 7 === 0) gains.push({ icon: "🔥", label: `${streak}日れんぞく ボーナス`, pt: 2 });
  const gained = gains.reduce((s, g) => s + g.pt, 0);

  let dragon = daily.dragon, dragonDex = daily.dragonDex || [];
  if (dragon && dragon.stage !== "adult") {
    const points = Math.min(STAGE_AT.adult, dragon.points + gained);
    const stage = stageFor(points);
    if (stage !== dragon.stage) { report.stageFrom = dragon.stage; report.stageTo = stage; }
    if (stage === "adult" && !dragonDex.includes(dragon.element)) {
      const wasMaster = isMaster(dragonDex);
      dragonDex = [...dragonDex, dragon.element];
      report.dexAdded = dragon.element;
      report.becameMaster = !wasMaster && isMaster(dragonDex);
    }
    dragon = { ...dragon, points, stage };
    report.gains = gains; report.gained = gained;
  }

  return {
    daily: { ...daily, lastDate: today, streakDays: streak, totalDays: (daily.totalDays || 0) + 1, lastTicketWeek, calendar, dragon, dragonDex },
    report,
  };
}
