/* =====================================================================
   はこの工房 — はこ（立方体・直方体）の 面・辺・頂点、ひらく（展開図）、くみたてる（純粋関数）
   画面は HakoWorkshop.jsx / Hako3D.jsx
   ざひょう：x＝みぎ（ひがし）、y＝上、z＝てまえ（みなみ）。はこの 大きさ dims＝{ w（x）, h（y）, d（z） }
   面の 名前：D（下）U（上）W（ひだり）E（みぎ）N（おく）S（てまえ）
   展開図（layout）：平らに した 面の ならび。ゆか（y=0）の 上の 長方形
     cells：[{ id, face（はこの どの 面に なるか）, rect:[x0,z0,x1,z1], parent, side（親の どちらがわ）, depth }]
     くみたてる：親との さかいの 辺（ちょうつがい）で 90° 上へ おる。いちばん もとの 面（root）は ゆかに おいたまま
   ===================================================================== */

export const FACES = ["D", "U", "W", "E", "N", "S"];
export const OPP = { D: "U", U: "D", W: "E", E: "W", N: "S", S: "N" };
export const AXIS = { D: "y", U: "y", W: "x", E: "x", N: "z", S: "z" };
export const FACE_NAME = { D: "下", U: "上", W: "ひだり", E: "みぎ", N: "おく", S: "てまえ" };
export const ext = (dims, axis) => (axis === "x" ? dims.w : axis === "y" ? dims.h : dims.d);
export const CUBE = { w: 1, h: 1, d: 1 };

/* ---------- はこの 形（とじた はこ。下の 面が y=0、まん中が x=z=0） ---------- */
const PLANE = { D: ["y", 0], U: ["y", 1], W: ["x", -0.5], E: ["x", 0.5], N: ["z", -0.5], S: ["z", 0.5] };
const coord = (dims, f) => { const [ax, v] = PLANE[f]; return ax === "y" ? v * dims.h : v * ext(dims, ax); };
/* 辺：となりあう 2つの 面の さかい（12本） */
export function edges(dims = CUBE) {
  const out = [];
  for (let i = 0; i < FACES.length; i++) for (let j = i + 1; j < FACES.length; j++) {
    const a = FACES[i], b = FACES[j];
    if (OPP[a] === b) continue;
    const ax = ["x", "y", "z"].find((q) => q !== AXIS[a] && q !== AXIS[b]);
    const p = { x: 0, y: 0, z: 0 };
    p[AXIS[a]] = coord(dims, a); p[AXIS[b]] = coord(dims, b);
    const lo = ax === "y" ? 0 : -ext(dims, ax) / 2, hi = ax === "y" ? dims.h : ext(dims, ax) / 2;
    const p0 = { ...p, [ax]: lo }, p1 = { ...p, [ax]: hi };
    out.push({ id: a + b, a, b, axis: ax, p0, p1, len: ext(dims, ax) });
  }
  return out;
}
/* 頂点（8こ）：3つの 面が あつまる ところ */
export function vertices(dims = CUBE) {
  const out = [];
  for (const x of ["W", "E"]) for (const y of ["D", "U"]) for (const z of ["N", "S"]) out.push({ id: x + y + z, faces: [x, y, z], p: { x: coord(dims, x), y: coord(dims, y), z: coord(dims, z) } });
  return out;
}
export function faceInfo(dims, f) {          // 面の まん中・大きさ（とじた はこ）
  const c = { x: 0, y: dims.h / 2, z: 0 }; c[AXIS[f]] = coord(dims, f);
  const [u, v] = ["x", "y", "z"].filter((q) => q !== AXIS[f]);
  return { center: c, size: [ext(dims, u), ext(dims, v)], axes: [u, v] };
}

/* ---------- 切る：のこった 辺で 面が ぜんぶ つながって いるか ／ 木（ちょうど ひらける）か ---------- */
export function components(uncut) {          // uncut：[edgeId]
  const par = Object.fromEntries(FACES.map((f) => [f, f]));
  const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
  for (const e of uncut) par[find(e.slice(0, 1))] = find(e.slice(1));
  return new Set(FACES.map(find)).size;
}
export function cutState(cuts, dims = CUBE) {
  const all = edges(dims).map((e) => e.id), uncut = all.filter((id) => !cuts.includes(id));
  const comps = components(uncut);
  if (comps > 1) return { state: "apart", uncut, comps };                     // バラバラ
  if (uncut.length === 5) return { state: "tree", uncut };                    // ひらける
  return { state: "more", uncut, need: uncut.length - 5 };                    // まだ ひらけない
}

