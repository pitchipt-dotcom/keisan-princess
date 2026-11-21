/* =====================================================================
   まいにち けいさん（2年生）の しきの もんだいを つくる ところ（DailyMode.jsx から うつした。中身は おなじ）
   3年生の 毎日計算（grade3/g3.js）からも つかう。画面を ふくまないので node から テストできる
   ===================================================================== */
const rnd = (lo, hi) => lo + ((Math.random() * (hi - lo + 1)) | 0);

/* ======================= 2年生の もんだい ============================== */
// それぞれ { a, b, op, ans }
export const G2 = [
  // 2けた＋2けた（くりあがり あり）  例 38＋27
  { id: "add2c", w: 3, make() { const a = rnd(11, 89), b = rnd(11, 99 - a); if ((a % 10) + (b % 10) < 10) return null; return { a, b, op: "+" }; } },
  // 2けた＋2けた（くりあがり なし）  例 34＋25
  { id: "add2", w: 1, make() { const a = rnd(11, 88), b = rnd(10, 99 - a); if ((a % 10) + (b % 10) >= 10) return null; return { a, b, op: "+" }; } },
  // 2けた−2けた（くりさがり あり）  例 72−35
  { id: "sub2b", w: 3, make() { const a = rnd(21, 98), b = rnd(11, a - 1); if ((a % 10) >= (b % 10)) return null; return { a, b, op: "-" }; } },
  // 2けた−2けた（くりさがり なし）
  { id: "sub2", w: 1, make() { const a = rnd(21, 99), b = rnd(10, a - 1); if ((a % 10) < (b % 10)) return null; return { a, b, op: "-" }; } },
  // こたえが 3けたに なる たしざん  例 76＋58
  { id: "add3", w: 2, make() { const a = rnd(41, 99), b = rnd(21, 99); if (a + b < 100 || a + b > 198) return null; return { a, b, op: "+" }; } },
  // 百いくつ − 2けた  例 125−43 / 104−8
  { id: "sub3", w: 2, make() { const a = rnd(101, 180), b = rnd(5, 99); if (a - b >= 100 || a - b <= 0) return null; return { a, b, op: "-" }; } },
  // 何十・何百の けいさん  例 70＋50 / 130−80 / 300＋500 / 800−300
  { id: "tens", w: 1, make() {
      if (Math.random() < 0.5) {
        if (Math.random() < 0.5) { const a = rnd(2, 9) * 10, b = rnd(2, 9) * 10; return { a, b, op: "+" }; }
        const a = rnd(11, 18) * 10, b = rnd(2, 9) * 10; if (a - b <= 0) return null; return { a, b, op: "-" };
      }
      if (Math.random() < 0.5) { const a = rnd(1, 8) * 100, b = rnd(1, 9 - a / 100) * 100; return { a, b, op: "+" }; }
      const a = rnd(3, 10) * 100, b = rnd(1, a / 100 - 1) * 100; return { a, b, op: "-" };
    } },
  // 九九
  { id: "kuku", w: 3, make() { return { a: rnd(2, 9), b: rnd(1, 9), op: "×" }; } },
];

export function calc(a, b, op) { return op === "+" ? a + b : op === "-" ? a - b : a * b; }
export const qKey = (q) => `${q.a}${q.op}${q.b}`;

export function makeOne(kinds) {
  const total = kinds.reduce((s, k) => s + k.w, 0);
  let r = Math.random() * total, kind = kinds[kinds.length - 1];
  for (const k of kinds) { r -= k.w; if (r <= 0) { kind = k; break; } }
  // しゅるいを きめてから 作りなおす（しゅるいごとの でやすさを w の とおりに するため）
  for (let tries = 0; tries < 200; tries++) {
    const q = kind.make();
    if (q) return { ...q, ans: calc(q.a, q.b, q.op), kind: kind.id };
  }
  return { a: 2, b: 3, op: "×", ans: 6, kind: "kuku" };
}

