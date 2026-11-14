import { test } from "node:test";
import assert from "node:assert/strict";
import { EVENT_MODES, eventNeed, eventOutcome, nextEventRecord, fmtTime } from "../src/eventModes.js";

test("4 つの イベントと、もんだい数・時間・せいこうに いる かず", () => {
  assert.deepEqual(Object.keys(EVENT_MODES), ["castle", "ball", "villain", "complete"]);
  assert.deepEqual(Object.values(EVENT_MODES).map((c) => [c.n, c.limit, eventNeed(c)]), [[10, 90, 8], [10, 80, 8], [12, 90, 10], [15, 120, 12]]);
  assert.ok(EVENT_MODES.complete.mix);
  for (const c of Object.values(EVENT_MODES)) assert.ok(c.bonus > c.failBonus && c.failBonus > 0);
});

const run = (over) => ({ idx: 10, firstTry: 8, startAt: 1000, limitMs: 90000, ...over });
test("せいこう・しっぱい・じかんぎれ", () => {
  const c = EVENT_MODES.castle;
  assert.deepEqual(eventOutcome(c, run(), false, 61000), { success: true, need: 8, elapsed: 60000, bonus: 30 });
  assert.equal(eventOutcome(c, run({ firstTry: 7 }), false, 61000).success, false);
  assert.equal(eventOutcome(c, run({ firstTry: 7 }), false, 61000).bonus, 5);
  const late = eventOutcome(c, run({ idx: 6, firstTry: 6 }), true, 999999);
  assert.equal(late.success, false);
  assert.equal(late.elapsed, 90000); // じかんは 上限で とめる
});

test("最高記録: 古い セーブ(なし)から はじめて、よい ときだけ こうしん", () => {
  let { record, newBest } = nextEventRecord(undefined, { success: false, elapsed: 90000, firstTry: 5 });
  assert.deepEqual(record, { best: 5, bestMs: null, clears: 0, tries: 1 });
  assert.equal(newBest, true);
  ({ record, newBest } = nextEventRecord(record, { success: true, elapsed: 70000, firstTry: 9 }));
  assert.deepEqual(record, { best: 9, bestMs: 70000, clears: 1, tries: 2 });
  ({ record, newBest } = nextEventRecord(record, { success: true, elapsed: 80000, firstTry: 9 }));
  assert.equal(newBest, false);
  assert.deepEqual(record, { best: 9, bestMs: 70000, clears: 2, tries: 3 });
  ({ record, newBest } = nextEventRecord(record, { success: true, elapsed: 65000, firstTry: 8 }));
  assert.equal(newBest, true); // はやく クリア
  assert.equal(record.bestMs, 65000);
});

test("時間の よみかた", () => {
  assert.equal(fmtTime(90), "1ぷん30びょう");
  assert.equal(fmtTime(80), "1ぷん20びょう");
  assert.equal(fmtTime(120), "2ふん");
  assert.equal(fmtTime(45), "45びょう");
});
