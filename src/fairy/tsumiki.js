/* =====================================================================
   つみきの森 — つみきを 盤の 上で ころがす（純粋関数。画面は TsumikiForest.jsx）
   ルール（テストと 同じ）
   - つみきが 紙に ついた マスに 色が つく（おいた ばしょも ①として つく）
   - 盤の そとには ころがせない。1ど 色が ついた マスには もう ころがせない
   - むき：おく（y−1）・てまえ（y＋1）・みぎ（x＋1）・ひだり（x−1）
     ※ 画面では 手まえから ななめ上に 見るので、「おく」が 画面の 上
   つみき：{ kind:"cube"|"cuboid", x, y, pose:"stand"|"lieX"|"lieY" }
     cube … 立方体（さいころ）、cuboid … 直方体（2こ つなげた つみき）
     x, y … 紙に ついている マスの うち いちばん 左・おくの マス
     lieX … 左右に ねている（x と x+1）、lieY … おく・てまえに ねている（y と y+1）
   盤：{ w, h, cells:[key…], square? } … 形は 手で 作らない。
     スタートから じっさいに ころがして（1ど 通った マスは 通らない）通った マスを 盤に する
     → ぜんぶ ぬれる 転がし方が かならず 1つ 以上 ある（テストでは ソルバーで たしかめる）
   ===================================================================== */

