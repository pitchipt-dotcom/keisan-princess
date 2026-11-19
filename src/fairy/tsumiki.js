/* =====================================================================
   つみきの森 — つみきを マス目の 上で ころがす（純粋関数。画面は TsumikiForest.jsx）
   - つみきが 紙に ついた マスに 色が つく（おいた ばしょも ①として つく）
   - むき：おく（y−1）・てまえ（y＋1）・みぎ（x＋1）・ひだり（x−1）
     ※ 画面では 手まえから ななめ上に 見るので、「おく」が 画面の 上
   - 今回 つかうのは 立方体（cube）だけ。直方体（cuboid：2こ つなげた つみき）の ころがり方と
     「たっている／ねている」の あらわし方も ここに 用意して おく（次の ステップで つかう）
   つみき：{ kind:"cube"|"cuboid", x, y, pose:"stand"|"lieX"|"lieY" }
     x, y … 紙に ついている マスの うち いちばん 左・おくの マス
     lieX … 左右に ねている（x と x+1）、lieY … おく・てまえに ねている（y と y+1）
   ===================================================================== */

export const GRID = 5;
export const DIRS = {
  oku:    { dx: 0, dy: -1, label: "おく",   arrow: "↑" },
  temae:  { dx: 0, dy: 1,  label: "てまえ", arrow: "↓" },
  migi:   { dx: 1, dy: 0,  label: "みぎ",   arrow: "→" },
  hidari: { dx: -1, dy: 0, label: "ひだり", arrow: "←" },
};
export const DIR_KEYS = ["oku", "temae", "migi", "hidari"];
export const OPP = { oku: "temae", temae: "oku", migi: "hidari", hidari: "migi" };
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

export const cube = (x, y) => ({ kind: "cube", x, y, pose: "stand" });
export const cuboid = (x, y, pose = "stand") => ({ kind: "cuboid", x, y, pose });

/* 紙に ついている マス */
export function footprint(b) {
  if (b.kind === "cube" || b.pose === "stand") return [[b.x, b.y]];
  return b.pose === "lieX" ? [[b.x, b.y], [b.x + 1, b.y]] : [[b.x, b.y], [b.x, b.y + 1]];
}

/* 1かい ころがす（はみ出すかは inBounds で しらべる） */
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

export const inBounds = (b, n = GRID) => footprint(b).every(([x, y]) => x >= 0 && y >= 0 && x < n && y < n);

/* start から moves の じゅんに ころがす。
   かえりち：{ ok, failAt（はみ出した 手の 番号 or -1）, blocks, stamps:[{ no, cells:[[x,y]] }], cells:Set(key) } */
export function simulate(start, moves, n = GRID) {
  const blocks = [start], stamps = [{ no: 1, cells: footprint(start) }];
  let b = start;
  for (let i = 0; i < moves.length; i++) {
    const nb = roll(b, moves[i]);
    if (!inBounds(nb, n)) return { ok: false, failAt: i, blocks, stamps, cells: cellsOf(stamps) };
    b = nb; blocks.push(b); stamps.push({ no: stamps.length + 1, cells: footprint(b) });
  }
  return { ok: true, failAt: -1, blocks, stamps, cells: cellsOf(stamps) };
}
const cellsOf = (stamps) => new Set(stamps.flatMap((s) => s.cells.map(([x, y]) => key(x, y))));

export const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));
export const reverseMoves = (moves) => moves.slice().reverse().map((d) => OPP[d]);

/* ---------- もんだいを つくる（立方体） ----------
   みちすじは「1本道」に する：おなじ マスを 2かい 通らない ＋ となりあう のは まえと うしろの マスだけ
   → もようを 見れば じゅんばんが 1つに きまり、「ゴールから もどる」でも まよわない */
