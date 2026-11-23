// ジュースの泉の そそぐ 計算（juice.js）：きまった はやさ・いっぱいで 止まる・はなすと 目もりに そろう
import test from "node:test";
import assert from "node:assert/strict";
import { flowStep, applyFlow, roundPour, POUR_RATE } from "../src/fairy/juice.js";

const pour = (src, tgt, sec) => {
  let s = src, t = tgt, moved = 0;
  for (let i = 0; i < Math.round(sec * 60); i++) { const r = flowStep(s, t, 1 / 60); const a = applyFlow(s, t, r); s = a.src; t = a.tgt; moved += r.move; }
  return { s, t, moved };
};

test("そそぐ はやさは 一定（のこりが へっても おそく ならない）", () => {
  const a = pour({ type: "L", amount: 1000 }, { type: "tank", amount: 0 }, 0.5);
  const b = pour({ type: "L", amount: 300 }, { type: "tank", amount: 0 }, 0.5);
  assert.ok(Math.abs(a.moved - b.moved) < 1e-6);
  const c = pour({ type: "dl", amount: 100 }, { type: "L", amount: 0 }, 0.4);
  assert.ok(Math.abs(c.moved - POUR_RATE * 0.4) < 1);
});

test("1dLますは さいごまで そそげる（とちゅうで 止まらない）", () => {
  const r = pour({ type: "dl", amount: 100 }, { type: "L", amount: 0 }, 2);
  assert.equal(r.s.amount, 0); assert.equal(r.t.amount, 100);
});

test("いっぱいに なったら 止まり、あふれる ぶんは もとに のこる", () => {
  const r = pour({ type: "L", amount: 1000 }, { type: "L", amount: 700 }, 5);
  assert.equal(r.t.amount, 1000); assert.equal(r.s.amount, 700);
});

test("はなすと 目もりに そろう（dL・0.1L は 100mL、こまかい 1dLますは 10mL）", () => {
  let r = roundPour({ type: "L", amount: 860 }, { type: "cup", amount: 140 }, 140);
  assert.equal(r.tgt.amount, 100); assert.equal(r.src.amount, 900); assert.equal(r.moved, 100);
  r = roundPour({ type: "Ld", amount: 530 }, { type: "Ld", amount: 270 }, 270);
  assert.equal(r.tgt.amount, 300); assert.equal(r.src.amount, 500);
  r = roundPour({ type: "pot", amount: 1736 }, { type: "dlf", amount: 64 }, 64);
  assert.equal(r.tgt.amount, 60); assert.equal(r.src.amount, 1740);
  r = roundPour({ type: "dl", amount: 60 }, { type: "L", amount: 40 }, 40);     // すこしだけ → 0 に もどる
  assert.equal(r.tgt.amount, 0); assert.equal(r.moved, 0);
});

test("そろえる ぶんが 足りない ときは へらす がわに そろえる", () => {
  const r = roundPour({ type: "dl", amount: 0 }, { type: "L", amount: 370 }, 70);
  assert.equal(r.tgt.amount, 300); assert.equal(r.src.amount, 70);
});