export const DIRS = {
  oku:    { dx: 0, dy: -1, label: "おく",   arrow: "↑" },
  temae:  { dx: 0, dy: 1,  label: "てまえ", arrow: "↓" },
  migi:   { dx: 1, dy: 0,  label: "みぎ",   arrow: "→" },
  hidari: { dx: -1, dy: 0, label: "ひだり", arrow: "←" },
};
export const DIR_KEYS = ["oku", "temae", "migi", "hidari"];
export const OPP = { oku: "temae", temae: "oku", migi: "hidari", hidari: "migi" };
export const KINDS = {
  cube:   { name: "さいころ つみき", sub: "立方体", icon: "🧊" },
  cuboid: { name: "2こ つなげた つみき", sub: "直方体", icon: "🧱" },
};
export const POSE_LABEL = {
  stand: { short: "たっている", text: "たっている（紙に つくのは 1マス）" },
  lieX: { short: "ねている", text: "ねている（紙に つくのは 2マス）" },
  lieY: { short: "ねている", text: "ねている（紙に つくのは 2マス）" },
};
// 色は ばんごうの じゅんに くりかえす（盤面・ななめの 図・きろくで おなじ 色）
export const STAMP_COLORS = ["#FF9EC7", "#8FD0FF", "#FFD36E", "#9EE6B8", "#C9A8F0", "#FFB38A", "#7FD9CF", "#F59FB0"];
export const stampColor = (no) => STAMP_COLORS[(no - 1) % STAMP_COLORS.length];
export const NUM = (n) => (n >= 1 && n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`);

export const key = (x, y) => `${x},${y}`;
export const unkey = (k) => k.split(",").map(Number);

export const newBlock = (kind, x, y, pose = "stand") => ({ kind, x, y, pose });
export const cube = (x, y) => newBlock("cube", x, y);
export const cuboid = (x, y, pose = "stand") => newBlock("cuboid", x, y, pose);
export const sameBlock = (a, b) => a.kind === b.kind && a.x === b.x && a.y === b.y && a.pose === b.pose;

/* 紙に ついている マス */
export function footprint(b) {
  if (b.kind === "cube" || b.pose === "stand") return [[b.x, b.y]];
  return b.pose === "lieX" ? [[b.x, b.y], [b.x + 1, b.y]] : [[b.x, b.y], [b.x, b.y + 1]];
}
export const fkeys = (b) => footprint(b).map(([x, y]) => key(x, y));

/* 1かい ころがす（盤に のるかは tryRoll で しらべる） */
export function roll(b, dir) {
  const { dx, dy } = DIRS[dir];
  if (b.kind === "cube") return { ...b, x: b.x + dx, y: b.y + dy };
  if (b.pose === "stand") {
    if (dx) return { ...b, pose: "lieX", x: dx > 0 ? b.x + 1 : b.x - 2 };
    return { ...b, pose: "lieY", y: dy > 0 ? b.y + 1 : b.y - 2 };
  }
  if (b.pose === "lieX") {
    if (dx) return { ...b, pose: "stand", x: dx > 0 ? b.x + 2 : b.x - 1 };
    return { ...b, y: b.y + dy };
  }
  if (dy) return { ...b, pose: "stand", y: dy > 0 ? b.y + 2 : b.y - 1 };     // lieY
  return { ...b, x: b.x + dx };
}

export const boardSet = (board) => new Set(board.cells);
/* ころがせるか：盤の そと → "out"、もう 色が ついた マス → "visited" */
export function tryRoll(b, dir, onBoard, painted) {
  const nb = roll(b, dir), ks = fkeys(nb);
  if (!ks.every((k) => onBoard.has(k))) return { why: "out" };
  if (painted && ks.some((k) => painted.has(k))) return { why: "visited" };
  return { block: nb };
}
export const legalDirs = (b, onBoard, painted) => DIR_KEYS.filter((d) => tryRoll(b, d, onBoard, painted).block);

/* start から moves の じゅんに ころがす（盤の そと・ぬった マスへは いけない）
   かえりち：{ ok, failAt（だめだった 手の 番号 or -1）, why, blocks, stamps:[{ no, cells, pose }], cells:Set(key) } */
export function simulate(start, moves, onBoard) {
  const blocks = [start], stamps = [{ no: 1, cells: footprint(start), pose: start.pose }];
  const painted = new Set(fkeys(start));
  let b = start;
  for (let i = 0; i < moves.length; i++) {
    const r = tryRoll(b, moves[i], onBoard, painted);
    if (!r.block) return { ok: false, failAt: i, why: r.why, blocks, stamps, cells: painted };
    b = r.block; blocks.push(b); stamps.push({ no: stamps.length + 1, cells: footprint(b), pose: b.pose });
    fkeys(b).forEach((k) => painted.add(k));
  }
  return { ok: true, failAt: -1, why: null, blocks, stamps, cells: painted };
}

export const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
export const reverseMoves = (moves) => moves.slice().reverse().map((d) => OPP[d]);
export const countTurns = (moves) => moves.reduce((n, d, i) => n + (i > 0 && d !== moves[i - 1] ? 1 : 0), 0);

/* ---------- ソルバー：start から 盤を ぜんぶ ぬれる 転がし方を さがす ----------
   limit こ 見つかったら とめる。かえりち：{ count, path（さいしょの こたえ） } */
export function solveCover(board, start, limit = 1) {
  const onBoard = boardSet(board), N = onBoard.size;
  if (!fkeys(start).every((k) => onBoard.has(k))) return { count: 0, path: null };
  const painted = new Set(fkeys(start)), path = [];
  let count = 0, first = null;
  const dfs = (b) => {
    if (painted.size === N) { count++; if (!first) first = path.slice(); return count >= limit; }
    for (const d of DIR_KEYS) {
      const r = tryRoll(b, d, onBoard, painted);
      if (!r.block) continue;
      const ks = fkeys(r.block);
      ks.forEach((k) => painted.add(k)); path.push(d);
      if (dfs(r.block)) return true;
      path.pop(); ks.forEach((k) => painted.delete(k));
    }
    return false;
  };
  dfs(start);
  return { count, path: first };
}

/* ---------- 盤と もんだいを 作る ---------- */
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const BOX = { cube: 5, cuboid: 6 };        // 盤の 大きさの 上げん（よこ・たて）

/* むずかしさ：マスの 数（＝ころがす 回数）と 曲がる 回数で 3だんかい
   steps：ころがす 回数、turns：曲がる 回数、extra：だんかい2で しじの 先に のばす 回数（その ぶん 盤が 広い）
   square：その わりあいで 正方形の 盤（立方体だけ） */
export const LEVELS = {
  cube: {
    1: [{ steps: [4, 5], turns: [1, 2] }, { steps: [6, 8], turns: [2, 4], square: 0.4, size: 3 }, { steps: [9, 12], turns: [4, 9] }],
    2: [{ steps: [2, 3], turns: [1, 2], extra: [2, 3], square: 0.4, size: 3 }, { steps: [3, 4], turns: [1, 3], extra: [2, 4] }, { steps: [5, 6], turns: [2, 5], extra: [2, 4] }],
    3: [{ steps: [3, 4], turns: [1, 2] }, { steps: [5, 6], turns: [2, 4] }, { steps: [7, 9], turns: [3, 8] }],
  },
  cuboid: {
    1: [{ steps: [3, 4], turns: [1, 2] }, { steps: [5, 6], turns: [2, 4] }, { steps: [7, 8], turns: [3, 7] }],
    2: [{ steps: [2, 3], turns: [1, 2], extra: [2, 3] }, { steps: [3, 4], turns: [1, 3], extra: [2, 3] }, { steps: [4, 5], turns: [2, 4], extra: [2, 3] }],
    3: [{ steps: [3, 3], turns: [1, 2] }, { steps: [4, 5], turns: [2, 4] }, { steps: [6, 7], turns: [3, 6] }],
  },
};

/* はこの 中で じっさいに ころがす（1ど 通った マスは 通らない）
   induced：となりあう のは まえと うしろの マスだけ（立方体の だんかい3。もようを 見れば じゅんばんが 1つに きまる） */
function randomWalk(kind, steps, box, r, induced) {
  for (let tries = 0; tries < 200; tries++) {
    const start = newBlock(kind, rnd(0, box - 1, r), rnd(0, box - 1, r));
    const seen = new Set(fkeys(start)), moves = [], blocks = [start];
    let b = start, ok = true;
    for (let i = 0; i < steps && ok; i++) {
      const opts = shuffle(DIR_KEYS.slice(), r).filter((d) => {
        const nb = roll(b, d), cells = footprint(nb);
        if (!cells.every(([x, y]) => x >= 0 && y >= 0 && x < box && y < box)) return false;
        if (cells.some(([x, y]) => seen.has(key(x, y)))) return false;
        if (induced) {
          const [[nx, ny]] = cells, [[cx, cy]] = footprint(b);
          return DIR_KEYS.every((e) => { const ax = nx + DIRS[e].dx, ay = ny + DIRS[e].dy; return (ax === cx && ay === cy) || !seen.has(key(ax, ay)); });
        }
        return true;
      });
      if (!opts.length) { ok = false; break; }
      b = roll(b, opts[0]); moves.push(opts[0]); blocks.push(b); fkeys(b).forEach((k) => seen.add(k));
    }
    if (ok) return { start, moves, blocks, cells: [...seen] };
  }
  return null;
}
/* 左上に よせて 盤に する */
function toBoard(cells, blocks) {
  const xy = cells.map(unkey), mx = Math.min(...xy.map((c) => c[0])), my = Math.min(...xy.map((c) => c[1]));
  const w = Math.max(...xy.map((c) => c[0])) - mx + 1, h = Math.max(...xy.map((c) => c[1])) - my + 1;
  return { board: { w, h, cells: xy.map(([x, y]) => key(x - mx, y - my)).sort() }, blocks: blocks.map((b) => ({ ...b, x: b.x - mx, y: b.y - my })) };
}

/* だんかい3 の「ゴールから もどる」で 行きどまりに ならないか（どこから でも スタートまで もどれる） */
export function backHasDeadEnd(p) {
  const onBoard = new Set(p.pattern), N = onBoard.size;
  const visit = (b, trail) => {
    if (trail.size === N) return !sameBlock(b, p.start);
    let any = false;
    for (const d of DIR_KEYS) {
      const r = tryRoll(b, d, onBoard, trail);
      if (!r.block) continue;
      any = true;
      const ks = fkeys(r.block); ks.forEach((k) => trail.add(k));
      const bad = visit(r.block, trail);
      ks.forEach((k) => trail.delete(k));
      if (bad) return true;
    }
    return !any;
  };
  return visit(p.goal, new Set(fkeys(p.goal)));
}

function squareProblem(stage, kind, cfg, level, r) {
  const n = cfg.size, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push(key(x, y));
  const board = { w: n, h: n, cells, square: true }, onBoard = boardSet(board);
  for (let t = 0; t < 200; t++) {
    const start = newBlock(kind, rnd(0, n - 1, r), rnd(0, n - 1, r));
    const sol = solveCover(board, start);
    if (!sol.count) continue;
    if (stage === 1) return { stage, kind, level, board, start, solution: sol.path };
    // だんかい2：盤の 中で しじを 作る（1ど 通った マスは 通らない）
    const steps = rnd(cfg.steps[0], cfg.steps[1], r), moves = [];
    let b = start; const painted = new Set(fkeys(start));
    for (let i = 0; i < steps; i++) {
      const ds = shuffle(legalDirs(b, onBoard, painted), r);
      if (!ds.length) break;
      b = roll(b, ds[0]); moves.push(ds[0]); fkeys(b).forEach((k) => painted.add(k));
    }
    if (moves.length !== steps) continue;
    const tn = countTurns(moves);
    if (tn < cfg.turns[0] || tn > cfg.turns[1]) continue;
    const sim = simulate(start, moves, onBoard);
    return { stage, kind, level, board, start, moves, cells: [...sim.cells], goal: b };
  }
  return null;
}

/* もんだい
   だんかい1：{ board, start, solution } … 盤を ぜんぶ ぬる
   だんかい2：{ board, start, moves（しじ）, cells（色が つく マス。スタートを ふくむ）, goal }
   だんかい3：{ board, start, moves（こたえの 1つ）, pattern（＝盤の マス。点線）, goal } … こたえは 1とおり */
export function makeProblem(stage, kind, level, r = Math.random) {
  const cfg = LEVELS[kind][stage][level - 1];
  for (let t = 0; t < 4000; t++) {
    if (cfg.square && r() < cfg.square) { const q = squareProblem(stage, kind, cfg, level, r); if (q) return q; }
    const steps = rnd(cfg.steps[0], cfg.steps[1], r), extra = stage === 2 ? rnd(cfg.extra[0], cfg.extra[1], r) : 0;
    const w = randomWalk(kind, steps + extra, BOX[kind], r, stage === 3 && kind === "cube");
    if (!w) continue;
    const moves = w.moves.slice(0, steps), tn = countTurns(moves);
    if (tn < cfg.turns[0] || tn > cfg.turns[1]) continue;
    const { board, blocks } = toBoard(w.cells, w.blocks);
    const start = blocks[0];
    if (stage === 1) return { stage, kind, level, board, start, solution: w.moves };
    if (stage === 2) {
      const sim = simulate(start, moves, boardSet(board));
      return { stage, kind, level, board, start, moves, cells: [...sim.cells], goal: blocks[steps] };
    }
    const p = { stage, kind, level, board, start, moves, pattern: board.cells, goal: blocks[steps] };
    if (solveCover(board, start, 2).count !== 1) continue;      // じゅんばんが 1とおりに きまる
    if (backHasDeadEnd(p)) continue;                            // ゴールから もどる ときに まよって 止まらない
    return p;
  }
  throw new Error(`makeProblem failed ${stage} ${kind} ${level}`);
}
export const makeSet = (stage, kind, r = Math.random) => [1, 2, 3].map((lv) => makeProblem(stage, kind, lv, r));

/* よそうの こたえあわせ（スタートの マスは もう ついているので のぞく） */
export function checkPrediction(problem, predicted) {
  const startK = new Set(fkeys(problem.start));
  const want = new Set(problem.cells.filter((k) => !startK.has(k)));
  const got = new Set([...predicted].filter((k) => !startK.has(k)));
  return { ok: sameSet(want, got), hit: [...got].filter((k) => want.has(k)), missed: [...want].filter((k) => !got.has(k)), extra: [...got].filter((k) => !want.has(k)) };
}
/* じゅんばんの こたえあわせ：ころがして できた もようが おなじなら せいかい */
export function checkOrder(problem, moves) {
  const sim = simulate(problem.start, moves, boardSet(problem.board));
  const want = new Set(problem.pattern);
  return { ok: sim.ok && sameSet(sim.cells, want), outAt: sim.failAt, why: sim.why, sim,
    missed: [...want].filter((k) => !sim.cells.has(k)), extra: [...sim.cells].filter((k) => !want.has(k)) };
}

/* 「ゴールから もどる」：もようの マスの 上だけを ころがって もどる（もどった マスには もう いけない）
   state：{ block, trail:[key…], moves:[dir…] } */
export const backStart = (p) => ({ block: p.goal, trail: fkeys(p.goal), moves: [] });
export function backStep(p, st, dir) {
  const r = tryRoll(st.block, dir, new Set(p.pattern), new Set(st.trail));
  if (!r.block) return { ok: false, why: r.why === "out" ? "nopattern" : "visited" };
  return { ok: true, state: { block: r.block, trail: [...st.trail, ...fkeys(r.block)], moves: [...st.moves, dir] } };
}
export const backDone = (p, st) => st.trail.length === p.pattern.length && sameBlock(st.block, p.start);

/* ---------- 形の しゅるい（レポート・テスト用） ---------- */
export function shapeTags(board) {
  const s = boardSet(board), tags = new Set();
  const nb = (x, y) => DIR_KEYS.filter((d) => s.has(key(x + DIRS[d].dx, y + DIRS[d].dy))).length;
  let deg3 = 0;
  for (const k of board.cells) { const [x, y] = unkey(k); if (nb(x, y) >= 3) deg3++; }
  if (board.square) tags.add("正方形");
  if (deg3) tags.add("T字");
  // すき間：盤の わくの 中で 盤に ない マス（へこみ・あな）
  if (!board.square && board.cells.length < board.w * board.h) {
    // あな（まわりを かこまれた すき間）
    const out = new Set(), q = [];
    for (let x = -1; x <= board.w; x++) for (let y = -1; y <= board.h; y++) if (x < 0 || y < 0 || x >= board.w || y >= board.h) { out.add(key(x, y)); q.push([x, y]); }
    while (q.length) {
      const [x, y] = q.pop();
      for (const d of DIR_KEYS) { const ax = x + DIRS[d].dx, ay = y + DIRS[d].dy, k = key(ax, ay); if (ax < -1 || ay < -1 || ax > board.w || ay > board.h || out.has(k) || s.has(k)) continue; out.add(k); q.push([ax, ay]); }
    }
    for (let y = 0; y < board.h; y++) for (let x = 0; x < board.w; x++) if (!s.has(key(x, y)) && !out.has(key(x, y))) tags.add("あな");
  }
  // かいだん：ななめに ならぶ 3だん いじょう
  for (const k of board.cells) {
    const [x, y] = unkey(k);
    for (const [sx, sy] of [[1, 1], [1, -1]]) if (s.has(key(x + sx, y)) && s.has(key(x + sx, y + sy)) && s.has(key(x + 2 * sx, y + sy)) && s.has(key(x + 2 * sx, y + 2 * sy))) tags.add("かいだん");
  }
  if (!tags.size || (tags.size === 1 && tags.has("かいだん"))) {
    const rows = new Set(board.cells.map((k) => unkey(k)[1])), cols = new Set(board.cells.map((k) => unkey(k)[0]));
    if (rows.size === 1 || cols.size === 1) tags.add("まっすぐ"); else if (!tags.size) tags.add("L字・まがった形");
  }
  return [...tags];
}
