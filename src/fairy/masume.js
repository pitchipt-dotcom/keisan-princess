/* =====================================================================
   ますめの花畑 — ます目の 上の 形の 広さ（純粋関数。画面は MasumeGarden.jsx / MasumeField.jsx）
   - 形は「タイル」の あつまり：{ x, y, k }
       k = "f"（1ます まるごと）／ "tl" "tr" "br" "bl"（ななめに 切れた 三角。直角の ある かど）
     三角 2つで 1ます（tl＋br、tr＋bl が 同じ ますに あると ぴったり 1ます）
   - 広さは「はんぶん」を 1 と して 数える（f＝2、三角＝1）。こたえは その 半分（何ます分）
   - 動かせる 部分（piece）：{ id, tiles（ローカル）, x, y, rot（90°ずつ 右まわり）, home（正しい いち） }
   - 形は 乱数で 作る（テストの 問題の 形は つかわない）
   ===================================================================== */

export const key = (x, y) => `${x},${y}`;
export const unkey = (k) => k.split(",").map(Number);
export const TRI = ["tl", "tr", "br", "bl"];
export const COMP = { tl: "br", br: "tl", tr: "bl", bl: "tr" };       // 同じ ますで あわせると 1ます
const ROT = { f: "f", tl: "tr", tr: "br", br: "bl", bl: "tl" };        // 右に 90°
export const half = (k) => (k === "f" ? 2 : 1);

/* ---------- まわす・おく ---------- */
export function rotTiles(tiles, times = 1) {
  let ts = tiles.map((t) => ({ ...t }));
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) ts = ts.map((t) => ({ x: -t.y - 1, y: t.x, k: ROT[t.k] }));
  const mx = Math.min(...ts.map((t) => t.x)), my = Math.min(...ts.map((t) => t.y));
  return ts.map((t) => ({ x: t.x - mx, y: t.y - my, k: t.k }));
}
export const placeTiles = (tiles, x, y, rot = 0) => rotTiles(tiles, rot).map((t) => ({ x: t.x + x, y: t.y + y, k: t.k }));
export const pieceTiles = (p, at = p) => placeTiles(p.tiles, at.x, at.y, at.rot);
export const allTiles = (prob, pieces = prob.pieces) => [...prob.fixed, ...pieces.flatMap((p) => pieceTiles(p))];
export const homeTiles = (prob) => [...prob.fixed, ...prob.pieces.flatMap((p) => pieceTiles(p, p.home))];
export const areaHalf = (tiles) => tiles.reduce((s, t) => s + half(t.k), 0);
export const areaOf = (tiles) => areaHalf(tiles) / 2;

/* ---------- しらべる ----------
   full：1ます（まるごと or 三角 2つ）、halves：三角 1つだけの ます、overlap：かさなり、out：花畑の そと
   ok：かさなりも はみ出しも なく、ぜんぶ 1ますずつに なっている */
export function analyze(tiles, W, H) {
  const cells = new Map();
  for (const t of tiles) { const k = key(t.x, t.y); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(t.k); }
  const full = [], halves = [], overlap = [], out = [];
  for (const [k, ks] of cells) {
    const [x, y] = unkey(k);
    if (W != null && (x < 0 || y < 0 || x >= W || y >= H)) out.push(k);
    if (ks.length === 1) (ks[0] === "f" ? full : halves).push(k);
    else if (ks.length === 2 && ks[0] !== "f" && COMP[ks[0]] === ks[1]) full.push(k);
    else overlap.push(k);
  }
  const sort = (a) => a.sort((p, q) => { const [px, py] = unkey(p), [qx, qy] = unkey(q); return py - qy || px - qx; });
  return { full: sort(full), halves: sort(halves), overlap, out, ok: !halves.length && !overlap.length && !out.length };
}

