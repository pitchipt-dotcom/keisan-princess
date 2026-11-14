import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CHAPTERS } from "../src/StoryMode.jsx";

const ROUNDS = 300;
const ALLOWED_KANJI = new Set([..."人本花日子"]);
const text = (node) => (typeof node === "string" ? node : renderToStaticMarkup(<div>{node}</div>).replace(/<[^>]+>/g, " "));
const kanjiIn = (s) => (s.match(/[一-鿿]/g) || []).filter((k) => !ALLOWED_KANJI.has(k));

test("5 しょう ある(たしざん・ひきざん・かけざん・わりざん・ぶんすう)", () => {
  assert.deepEqual(CHAPTERS.map((c) => c.id), ["add", "sub", "mul", "div", "frac"]);
});

for (const ch of CHAPTERS) {
  test(`${ch.title}: 5もん、せんたくしは 4つで こたえが 1つ、かずは せいの せいすう`, () => {
    for (let r = 0; r < ROUNDS; r++) {
      const set = ch.make();
      assert.equal(set.length, 5);
      for (const p of set) {
        const ids = p.options.map((o) => o.id);
        assert.equal(ids.length, 4, text(p.text));
        assert.equal(new Set(ids).size, 4, `だぶり: ${ids} ${text(p.text)}`);
        assert.ok(ids.includes(p.ans), `こたえが ない: ${p.ans} ${ids}`);
        for (const id of ids) if (/^-?\d+$/.test(id)) assert.ok(Number(id) > 0, `0 いか: ${id}`);
      }
    }
  });

  test(`${ch.title}: こどもに みせる ぶんの かんじは 人・本・花・日・子 だけ`, () => {
    for (const page of ch.pages) for (const line of page.lines) assert.deepEqual(kanjiIn(text(line.text)), [], text(line.text));
    for (let r = 0; r < ROUNDS; r++) {
      for (const p of ch.make()) {
        const all = text(p.text) + text(p.hint.text) + text(p.echo);
        assert.deepEqual(kanjiIn(all), [], all);
      }
    }
  });
}

test("ぶんすう: 1 いじょうの 分数と、こたえと おなじ 大きさの 分数は せんたくしに 出ない", () => {
  const frac = CHAPTERS.find((c) => c.id === "frac");
  for (let r = 0; r < ROUNDS * 2; r++) {
    for (const p of frac.make()) {
      const fr = p.options.map((o) => o.id).filter((id) => /^\d+\/\d+$/.test(id)).map((id) => id.split("/").map(Number));
      for (const [n, d] of fr) assert.ok(n >= 1 && n < d, `1 いじょう: ${n}/${d}`);
      for (let i = 0; i < fr.length; i++)
        for (let j = i + 1; j < fr.length; j++)
          assert.notEqual(fr[i][0] * fr[j][1], fr[j][0] * fr[i][1], `おなじ 大きさ: ${fr[i]} ${fr[j]}`);
    }
  }
});

// しようで かならず 入れる もんだい(まいかい 5もんの なかに ある)
const MUST = {
  add: [["かんけいない かずが まざる", (p) => text(p.echo).includes("つかわない")], ["10の たば", (p) => text(p.text).includes("たば")]],
  sub: [["ぎゃくに かんがえる", (p) => text(p.echo).includes("たしかめ")], ["ちがい", (p) => /ちがい|おおい|すくない/.test(text(p.text))]],
  mul: [["かいて いない かず", (p) => /あし|タイヤ|はっぱ/.test(text(p.text))], ["ばい", (p) => text(p.text).includes("ばい")]],
  div: [["おなじ かずずつ わける", (p) => text(p.text).includes("1人 なん")], ["〜ずつ くばると なん人", (p) => text(p.text).includes("なん人に くばれる")]],
  frac: [["おおきさ くらべ(1/2 を ふくむ)", (p) => text(p.text).includes("いちばん") && p.options.some((o) => o.id === "1/2")],
         ["6この 1/2 の なかま", (p) => text(p.text).includes("その")], ["おなじ おおきさに わける", (p) => p.ans === "ok"]],
};
for (const ch of CHAPTERS) {
  test(`${ch.title}: しようの もんだいが まいかい 入る`, () => {
    for (let r = 0; r < ROUNDS; r++) {
      const set = ch.make();
      for (const [label, has] of MUST[ch.id]) assert.ok(set.some(has), `${label} が ない`);
    }
  });
}