/* ---------- ころがす（ひらく ときの 向き） ----------
   o：{ down, east, south }（いま ゆかに ついて いる 面・ひがし・みなみを むいて いる 面） */
const roll = (o, dir) => {
  if (dir === "E") return { down: o.east, east: OPP[o.down], south: o.south };
  if (dir === "W") return { down: OPP[o.east], east: o.down, south: o.south };
  if (dir === "S") return { down: o.south, south: OPP[o.down], east: o.east };
  return { down: OPP[o.south], south: o.down, east: o.east };                // N
};
const dirOf = (o, f) => (o.east === f ? "E" : OPP[o.east] === f ? "W" : o.south === f ? "S" : OPP[o.south] === f ? "N" : null);
const placeRect = (pr, dir, w, d) => {
  const [x0, z0, x1, z1] = pr;
  if (dir === "E") return [x1, z0, x1 + w, z1];
  if (dir === "W") return [x0 - w, z0, x0, z1];
  if (dir === "S") return [x0, z1, x1, z1 + d];
  return [x0, z0 - d, x1, z0];
};
const rectOf = (dims, o, at) => [0, 0, ext(dims, AXIS[o.east]), ext(dims, AXIS[o.south])];
const overlapRect = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 1e-9 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1e-9;

/* 切った はこを ひらく：のこった 辺（木）に そって、下の 面を もとに 平らに ならべる */
export function unfold(dims, uncut, root = "D") {
  const o0 = { down: root, east: root === "D" ? "E" : root === "U" ? "W" : "E", south: "S" };
  if (root !== "D") throw new Error("root D only");
  const r0 = rectOf(dims, o0);
  const cells = [{ id: "c0", face: root, rect: [-r0[2] / 2, -r0[3] / 2, r0[2] / 2, r0[3] / 2], parent: null, side: null, depth: 0, o: o0 }];
  const q = [cells[0]];
  while (q.length) {
    const c = q.shift();
    for (const e of uncut) {
      if (!e.includes(c.face)) continue;
      const nf = e[0] === c.face ? e[1] : e[0];
      if (cells.some((x) => x.face === nf)) continue;
      const dir = dirOf(c.o, nf), o = roll(c.o, dir), r = rectOf(dims, o);
      const cell = { id: "c" + cells.length, face: nf, rect: placeRect(c.rect, dir, r[2], r[3]), parent: c.id, side: dir, depth: c.depth + 1, o };
      cells.push(cell); q.push(cell);
    }
  }
  return finishLayout(cells, dims);
}
function finishLayout(cells, dims) {
  let planar = true;
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) if (overlapRect(cells[i].rect, cells[j].rect)) planar = false;
  const faces = cells.map((c) => c.face);
  const dup = faces.filter((f, i) => faces.indexOf(f) !== i);
  return { dims, cells: cells.map(({ o, ...c }) => c), planar, valid: planar && !dup.length && cells.length === 6, dupFaces: [...new Set(dup)] };
}