/* かぞえる ばんごう：1ますには じゅんに 1,2,3…。三角が のこって いたら 近い 2つを くみにして 同じ ばんごう */
export function countLabels(tiles) {
  const a = analyze(tiles);
  const labels = [];
  a.full.forEach((k, i) => labels.push({ cells: [k], n: i + 1 }));
  const rest = a.halves.slice();
  let n = a.full.length;
  while (rest.length >= 2) {
    const k0 = rest.shift(), [x0, y0] = unkey(k0);
    let bi = 0, bd = Infinity;
    rest.forEach((k, i) => { const [x, y] = unkey(k), d = Math.abs(x - x0) + Math.abs(y - y0); if (d < bd) { bd = d; bi = i; } });
    labels.push({ cells: [k0, rest.splice(bi, 1)[0]], n: ++n, pair: true });
  }
  return labels;
}

/* ---------- 形を 作る ---------- */
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const FIELD = { W: 8, H: 6 };
const full = (cells) => [...cells].map((k) => { const [x, y] = unkey(k); return { x, y, k: "f" }; });
function connected(cells) {
  const s = new Set(cells), first = [...s][0], seen = new Set([first]), q = [first];
  while (q.length) { const [x, y] = unkey(q.pop()); for (const [dx, dy] of N4) { const k = key(x + dx, y + dy); if (s.has(k) && !seen.has(k)) { seen.add(k); q.push(k); } } }
  return seen.size === s.size;
}
/* 四角を 2〜3こ つなげた 形（x0..x1, y0..y1 の 中） */
export function rectUnion(area, nRects, box, r = Math.random) {
  for (let t = 0; t < 400; t++) {
    const cells = new Set();
    for (let i = 0; i < nRects; i++) {
      const w = rnd(1, Math.min(5, box.x1 - box.x0 + 1), r), h = rnd(1, Math.min(4, box.y1 - box.y0 + 1), r);
      const x = rnd(box.x0, box.x1 - w + 1, r), y = rnd(box.y0, box.y1 - h + 1, r);
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) cells.add(key(xx, yy));
    }
    if (cells.size < area[0] || cells.size > area[1] || !connected(cells)) continue;
    // ただの 四角 1つ だけは よける（2こ いじょう 組みあわせた 形に）
    const xs = [...cells].map((k) => unkey(k)[0]), ys = [...cells].map((k) => unkey(k)[1]);
    if (nRects > 1 && cells.size === (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1)) continue;
    return cells;
  }
  return null;
}
const occ = (tiles) => { const m = new Map(); for (const t of tiles) { const k = key(t.x, t.y); m.set(k, [...(m.get(k) || []), t.k]); } return m; };
const inField = (x, y, F = FIELD) => x >= 0 && y >= 0 && x < F.W && y < F.H;
/* 三角 k を (x,y) に おくと、直角の 2辺の どちらかが cells の ますに くっつく か */
const LEGS = { tl: [[-1, 0], [0, -1]], tr: [[1, 0], [0, -1]], br: [[1, 0], [0, 1]], bl: [[-1, 0], [0, 1]] };
const attachedTri = (x, y, k, cells) => LEGS[k].some(([dx, dy]) => cells.has(key(x + dx, y + dy)));

/* 形の もとに なった 四角の 組みあわせ（full だけ） → 中心へ よせる */
function centerProblem(p, F = FIELD) {
  const ts = [...homeTiles(p), ...allTiles(p)];
  const xs = ts.map((t) => t.x), ys = ts.map((t) => t.y);
  const dx = Math.floor((F.W - (Math.max(...xs) - Math.min(...xs) + 1)) / 2) - Math.min(...xs);
  const dy = Math.floor((F.H - (Math.max(...ys) - Math.min(...ys) + 1)) / 2) - Math.min(...ys);
  const mv = (t) => ({ ...t, x: t.x + dx, y: t.y + dy });
  return { ...p, fixed: p.fixed.map(mv), pieces: p.pieces.map((q) => ({ ...q, x: q.x + dx, y: q.y + dy, home: { ...q.home, x: q.home.x + dx, y: q.home.y + dy } })), target: p.target.map((k) => { const [x, y] = unkey(k); return key(x + dx, y + dy); }) };
}

