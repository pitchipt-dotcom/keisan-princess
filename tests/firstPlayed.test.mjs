// はじめて あそんだ 日（src/firstPlayed.js）の テスト：npm test
import test from "node:test";
import assert from "node:assert/strict";
import { earliestRecordDay, firstPlayedFromSave, resolveFirstPlayed, earlierFirstPlayed, fmtFirstPlayed, validFirstPlayed } from "../src/firstPlayed.js";

const NOW = new Date(2026, 10, 21, 15, 30);       // 2026-11-21 15:30（端末の 時間）
const local = (iso) => { const d = new Date(iso); return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]; };

test("firstPlayedAt が ある セーブは そのまま（上書きしない）", () => {
  const save = { firstPlayedAt: "2026-11-01T03:00:00.000Z", daily: { history: [{ date: "2026-10-01" }] } };
  assert.equal(resolveFirstPlayed(save, NOW), "2026-11-01T03:00:00.000Z");
});

test("値が 無く きろくも 無い セーブ・空の セーブは 今の 日時", () => {
  assert.equal(resolveFirstPlayed({ stardust: 10 }, NOW), NOW.toISOString());
  assert.equal(resolveFirstPlayed(null, NOW), NOW.toISOString());
  assert.equal(firstPlayedFromSave({ stardust: 10 }, NOW), null);
});

test("きろくが あれば いちばん古い 日（その日の 0時）", () => {
  const save = {
    daily: { lastDate: "2026-11-20", history: [{ date: "2026-11-10" }, { date: "2026-11-12" }], calendar: { "2026-11-08": "done", "2026-11-09": "ticket" },
      storyFeed: { date: "2026-11-15", food: 1 }, notebook: { "3+4": { due: "2026-10-01" } }, lastTicketWeek: "2026-11-02" },
    grade3: { daily: { lastDate: "2026-11-21", history: [{ date: "2026-11-11" }], notebook: { x: { due: "2026-09-01" } } } },
  };
  assert.equal(earliestRecordDay(save, NOW), "2026-11-08");      // ノートの due と lastTicketWeek は つかわない
  assert.deepEqual(local(resolveFirstPlayed(save, NOW)), [2026, 11, 8, 0]);
});

test("3年生 だけの きろく・おはなし もんだい だけの きろくでも つかう", () => {
  assert.equal(earliestRecordDay({ grade3: { daily: { history: [{ date: "2026-11-19" }] } } }, NOW), "2026-11-19");
  assert.equal(earliestRecordDay({ daily: { storyFeed: { date: "2026-11-18" } } }, NOW), "2026-11-18");
});

test("こわれた 日付・みらいの 日付は つかわない", () => {
  const save = { daily: { history: [{ date: "abc" }, { date: "2026-12-31" }, null, { date: 20261101 }], calendar: "x", lastDate: "2026-11-19" }, grade3: "bad" };
  assert.equal(earliestRecordDay(save, NOW), "2026-11-19");
  assert.equal(resolveFirstPlayed({ firstPlayedAt: "hello", daily: { lastDate: "2026-11-19" } }, NOW).slice(0, 4), "2026");
  assert.equal(validFirstPlayed("hello"), false);
  assert.equal(validFirstPlayed(123), false);
});

test("バックアップコード：今の 値と コードの 値の 古い ほう", () => {
  const a = "2026-11-21T06:00:00.000Z", b = "2026-10-01T00:00:00.000Z";
  assert.equal(earlierFirstPlayed(a, b), b);
  assert.equal(earlierFirstPlayed(b, a), b);
  assert.equal(earlierFirstPlayed(a, null), a);           // 古い コード（値も きろくも 無い）→ 今の 値の まま
  assert.equal(earlierFirstPlayed(null, b), b);
  assert.equal(earlierFirstPlayed("x", "y"), null);
  // 古い コード（firstPlayedAt なし・きろく あり）→ コードの きろくの 日
  const old = { daily: { history: [{ date: "2026-11-02" }] } };
  assert.deepEqual(local(earlierFirstPlayed(a, firstPlayedFromSave(old, NOW))), [2026, 11, 2, 0]);
});

test("表示：2026年11月21日", () => {
  assert.equal(fmtFirstPlayed(new Date(2026, 10, 21, 9).toISOString()), "2026年11月21日");
  assert.equal(fmtFirstPlayed(null), "");
});