/* ---------- 展開図を つくる（ひろげる）：ころがしながら 面を 1まいずつ つける ----------
   dup：おなじ 面が 2まい（＝くみたてると かさなる）形を わざと 作る */
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
export function growNet(dims, { dup = false } = {}, r = Math.random) {
  for (let t = 0; t < 2000; t++) {
    const o0 = { down: "D", east: "E", south: "S" }, r0 = rectOf(dims, o0);
    const cells = [{ id: "c0", face: "D", rect: [-r0[2] / 2, -r0[3] / 2, r0[2] / 2, r0[3] / 2], parent: null, side: null, depth: 0, o: o0 }];
    let dups = 0, ok = true;
    while (cells.length < 6 && ok) {
      const opts = [];
      for (const c of cells) for (const dir of ["E", "W", "S", "N"]) {
        const o = roll(c.o, dir), rr = rectOf(dims, o);
        const rect = placeRect(c.rect, dir, rr[2], rr[3]);
        if (cells.some((x) => overlapRect(x.rect, rect))) continue;
        const isDup = cells.some((x) => x.face === o.down);
        if (isDup && (!dup || dups >= 1)) continue;
        opts.push({ c, dir, o, rect, isDup });
      }
      if (!opts.length) { ok = false; break; }
      // だぶりは 1まいだけ。さいごの ほうで 入れる（はじめから かさなると 見て すぐ わかるので）
      let pool = opts;
      if (dup && dups === 0 && cells.length >= 4 && opts.some((x) => x.isDup)) pool = opts.filter((x) => x.isDup);
      const ch = pick(pool, r);
      if (ch.isDup) dups++;
      cells.push({ id: "c" + cells.length, face: ch.o.down, rect: ch.rect, parent: ch.c.id, side: ch.dir, depth: ch.c.depth + 1, o: ch.o });
    }
    if (!ok || cells.length < 6 || (dup && dups !== 1)) continue;
    const L = finishLayout(cells, dims);
    if (dup ? L.valid || !L.planar : !L.valid) continue;
    return L;
  }
  throw new Error("growNet failed");
}

/* ---------- 立方体の 展開図 11しゅるい（ずかん） ---------- */
const cellsOf = (L) => L.cells.map((c) => [Math.round(c.rect[0] * 2) / 2 + 0.5, Math.round(c.rect[1] * 2) / 2 + 0.5].map(Math.round));
export function canon(cells) {
  let best = null;
  for (let s = 0; s < 8; s++) {
    let ps = cells.map(([x, y]) => { let a = x, b = y; for (let i = 0; i < (s & 3); i++) [a, b] = [-b, a]; return s & 4 ? [-a, b] : [a, b]; });
    const mx = Math.min(...ps.map((p) => p[0])), my = Math.min(...ps.map((p) => p[1]));
    const k = ps.map(([a, b]) => `${a - mx},${b - my}`).sort().join(";");
    if (best == null || k < best) best = k;
  }
  return best;
}
export const ALL_EDGE_SETS = (() => {             // 12本から 5本 えらんで 木に なる もの（はこを ひらく 切り方 ぜんぶ）
  const ids = edges(CUBE).map((e) => e.id), out = [];
  const rec = (i, acc) => {
    if (acc.length === 5) { if (components(acc) === 1) out.push(acc.slice()); return; }
    if (i >= ids.length || ids.length - i < 5 - acc.length) return;
    acc.push(ids[i]); rec(i + 1, acc); acc.pop(); rec(i + 1, acc);
  };
  rec(0, []);
  return out;
})();
export const CUBE_NETS = (() => {
  const set = new Map();
  for (const t of ALL_EDGE_SETS) { const k = canon(cellsOf(unfold(CUBE, t))); set.set(k, (set.get(k) || 0) + 1); }
  // ならびを きめる：横に ながい じゅん → 文字の じゅん
  return [...set.keys()].sort((a, b) => {
    const w = (k) => Math.max(...k.split(";").map((p) => Number(p.split(",")[0])));
    return w(b) - w(a) || (a < b ? -1 : 1);
  }).map((k, i) => ({ id: "n" + (i + 1), key: k, cells: k.split(";").map((p) => p.split(",").map(Number)) }));
})();
export const netIdOf = (L) => { const k = canon(cellsOf(L)); const n = CUBE_NETS.find((x) => x.key === k); return n ? n.id : null; };
export const isCube = (dims) => dims.w === 1 && dims.h === 1 && dims.d === 1;

/* ---------- くみたてる（3D の 計算） ----------
   angles：{ cellId: 0〜90 }（0＝平ら、90＝おりきった）。かえりち：{ cellId: { center, normal } } */
