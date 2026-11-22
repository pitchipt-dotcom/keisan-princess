/* =====================================================================
   3年生の よみとりチェック（毎日計算の 中で つかう。2年生の よみとりチェックと おなじ 形）
   - 画面は 2年生と 同じ YomitoriQuestion.jsx（「きかれている ところ」を タップ → こたえる）
   - こたえる らんは すうじだけ なので：
       小数 … 「□ . □ L」（せいすうの ぶんと 小数第一位を べつの らんに）
       分数 … 分子だけ 入れる（らんの あとに「/5 L」）。こたえが 1 に なる もんだいは 出さない
       あまり … 「□ 人に くばれて、□ 本 あまる」
   - もんだいぶんは すべて この アプリの オリジナル
   ===================================================================== */
import { S, m1, near, ask, step, rnd, pick } from "../yomitori.js";
import { fmtDec } from "./g3.js";

const slots = (hint, ...ss) => ({ label: null, slots: ss.map(([ans, unit]) => ({ ans, unit })), hint });
const decSlots = (t, unit, hint) => slots(hint, [Math.floor(t / 10), "."], [t % 10, unit]);

const DIV = [
  () => {   // いくつずつ
    const b = rnd(2, 9), q = rnd(2, 9), a = b * q;
    return { segs: [S`クッキーが ${m1(a + "こ")} あります。`, S`${m1(b + "人")}で 同じ数ずつ わけます。`, near("1人分は"), ask("何こに なりますか。")],
      steps: [step(null, q, "こ", `同じ数ずつ わけるのは わり算。${a} ÷ ${b}`)] };
  },
  () => {   // いくつ分
    const b = rnd(2, 9), q = rnd(2, 9), a = b * q, c = rnd(2, 9);
    return { segs: [S`あめが ${m1(a + "こ")} あります。`, { t: `ふくろは ${c + 10}まい あります。` }, S`1ふくろに ${m1(b + "こずつ")} 入れると、`, near("あめの 入った ふくろは"), ask("何ふくろ できますか。")],
      steps: [step(null, q, "ふくろ", `${a} ÷ ${b} の わり算。ふくろの まい数は つかわないよ`)] };
  },
  () => {   // あまり
    const b = rnd(3, 8), q = rnd(2, 8), r = rnd(1, b - 1), a = b * q + r;
    return { segs: [S`えんぴつが ${m1(a + "本")} あります。`, S`1人に ${m1(b + "本ずつ")} くばります。`, near("何人に くばれて、"), ask("何本 あまりますか。")],
      steps: [slots(`${a} ÷ ${b} の わり算。のこった 数が あまり`, [q, "人、"], [r, "本 あまる"])] };
  },
];

const DEC = [
  () => {   // たしざん
    let x, y; do { x = rnd(3, 25); y = rnd(3, 25); } while (x % 10 === 0 || y % 10 === 0 || (x + y) % 10 === 0);
    return { segs: [S`ジュースが ${m1(fmtDec(x) + "L")} あります。`, S`おかあさんが ${m1(fmtDec(y) + "L")} かってきました。`, near("ジュースは ぜんぶで"), ask("何Lに なりましたか。")],
      steps: [decSlots(x + y, "L", `ふえたから たしざん。${fmtDec(x)} ＋ ${fmtDec(y)}`)] };
  },
  () => {   // ひきざん（よけいな 数つき）
    let x, y; do { x = rnd(12, 40); y = rnd(2, x - 2); } while (x % 10 === 0 || y % 10 === 0 || (x - y) % 10 === 0);
    const n = rnd(2, 4);
    return { segs: [S`リボンが ${m1(fmtDec(x) + "m")} あります。`, { t: `${n}人で つかいます。` }, S`かざりに ${m1(fmtDec(y) + "m")} つかいました。`, near("のこりの リボンは"), ask("何mですか。")],
      steps: [decSlots(x - y, "m", `のこりは ひきざん。人数は つかわないよ`)] };
  },
];

const FRAC = [
  () => {   // ひきざん
    const d = pick([4, 5, 6, 7, 8]), a = rnd(3, d - 1), b = rnd(1, a - 1);
    return { segs: [S`ジュースが ${m1(`${a}/${d}L`)} あります。`, S`${m1(`${b}/${d}L`)} のみました。`, near("のこりは"), ask("何Lですか。")],
      steps: [slots(`${a}/${d} − ${b}/${d}。分母は ${d} の まま`, [a - b, `/${d} L`])] };
  },
  () => {   // たしざん
    const d = pick([5, 6, 7, 8, 9]), a = rnd(1, d - 3), b = rnd(1, d - 1 - a);
    return { segs: [S`テープを きのう ${m1(`${a}/${d}m`)}、`, S`きょう ${m1(`${b}/${d}m`)} つかいました。`, near("あわせて"), ask("何m つかいましたか。")],
      steps: [slots(`${a}/${d} ＋ ${b}/${d}。分母は ${d} の まま`, [a + b, `/${d} m`])] };
  },
];

const KINDS = { div: DIV, dec: DEC, frac: FRAC };
let seq = 0;
export function makeYomi3(unit) {
  const q = pick(KINDS[unit])();
  return { wp: true, kind: "g3" + unit, g3unit: unit, id: `y3-${unit}-${Date.now()}-${seq++}`, ...q };
}