/* だんかい1：四角の 組みあわせ だけ */
export function makeCount(level, r = Math.random) {
  const [area, n] = [[[4, 8], 2], [[9, 13], 2], [[14, 20], 3]][level - 1];
  const cells = rectUnion(area, n, { x0: 0, x1: FIELD.W - 1, y0: 0, y1: FIELD.H - 1 }, r);
  const p = { stage: 1, level, family: "しかく", fixed: full(cells), pieces: [], target: [...cells] };
  return { ...centerProblem(p), area: cells.size };
}

/* だんかい2：はんぶんの 三角が 2つ（べつべつの ところに はみ出して いる）→ あわせると 1ます */
export function makeHalves(level, r = Math.random) {
  const [area, pairs] = [[[3, 6], 1], [[6, 10], 1], [[7, 11], 2]][level - 1];
  for (let t = 0; t < 400; t++) {
    const cells = rectUnion(area, 2, { x0: 1, x1: FIELD.W - 2, y0: 1, y1: FIELD.H - 2 }, r);
    if (!cells) continue;
    const used = new Set(cells), pieces = [];
    let ok = true;
    for (let i = 0; i < pairs && ok; i++) {
      const o = pick(TRI, r);
      const spots = (k) => {
        const res = [];
        for (let y = 0; y < FIELD.H; y++) for (let x = 0; x < FIELD.W; x++) if (!used.has(key(x, y)) && attachedTri(x, y, k, cells)) res.push([x, y]);
        return shuffle(res, r);
      };
      const a = spots(o)[0];
      if (!a) { ok = false; break; }
      used.add(key(...a));
      const b = spots(COMP[o]).find(([x, y]) => Math.abs(x - a[0]) + Math.abs(y - a[1]) >= 2);
      if (!b) { ok = false; break; }
      used.add(key(...b));
      // どちらも うごかせる。正しい いちの 1つ：a の 三角を b の ますへ（まわさない）
      pieces.push({ id: `h${i}a`, tiles: [{ x: 0, y: 0, k: o }], x: a[0], y: a[1], rot: 0, home: { x: b[0], y: b[1], rot: 0 } });
      pieces.push({ id: `h${i}b`, tiles: [{ x: 0, y: 0, k: COMP[o] }], x: b[0], y: b[1], rot: 0, home: { x: b[0], y: b[1], rot: 0 } });
    }
    if (!ok) continue;
    const target = [...cells, ...pieces.filter((_, i) => i % 2).map((q) => key(q.home.x, q.home.y))];
    const p = { stage: 2, level, family: "はんぶん", fixed: full(cells), pieces, target };
    return { ...p, area: cells.size + pairs };
  }
  throw new Error("makeHalves failed");
}