const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j]; return o; };
const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
const Rx = (t) => [1, 0, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, 0, Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1];
const Rz = (t) => [Math.cos(t), -Math.sin(t), 0, 0, Math.sin(t), Math.cos(t), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const ap = (m, p, w = 1) => [0, 1, 2].map((i) => m[i * 4] * p[0] + m[i * 4 + 1] * p[1] + m[i * 4 + 2] * p[2] + m[i * 4 + 3] * w);
/* ちょうつがい：親の どちらがわか で 軸と 向き（上へ おれる 向き）が きまる */
export function hingeOf(L, cell) {
  const p = L.cells.find((c) => c.id === cell.parent), [x0, z0, x1, z1] = p.rect;
  if (cell.side === "E") return { axis: "z", at: [x1, 0], sign: 1 };
  if (cell.side === "W") return { axis: "z", at: [x0, 0], sign: -1 };
  if (cell.side === "S") return { axis: "x", at: [0, z1], sign: -1 };
  return { axis: "x", at: [0, z0], sign: 1 };
}
export function fold(L, angles = {}) {
  const M = {}, out = {};
  const deg = (id) => (angles[id] == null ? 90 : angles[id]) * Math.PI / 180;
  for (const c of [...L.cells].sort((a, b) => a.depth - b.depth)) {
    if (!c.parent) M[c.id] = I();
    else {
      const h = hingeOf(L, c), th = deg(c.id) * h.sign;
      const R = h.axis === "z" ? Rz(th) : Rx(th);
      const P = h.axis === "z" ? T(h.at[0], 0, 0) : T(0, 0, h.at[1]), Pi = h.axis === "z" ? T(-h.at[0], 0, 0) : T(0, 0, -h.at[1]);
      M[c.id] = mul(M[c.parent], mul(P, mul(R, Pi)));
    }
    const [x0, z0, x1, z1] = c.rect;
    out[c.id] = { center: ap(M[c.id], [(x0 + x1) / 2, 0, (z0 + z1) / 2]), normal: ap(M[c.id], [0, 1, 0], 0), m: M[c.id] };
  }
  return out;
}
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6;
/* おった あとで 同じ ところに きて しまった 面の くみ（かさなり） */
export function overlaps(L, angles) {
  const F = fold(L, angles), ids = L.cells.map((c) => c.id), out = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (near(F[ids[i]].center, F[ids[j]].center)) out.push([ids[i], ids[j]]);
  return out;
}
/* むかいあう 面（くみたてた とき）：はこの 面の 名前で きまる */
export const oppositeCell = (L, cellId) => { const c = L.cells.find((x) => x.id === cellId); const o = L.cells.find((x) => x.face === OPP[c.face]); return o ? o.id : null; };

/* ---------- もんだい ---------- */
export const MARKS = ["★", "♥", "♣", "●", "▲", "✿"];
export const COLORS = ["#FFB3D6", "#BFE3FF", "#FFE08A", "#BDEFD0", "#E0CCFA", "#FFCFAE"];
const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const CUBOIDS = [{ w: 2, h: 1, d: 1 }, { w: 2, h: 1, d: 2 }, { w: 1, h: 2, d: 1 }, { w: 2, h: 2, d: 1 }, { w: 3, h: 1, d: 2 }];
export const pickDims = (kind, r = Math.random) => (kind === "cube" ? CUBE : pick(CUBOIDS, r));
/* 面の かざり：はこの 面ごとに 色と マーク（ひらいても くみたてても おなじ 面に ついた まま） */
export const decorate = (r = Math.random) => { const m = shuffle(MARKS.slice(), r), c = shuffle(COLORS.slice(), r); return Object.fromEntries(FACES.map((f, i) => [f, { color: c[i], mark: m[i] }])); };

export function makeSet(stage, kind = "cube", r = Math.random) {
  if (stage === 1) { const dims = pickDims(kind, r); return ["face", "edge", "vertex"].map((what) => ({ stage, kind, dims, what, total: { face: 6, edge: 12, vertex: 8 }[what] })); }
  if (stage === 2) return [0, 1, 2].map(() => ({ stage, kind, dims: pickDims(kind, r), deco: decorate(r) }));
  if (stage === 3) {
    const bad = rnd(0, 2, r);                // 3もんの うち 1もんは はこに ならない 形
    return [0, 1, 2].map((i) => { const dims = pickDims(kind, r); const L = growNet(dims, { dup: i === bad }, r); return { stage, kind, dims, layout: L, box: L.valid, deco: decorate(r) }; });
  }
  return [0, 1, 2].map(() => {
    const dims = pickDims(kind, r), L = growNet(dims, {}, r);
    const mark = pick(L.cells, r).id;
    return { stage, kind, dims, layout: L, mark, answer: oppositeCell(L, mark) };
  });
}
