/* =====================================================================
   てがき すうじ にんしき（端末の中だけで動く。通信なし）
   - MNIST(1万枚) で学習した 小さな ニューラルネット(400→128→10)
   - 線(ストローク)を 20x20 の 絵に して、数字を 当てる
   - 1つの マスに「10」のように 何けたか 書いても、左右に 分けて 読む
   学習スクリプト: tools/handwriting/train.py
   ===================================================================== */
import MODEL from "./digitModel.json";

const GRID = 20;      // 入力の 大きさ (20x20)
const FIT = 16;       // 数字を おさめる はこ (MNIST と同じ)
const SS = 4;         // 1マスを 4x4 に 分けて ぬる（なめらかに）
const PEN_R = 1.05;   // 20x20 の 世界での ペンの 太さ(半径)

function decodeInt8(b64) {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}
let W1 = null, W2 = null;
function weights() {
  if (!W1) { W1 = decodeInt8(MODEL.w1); W2 = decodeInt8(MODEL.w2); }
  return [W1, W2];
}

/* ---- 20x20 の ベクトル → 0〜9 の かくりつ ---- */
export function classifyVector(x) {
  const [w1, w2] = weights();
  const H = MODEL.hidden, N = MODEL.in;
  const h = new Float32Array(H);
  for (let j = 0; j < H; j++) h[j] = MODEL.b1[j];
  for (let i = 0; i < N; i++) {
    const v = x[i];
    if (v === 0) continue;
    const row = i * H;
    for (let j = 0; j < H; j++) h[j] += v * w1[row + j] * MODEL.s1;
  }
  for (let j = 0; j < H; j++) if (h[j] < 0) h[j] = 0;
  const z = new Float32Array(10);
  for (let k = 0; k < 10; k++) z[k] = MODEL.b2[k];
  for (let j = 0; j < H; j++) {
    const v = h[j];
    if (v === 0) continue;
    const row = j * 10;
    for (let k = 0; k < 10; k++) z[k] += v * w2[row + k] * MODEL.s2;
  }
  let mx = -Infinity;
  for (let k = 0; k < 10; k++) mx = Math.max(mx, z[k]);
  let sum = 0;
  const p = new Array(10);
  for (let k = 0; k < 10; k++) { p[k] = Math.exp(z[k] - mx); sum += p[k]; }
  for (let k = 0; k < 10; k++) p[k] /= sum;
  return p;
}

/* ---- 線を 20x20 に ぬる ---- */
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}
// 4x4 に 分けた 小さな点が 線に かかって いるかを かぞえて、こさ(0〜1)に する
function rasterizeCount(segs, ox, oy) {
  const n = GRID * SS;
  const hit = new Uint8Array(n * n);
  const r = PEN_R;
  for (const [ax0, ay0, bx0, by0] of segs) {
    const ax = ax0 + ox, ay = ay0 + oy, bx = bx0 + ox, by = by0 + oy;
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - r) * SS));
    const x1 = Math.min(n - 1, Math.ceil((Math.max(ax, bx) + r) * SS));
    const y0 = Math.max(0, Math.floor((Math.min(ay, by) - r) * SS));
    const y1 = Math.min(n - 1, Math.ceil((Math.max(ay, by) + r) * SS));
    for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) {
      if (hit[sy * n + sx]) continue;
      if (distToSeg((sx + 0.5) / SS, (sy + 0.5) / SS, ax, ay, bx, by) <= r) hit[sy * n + sx] = 1;
    }
  }
  const out = new Float32Array(GRID * GRID);
  for (let sy = 0; sy < n; sy++) for (let sx = 0; sx < n; sx++) {
    if (hit[sy * n + sx]) out[((sy / SS) | 0) * GRID + ((sx / SS) | 0)] += 1 / (SS * SS);
  }
  return out;
}

/* ---- 1文字ぶんの 線 → 20x20 ---- */
export function strokesToVector(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const p of s) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX, h = maxY - minY;
  const size = Math.max(w, h);
  if (!(size > 0)) return null;
  // ペンの太さぶん 内がわに おさめる（MNIST の はこは インクの そとがわで 16）
  const inner = FIT - 2 * PEN_R;
  const sc = inner / size;
  const segs = [];
  for (const s of strokes) {
    const pts = s.map((p) => [(p.x - minX) * sc + (GRID - w * sc) / 2, (p.y - minY) * sc + (GRID - h * sc) / 2]);
    if (pts.length === 1) segs.push([pts[0][0], pts[0][1], pts[0][0], pts[0][1]]);
    for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]]);
  }
  // 重心を まん中(9.5, 9.5) に そろえる（MNIST と同じ やりかた）
  let img = rasterizeCount(segs, 0, 0);
  let m = 0, cx = 0, cy = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) { const v = img[y * GRID + x]; m += v; cx += v * (x + 0.5); cy += v * (y + 0.5); }
  if (m > 0) {
    // ピクセルの中心は 0.5 ずれる（x+0.5）ので、10.0 に あわせる = 配列で 9.5
    const ox = 10 - cx / m, oy = 10 - cy / m;
    if (Math.abs(ox) > 0.05 || Math.abs(oy) > 0.05) img = rasterizeCount(segs, ox, oy);
  }
  return img;
}

/* ---- 線を 左右の かたまり(=1けた)に 分ける ---- */
function bboxOf(s) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of s) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
export function segmentStrokes(strokes) {
  const live = strokes.filter((s) => s.length > 0);
  if (!live.length) return [];
  const all = bboxOf(live.flat());
  const H = Math.max(1, all.maxY - all.minY);
  const items = live.map((s) => ({ s, b: bboxOf(s) })).sort((a, b) => a.b.minX - b.b.minX);
  const groups = [];
  for (const it of items) {
    const g = groups[groups.length - 1];
    if (g) {
      // たての 線（はば 0）も かさなりが わかるよう、少し はばを もたせて くらべる
      const pad = 0.08 * H;
      const ov = Math.min(g.b.maxX, it.b.maxX) - Math.max(g.b.minX, it.b.minX) + 2 * pad;
      const wg = g.b.maxX - g.b.minX + 2 * pad;
      const ws = it.b.maxX - it.b.minX + 2 * pad;
      if (ov > 0.3 * Math.min(wg, ws)) {
        g.strokes.push(it.s);
        g.b = { minX: Math.min(g.b.minX, it.b.minX), maxX: Math.max(g.b.maxX, it.b.maxX), minY: Math.min(g.b.minY, it.b.minY), maxY: Math.max(g.b.maxY, it.b.maxY) };
        continue;
      }
    }
    groups.push({ strokes: [it.s], b: { ...it.b } });
  }
  // とても 小さい かたまり（てんてん・ペンの あたり）は すてる
  return groups.filter((g) => Math.max(g.b.maxX - g.b.minX, g.b.maxY - g.b.minY) > 0.18 * H);
}

/* ---- マスの 線 ぜんぶ → 読んだ もじ ---- */
export function recognize(strokes) {
  const groups = segmentStrokes(strokes);
  const digits = [];
  for (const g of groups) {
    const v = strokesToVector(g.strokes);
    if (!v) continue;
    const p = classifyVector(v);
    const order = p.map((pr, d) => [d, pr]).sort((a, b) => b[1] - a[1]);
    digits.push({ digit: order[0][0], prob: order[0][1], top: order.slice(0, 3).map((o) => o[0]) });
  }
  return { text: digits.map((d) => d.digit).join(""), digits };
}