/* --- だんかい3 の 形 --- */
/* 台形（だいけい）：だんごとに 左に「／」、右に「＼」の 三角。右の 三角を まわして 左へ → 四角 */
function trapezoid(h, a, ox, oy, trunk = 0) {
  const fixed = [], pieces = [], target = [];
  for (let r = 0; r < h; r++) {
    const y = oy + r, L = ox + h - 1 - r, R = L + a + 2 * r + 1;
    fixed.push({ x: L, y, k: "br" });
    for (let x = L + 1; x < R; x++) { fixed.push({ x, y, k: "f" }); target.push(key(x, y)); }
    target.push(key(L, y));
    pieces.push({ id: "t" + r, tiles: [{ x: 0, y: 0, k: "bl" }], x: R, y, rot: 0, home: { x: L, y, rot: 1 } });
  }
  // 木の みき（台形の 下の まん中 2ます）
  for (let i = 0; i < trunk; i++) for (const x of [ox + h - 1 + Math.floor(a / 2), ox + h + Math.floor(a / 2)]) { fixed.push({ x, y: oy + h + i, k: "f" }); target.push(key(x, oy + h + i)); }
  return { fixed, pieces, target };
}
/* 星：まん中の 四角（2×2 か 2×3）の まわりに とがった 先（三角 2つ）。かたほうを まわして となりへ → 1ます */
function star(ox, oy, w, h, sides, r) {
  const fixed = [], pieces = [], target = [];
  for (let y = oy; y < oy + h; y++) for (let x = ox; x < ox + w; x++) { fixed.push({ x, y, k: "f" }); target.push(key(x, y)); }
  const cx = ox + Math.floor((w - 2) / 2), cy = oy + Math.floor((h - 2) / 2);
  const S = {
    top: { fix: [cx, oy - 1, "br"], mov: [cx + 1, oy - 1, "bl"] },
    bottom: { fix: [cx + 1, oy + h, "tl"], mov: [cx, oy + h, "tr"] },
    left: { fix: [ox - 1, cy + 1, "tr"], mov: [ox - 1, cy, "br"] },
    right: { fix: [ox + w, cy, "bl"], mov: [ox + w, cy + 1, "tl"] },
  };
  for (const s of sides) {
    const { fix, mov } = S[s];
    fixed.push({ x: fix[0], y: fix[1], k: fix[2] }); target.push(key(fix[0], fix[1]));
    pieces.push({ id: "s-" + s, tiles: [{ x: 0, y: 0, k: mov[2] }], x: mov[0], y: mov[1], rot: 0, home: { x: fix[0], y: fix[1], rot: 1 } });
  }
  return { fixed, pieces, target };
}
/* でこぼこ：四角の へりの 1ます（か 2ます）が 切りとられて、べつの へりに はみ出して いる → もどすと 四角 */
function bump(ox, oy, w, h, size, rotOK, r) {
  const rect = new Set();
  for (let y = oy; y < oy + h; y++) for (let x = ox; x < ox + w; x++) rect.add(key(x, y));
  // へりの ますを えらぶ（角は さける）
  const edges = [];
  for (let x = ox + 1; x < ox + w - size; x++) { edges.push({ cells: Array.from({ length: size }, (_, i) => [x + i, oy]), out: [0, -1] }); edges.push({ cells: Array.from({ length: size }, (_, i) => [x + i, oy + h - 1]), out: [0, 1] }); }
  for (let y = oy + 1; y < oy + h - size; y++) { edges.push({ cells: Array.from({ length: size }, (_, i) => [ox, y + i]), out: [-1, 0] }); edges.push({ cells: Array.from({ length: size }, (_, i) => [ox + w - 1, y + i]), out: [1, 0] }); }
  if (!edges.length) return null;
  const notch = pick(edges, r);
  for (const [x, y] of notch.cells) rect.delete(key(x, y));
  const local = notch.cells.map(([x, y]) => ({ x: x - Math.min(...notch.cells.map((c) => c[0])), y: y - Math.min(...notch.cells.map((c) => c[1])), k: "f" }));
  const homeAt = { x: Math.min(...notch.cells.map((c) => c[0])), y: Math.min(...notch.cells.map((c) => c[1])), rot: 0 };
  // はみ出す ところ：四角の そとで、へりに くっつく。切りとった ところの となりは さける
  const cand = [];
  for (const rot of rotOK ? [0, 1, 2, 3] : [0]) {
    for (let y = 0; y < FIELD.H; y++) for (let x = 0; x < FIELD.W; x++) {
      const ts = placeTiles(local, x, y, rot);
      if (!ts.every((t) => inField(t.x, t.y) && !rect.has(key(t.x, t.y)) && !notch.cells.some(([a, b]) => a === t.x && b === t.y))) continue;
      const inRectBox = ts.some((t) => t.x >= ox && t.x < ox + w && t.y >= oy && t.y < oy + h);
      if (inRectBox) continue;
      if (!ts.some((t) => N4.some(([dx, dy]) => rect.has(key(t.x + dx, t.y + dy))))) continue;
      if (ts.some((t) => notch.cells.some(([a, b]) => Math.abs(a - t.x) + Math.abs(b - t.y) <= 1))) continue;
      cand.push({ x, y, rot });
    }
  }
  if (!cand.length) return null;
  const at = pick(cand, r);
  const target = [...rect, ...notch.cells.map(([x, y]) => key(x, y))];
  return { fixed: full(rect), pieces: [{ id: "b", tiles: local, x: at.x, y: at.y, rot: at.rot, home: homeAt }], target };
}
const SHAPE_NAME = { daikei: "台形の 花だん", ki: "木の 形の 花だん", hoshi: "星の 形の 花だん", dekoboko: "でこぼこの 花だん", mix: "でこぼこと 三角の 花だん" };