const rnd = (lo, hi, r = Math.random) => lo + Math.floor(r() * (hi - lo + 1));
const shuffle = (a, r = Math.random) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function makePath(len, n = GRID, r = Math.random) {
  for (let tries = 0; tries < 500; tries++) {
    const sx = rnd(0, n - 1, r), sy = rnd(0, n - 1, r);
    const path = [[sx, sy]], moves = [];
    const seen = new Set([key(sx, sy)]);
    let ok = true;
    for (let i = 0; i < len && ok; i++) {
      const [cx, cy] = path[path.length - 1];
      const opts = shuffle(DIR_KEYS.slice(), r).filter((d) => {
        const nx = cx + DIRS[d].dx, ny = cy + DIRS[d].dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen.has(key(nx, ny))) return false;
        // 1本道：あたらしい マスの となりに、いま いる マス いがいの 通った マスが ない
        return DIR_KEYS.every((e) => { const ax = nx + DIRS[e].dx, ay = ny + DIRS[e].dy; return (ax === cx && ay === cy) || !seen.has(key(ax, ay)); });
      });
      if (!opts.length) { ok = false; break; }
      const d = opts[0];
      moves.push(d); path.push([cx + DIRS[d].dx, cy + DIRS[d].dy]); seen.add(key(...path[path.length - 1]));
    }
    if (!ok) continue;
    if (len >= 3 && moves.every((d) => d === moves[0])) continue;       // まっすぐ だけは つまらないので よける
    return { start: cube(sx, sy), moves };
  }
  throw new Error("makePath failed");
}

/* だんかい2：しじどおりに ころがすと どこに 色が つく？（cells は スタートを ふくむ） */
export function makeRollProblem(len, r = Math.random) {
  const { start, moves } = makePath(len, GRID, r);
  const sim = simulate(start, moves);
  return { stage: 2, start, moves, cells: [...sim.cells], goal: sim.blocks[sim.blocks.length - 1] };
}
/* だんかい3：この もようは どの じゅんばんで ころがした？ */
export function makePatternProblem(len, r = Math.random) {
  const { start, moves } = makePath(len, GRID, r);
  const sim = simulate(start, moves);
  return { stage: 3, start, moves, pattern: [...sim.cells], goal: sim.blocks[sim.blocks.length - 1] };
}

/* よそうの こたえあわせ（スタートの マスは もう ついているので のぞく） */
export function checkPrediction(problem, predicted) {
  const startK = key(problem.start.x, problem.start.y);
  const want = new Set(problem.cells.filter((k) => k !== startK));
  const got = new Set([...predicted].filter((k) => k !== startK));
  return { ok: sameSet(want, got), hit: [...got].filter((k) => want.has(k)), missed: [...want].filter((k) => !got.has(k)), extra: [...got].filter((k) => !want.has(k)) };
}
/* じゅんばんの こたえあわせ：ころがして できた もようが おなじなら せいかい（じゅんばんが ちがっても よい） */
export function checkOrder(problem, moves) {
  const sim = simulate(problem.start, moves);
  const want = new Set(problem.pattern);
  return { ok: sim.ok && sameSet(sim.cells, want), outAt: sim.failAt, sim,
    missed: [...want].filter((k) => !sim.cells.has(k)), extra: [...sim.cells].filter((k) => !want.has(k)) };
}

/* 「ゴールから もどる」：もようの マスの 上だけを 1マスずつ もどる
   state：{ pos:[x,y], trail:[key…]（ゴールから もどった じゅん）, moves:[dir…] } */
export const backStart = (problem) => ({ pos: [problem.goal.x, problem.goal.y], trail: [key(problem.goal.x, problem.goal.y)], moves: [] });
export function backStep(problem, st, dir) {
  const nx = st.pos[0] + DIRS[dir].dx, ny = st.pos[1] + DIRS[dir].dy, k = key(nx, ny);
  if (!problem.pattern.includes(k)) return { ok: false, why: "nopattern" };
  if (st.trail.includes(k)) return { ok: false, why: "visited" };
  return { ok: true, state: { pos: [nx, ny], trail: [...st.trail, k], moves: [...st.moves, dir] } };
}
export const backDone = (problem, st) => st.trail.length === problem.pattern.length && st.pos[0] === problem.start.x && st.pos[1] === problem.start.y;