export function makeMove(level, r = Math.random) {
  for (let t = 0; t < 400; t++) {
    const fam = pick([["daikei", "dekoboko"], ["daikei", "ki"], ["hoshi", "ki", "mix"]][level - 1], r);
    let g = null;
    if (fam === "daikei") { const h = level === 1 ? 1 : 2; g = trapezoid(h, rnd(level === 1 ? 2 : 1, level === 1 ? 4 : 3, r), 0, 0); }
    else if (fam === "ki") g = trapezoid(level === 2 ? 2 : 3, 0, 0, 0, rnd(1, 2, r));
    else if (fam === "hoshi") { const w = 2, h = pick([2, 3], r); const sides = shuffle(["top", "bottom", "left", "right"], r).slice(0, rnd(3, 4, r)); g = star(1, 1, w, h, sides, r); }
    else if (fam === "dekoboko") g = bump(1, 1, rnd(3, 4, r), rnd(2, 3, r), 1, false, r);
    else {           // でこぼこ（2ます、まわすことも）＋ 三角の ペア
      g = bump(1, 1, rnd(4, 5, r), 3, 2, true, r);
      if (g) {
        const cells = new Set(g.fixed.map((q) => key(q.x, q.y)));
        const used = new Set([...cells, ...pieceTiles(g.pieces[0]).map((q) => key(q.x, q.y)), ...pieceTiles(g.pieces[0], g.pieces[0].home).map((q) => key(q.x, q.y))]);
        const o = pick(TRI, r), spot = [];
        for (let y = 0; y < FIELD.H; y++) for (let x = 0; x < FIELD.W; x++) if (!used.has(key(x, y)) && attachedTri(x, y, o, cells)) spot.push([x, y]);
        const a = pick(spot, r); if (!a) { g = null; } else {
          used.add(key(...a));
          const sp2 = []; for (let y = 0; y < FIELD.H; y++) for (let x = 0; x < FIELD.W; x++) if (!used.has(key(x, y)) && attachedTri(x, y, COMP[o], cells) && Math.abs(x - a[0]) + Math.abs(y - a[1]) >= 2) sp2.push([x, y]);
          const b = pick(sp2, r);
          if (!b) g = null; else {
            g.pieces.push({ id: "m-a", tiles: [{ x: 0, y: 0, k: o }], x: a[0], y: a[1], rot: 0, home: { x: b[0], y: b[1], rot: 0 } });
            g.fixed.push({ x: b[0], y: b[1], k: COMP[o] });
            g.target.push(key(b[0], b[1]));
          }
        }
      }
    }
    if (!g) continue;
    const p = centerProblem({ stage: 3, level, family: fam, name: SHAPE_NAME[fam], ...g });
    const ts = allTiles(p), hs = homeTiles(p);
    if (!ts.every((q) => inField(q.x, q.y)) || !hs.every((q) => inField(q.x, q.y))) continue;
    if (analyze(ts, FIELD.W, FIELD.H).overlap.length) continue;
    return { ...p, area: areaOf(ts) };
  }
  throw new Error("makeMove failed");
}

/* だんかい4：くらべる（おなじ 広さ ／ いちばん 広い）。形は 小さな 花だんで 2〜4こ */
function smallShape(kind, r) {
  if (kind === "rect") {
    const cells = rectUnion([3, 9], pick([1, 2], r), { x0: 0, x1: 3, y0: 0, y1: 3 }, r);
    return { tiles: full(cells) };
  }
  if (kind === "half") {
    for (let t = 0; t < 100; t++) {
      const cells = rectUnion([3, 7], pick([1, 2], r), { x0: 1, x1: 3, y0: 1, y1: 3 }, r);
      if (!cells) continue;
      const o = pick(TRI, r), sp = (k, avoid) => { const s = []; for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (!cells.has(key(x, y)) && !avoid.has(key(x, y)) && attachedTri(x, y, k, cells)) s.push([x, y]); return s; };
      const a = pick(sp(o, new Set()), r); if (!a) continue;
      const b = pick(sp(COMP[o], new Set([key(...a)])), r); if (!b) continue;
      return { tiles: [...full(cells), { x: a[0], y: a[1], k: o }, { x: b[0], y: b[1], k: COMP[o] }] };
    }
  }
  const g = kind === "daikei" ? trapezoid(1, rnd(1, 3, r), 0, 0) : star(1, 1, 2, 2, ["top", "bottom", "left", "right"].slice(0, rnd(2, 4, r)), r);
  return { tiles: [...g.fixed, ...g.pieces.flatMap((q) => pieceTiles(q))] };
}
const norm = (tiles) => { const mx = Math.min(...tiles.map((t) => t.x)), my = Math.min(...tiles.map((t) => t.y)); return tiles.map((t) => ({ ...t, x: t.x - mx, y: t.y - my })); };
export function makeCompare(level, r = Math.random) {
  const n = [3, 3, 4][level - 1];
  const kinds = level === 1 ? ["rect"] : ["rect", "half", "daikei", "star"];
  const ask = level === 1 ? "max" : level === 2 ? "same" : pick(["same", "max"], r);
  for (let t = 0; t < 2000; t++) {
    const shapes = Array.from({ length: n }, () => { const s = smallShape(pick(kinds, r), r); return s && s.tiles ? norm(s.tiles) : null; });
    if (shapes.some((s) => !s || analyze(s).overlap.length)) continue;
    if (shapes.some((s) => Math.max(...s.map((q) => q.x)) > 4 || Math.max(...s.map((q) => q.y)) > 4)) continue;
    const areas = shapes.map(areaOf);
    if (!areas.every(Number.isInteger)) continue;
    let answer;
    if (ask === "max") {
      const mx = Math.max(...areas);
      if (areas.filter((a) => a === mx).length !== 1) continue;
      if (new Set(areas).size !== n) continue;                            // ぜんぶ ちがう 広さ
      if (mx - Math.max(...areas.filter((a) => a !== mx)) > 2) continue;  // 見ただけで わからない くらい
      answer = [areas.indexOf(mx)];
    } else {
      const counts = {}; areas.forEach((a) => (counts[a] = (counts[a] || 0) + 1));
      const pairs = Object.entries(counts).filter(([, c]) => c >= 2);
      if (pairs.length !== 1 || pairs[0][1] !== 2) continue;              // ちょうど 2つだけ 同じ
      const same = Number(pairs[0][0]);
      answer = areas.map((a, i) => (a === same ? i : -1)).filter((i) => i >= 0);
      // 同じ 広さの 2つは 形が ちがう（見た目で わからない ように）
      const sig = (s) => s.map((q) => `${q.x},${q.y},${q.k}`).sort().join("|");
      if (sig(shapes[answer[0]]) === sig(shapes[answer[1]])) continue;
      if (level >= 2 && !answer.some((i) => analyze(shapes[i]).halves.length)) continue;   // 三角の ある 形を まぜる
    }
    return { stage: 4, level, ask, shapes, areas, answer,
      goal: ask === "max" ? "いちばん 広い 花だんは どれ？" : "おなじ 広さの 花だんは どれと どれ？" };
  }
  throw new Error("makeCompare failed");
}

export function makeSet(stage, r = Math.random) {
  const f = [null, makeCount, makeHalves, makeMove, makeCompare][stage];
  return [1, 2, 3].map((lv) => f(lv, r));
}
export const isSameAnswer = (p, sel) => sel.length === p.answer.length && p.answer.every((i) => sel.includes(i));
