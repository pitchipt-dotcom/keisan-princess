import React, { useState, useEffect, useRef, useCallback } from "react";

/* =========================================================================
   けいさんプリンセス  —  まじょ・にんぎょ・プリンセスと あそぶ さんすうゲーム
   もんだいをといて「ほしのかけら」をあつめ、まほうのとびらをひらいて
   かわいいおしゃれグッズをあつめよう！

   このファイルは Claude Artifacts 上の storage の代わりに、
   標準の localStorage を使う storage シムを使っています（スタンドアロン
   サイトとして Vercel 等にデプロイするため）。
   ========================================================================= */

/* ---- localStorage を storage と同じ形のAPIで使うための shim ---- */
const storage = {
  async get(key) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? null : { key, value: v };
    } catch (e) { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, value); return { key, value }; }
    catch (e) { return null; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return { key, deleted: true }; }
    catch (e) { return null; }
  },
};

const C = {
  night: "#3A2A6B",
  nightDeep: "#241848",
  cream: "#FFF6FB",
  rose: "#FF8FC4",
  roseDeep: "#E85FA3",
  gold: "#FFC94D",
  goldDeep: "#F2A93B",
  mint: "#7DE0C8",
  lav: "#C9A8F0",
  plum: "#4A2D6B",
  plumSoft: "#7A5C98",
};

const RARITY = {
  n:  { label: "ふつう",   ring: "#9FE6D6", glow: "#7DE0C8", weight: 5 },
  r:  { label: "レア",     ring: "#9CC4FF", glow: "#7AA8FF", weight: 3 },
  sr: { label: "キラキラ", ring: "#FFD66B", glow: "#FFC94D", weight: 1 },
};

const WITCH_ITEMS = [
  { id: "ribbon",   name: "ピンクのリボン",       rarity: "n",  flavor: "頭に つけると ごきげん！" },
  { id: "starpin",  name: "星のヘアピン",         rarity: "n",  flavor: "キラッと 光るよ" },
  { id: "minihat",  name: "ちびぼうし",           rarity: "n",  flavor: "小さくて かわいい" },
  { id: "tiara",    name: "おひめさまティアラ",   rarity: "sr", flavor: "今日の きみは おひめさま" },
  { id: "dress",    name: "夜空のドレス",         rarity: "r",  flavor: "くるりと まわってね" },
  { id: "cape",     name: "ひらひらマント",       rarity: "r",  flavor: "風で ふわっと なびく" },
  { id: "socks",    name: "みずたまソックス",     rarity: "n",  flavor: "足もとも オシャレ♪" },
  { id: "boots",    name: "まほうのブーツ",       rarity: "r",  flavor: "遠くまで 歩けるよ" },
  { id: "wand",     name: "お星さまステッキ",     rarity: "r",  flavor: "ふると キラキラ！" },
  { id: "candy",    name: "にじいろキャンディ",   rarity: "n",  flavor: "食べたら まほうが 出る…？" },
  { id: "flower",   name: "まほうの花",           rarity: "n",  flavor: "いい においが するみたい" },
  { id: "crystal",  name: "ゆめみるクリスタル",   rarity: "r",  flavor: "なかに 星が いるみたい" },
  { id: "necklace", name: "月のネックレス",       rarity: "r",  flavor: "夜に そっと 光る" },
  { id: "moon",     name: "みかづきの おまもり",   rarity: "sr", flavor: "ねがいごとが かなうかも" },
  { id: "cat",      name: "くろねこ ノワール",     rarity: "sr", flavor: "まほうの あいぼう♪" },
  { id: "wings",    name: "にじのつばさ",         rarity: "sr", flavor: "空を とべちゃう！" },
];

const MERMAID_ITEMS = [
  { id: "m_shellclip",    name: "シェルの ヘアクリップ", rarity: "n",  flavor: "頭に つけると きらきら" },
  { id: "m_pearlband",    name: "パールの ヘアバンド",   rarity: "n",  flavor: "しんじゅが ひかるよ" },
  { id: "m_starfishpin",  name: "ヒトデの ピン",         rarity: "n",  flavor: "うみの ほしだよ" },
  { id: "m_coralcrown",   name: "さんごの かんむり",     rarity: "sr", flavor: "うみの おひめさまの しるし" },
  { id: "m_scaledress",   name: "うろこの ドレス",       rarity: "r",  flavor: "ゆらゆら ゆれて きれい" },
  { id: "m_pearlcape",    name: "パールの マント",       rarity: "r",  flavor: "うみかぜに なびくよ" },
  { id: "m_finanklet",    name: "シェルの あしかざり",   rarity: "n",  flavor: "あしもとも オシャレ♪" },
  { id: "m_pearlanklet",  name: "パールの あしかざり",   rarity: "r",  flavor: "あるくたびに ひかるよ" },
  { id: "m_trident",      name: "うみの ステッキ",       rarity: "r",  flavor: "ふると なみが おどるよ" },
  { id: "m_seacandy",     name: "うみのほし キャンディ", rarity: "n",  flavor: "たべたら うみの あじ" },
  { id: "m_pearl",        name: "おおきな パール",       rarity: "n",  flavor: "なかに ひかりが あるみたい" },
  { id: "m_shellbag",     name: "シェルの ポーチ",       rarity: "r",  flavor: "ちいさな たからもの いれ" },
  { id: "m_pearlnecklace",name: "パールの ネックレス",   rarity: "r",  flavor: "むねもとで ゆれるよ" },
  { id: "m_moonshell",    name: "つきがたの シェル",     rarity: "sr", flavor: "よるの うみで ひかるよ" },
  { id: "m_dolphin",      name: "ともの イルカ",         rarity: "sr", flavor: "なかよしの ともだち♪" },
  { id: "m_bubblewings",  name: "あわの つばさ",         rarity: "sr", flavor: "うみを とべちゃう！" },
];

const PRINCESS_ITEMS = [
  { id: "p_hairribbon",  name: "リボンの かみかざり",   rarity: "n",  flavor: "頭に つけると ごきげん！" },
  { id: "p_pearlpin",    name: "しんじゅの ピン",       rarity: "n",  flavor: "きらりと 光るよ" },
  { id: "p_flowercrown", name: "おはなの かんむり",     rarity: "n",  flavor: "おはなの においが するよ" },
  { id: "p_tiara",       name: "おうじょの ティアラ",   rarity: "sr", flavor: "今日の きみは おうじょさま" },
  { id: "p_balldress",   name: "きゅうていの ドレス",   rarity: "r",  flavor: "くるりと まわってね" },
  { id: "p_cape",        name: "ふわふわケープ",         rarity: "r",  flavor: "風で ふわっと なびく" },
  { id: "p_lacesocks",   name: "レースの ソックス",     rarity: "n",  flavor: "足もとも オシャレ♪" },
  { id: "p_glassshoes",  name: "ガラスの くつ",         rarity: "r",  flavor: "あるくと きらきら 光るよ" },
  { id: "p_wand",        name: "おうじょの ステッキ",   rarity: "r",  flavor: "ふると キラキラ！" },
  { id: "p_candy",       name: "おしろの あめ",         rarity: "n",  flavor: "おしろの あじが するよ" },
  { id: "p_rose",        name: "あかい バラ",           rarity: "n",  flavor: "いい においが するみたい" },
  { id: "p_mirror",      name: "まほうの かがみ",       rarity: "r",  flavor: "うつすと まほうが みえるかも" },
  { id: "p_necklace",    name: "しんじゅの ネックレス", rarity: "r",  flavor: "夜に そっと 光る" },
  { id: "p_moon",        name: "つきの おまもり",       rarity: "sr", flavor: "ねがいごとが かなうかも" },
  { id: "p_kitten",      name: "ともの こねこ",         rarity: "sr", flavor: "なかよしの ともだち♪" },
  { id: "p_angelwings",  name: "てんしの つばさ",       rarity: "sr", flavor: "空を とべちゃう！" },
];

const ITEMS_BY_CHAR = { witch: WITCH_ITEMS, mermaid: MERMAID_ITEMS, princess: PRINCESS_ITEMS };

// おてつだいの場面（式を見せず「○が△こ、ぜんぶで?」の形にする）
const SCENES = [
  { id: "potion", item: "star",   color: "#E7D6FA", ask: (a, b) => `びんが ${a}こ。1こに しずくが ${b}つぶ。` },
  { id: "garden", item: "flower", color: "#DDF6EC", ask: (a, b) => `花を ${a}れつ うえたよ。1れつに ${b}つずつ。` },
  { id: "cookie", item: "cookie", color: "#FBE6CF", ask: (a, b) => `おさらが ${a}まい。1まいに クッキー ${b}こ。` },
  { id: "basket", item: "star",   color: "#FCE0EE", ask: (a, b) => `かごが ${a}こ。1こに 星が ${b}こ。` },
];

const SLOT_DEFS_BY_CHAR = {
  witch: [
    { key: "head",   label: "頭",     items: ["ribbon", "starpin", "minihat", "tiara"] },
    { key: "outfit", label: "ふく",   items: ["dress", "cape"] },
    { key: "feet",   label: "あし",   items: ["socks", "boots"] },
    { key: "hold",   label: "もちもの", items: ["wand", "candy", "flower", "crystal"] },
    { key: "acc",    label: "かざり", items: ["necklace", "moon", "cat", "wings"] },
  ],
  mermaid: [
    { key: "head",   label: "頭",     items: ["m_shellclip", "m_pearlband", "m_starfishpin", "m_coralcrown"] },
    { key: "outfit", label: "ふく",   items: ["m_scaledress", "m_pearlcape"] },
    { key: "feet",   label: "あし",   items: ["m_finanklet", "m_pearlanklet"] },
    { key: "hold",   label: "もちもの", items: ["m_trident", "m_seacandy", "m_pearl", "m_shellbag"] },
    { key: "acc",    label: "かざり", items: ["m_pearlnecklace", "m_moonshell", "m_dolphin", "m_bubblewings"] },
  ],
  princess: [
    { key: "head",   label: "頭",     items: ["p_hairribbon", "p_pearlpin", "p_flowercrown", "p_tiara"] },
    { key: "outfit", label: "ふく",   items: ["p_balldress", "p_cape"] },
    { key: "feet",   label: "あし",   items: ["p_lacesocks", "p_glassshoes"] },
    { key: "hold",   label: "もちもの", items: ["p_wand", "p_candy", "p_rose", "p_mirror"] },
    { key: "acc",    label: "かざり", items: ["p_necklace", "p_moon", "p_kitten", "p_angelwings"] },
  ],
};

const PULL_COST = 50;
const SAVE_KEY = "kukumajo:save:v1";
const RESET_BACKUP_KEY = "kukumajo:save:v1:pre_reset";

/* ---- バックアップコードの 書き出し／読み込み ---- */
function encodeSave(data) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  catch (e) { return ""; }
}
function decodeSave(code) {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const d = JSON.parse(json);
    return (d && typeof d === "object") ? d : null;
  } catch (e) { return null; }
}

/* ----------------------------- Audio (tiny synth) ----------------------- */
let _ac = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!_ac) {
    try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { _ac = null; }
  }
  return _ac;
}
function tone(freq, start, dur, type = "sine", vol = 0.12) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  correct(on) { if (!on) return; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.06, 0.28, "triangle", 0.1)); },
  wrong(on)   { if (!on) return; tone(311.13, 0, 0.18, "sine", 0.09); tone(246.94, 0.1, 0.22, "sine", 0.09); },
  tap(on)     { if (!on) return; tone(880, 0, 0.06, "sine", 0.05); },
  reveal(on)  { if (!on) return; const s = [659.25, 783.99, 987.77, 1318.5, 1567.98]; s.forEach((f, i) => tone(f, i * 0.08, 0.4, "triangle", 0.09)); tone(1975.5, 0.45, 0.6, "sine", 0.07); },
};

/* ----------------------------- helpers ---------------------------------- */
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function weightedIndex(weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}
function makeQuestion(mode, mastery, lastWrongKey) {
  const facts = [];
  if (mode === "mix") { for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) facts.push([a, b]); }
  else { for (let b = 1; b <= 9; b++) facts.push([mode, b]); }
  const weights = facts.map(([a, b]) => {
    const key = a + "x" + b;
    const m = Math.max(0, mastery[key] || 0);
    let w = 1 / (1 + m);
    if (key === lastWrongKey) w *= 3.5;
    return w;
  });
  const [a, b] = facts[weightedIndex(weights)];
  const ans = a * b;
  const seen = new Set([ans]);
  const cand = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, ans + 1, ans - 1, ans + a, ans - b, ans + b, ans - a, ans + 2, ans - 2, ans + 10, ans - 10];
  const distractors = [];
  for (const c of shuffle(cand)) { if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } if (distractors.length === 3) break; }
  let k = 1;
  while (distractors.length < 3) { const c = ans + k * (Math.random() < 0.5 ? 1 : -1); if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } k++; }
  const scene = SCENES[(Math.random() * SCENES.length) | 0];
  return { gameType: "kuku", a, b, ans, key: a + "x" + b, scene, options: shuffle([ans, ...distractors]) };
}

/* ---- くりあがりの たしざん（1けた + 1けた、こたえが 10いじょう） ---- */
const SCENES_ADD = [
  { item: "star",   color: "#FCE0EE", ask: (a) => `ほしが ${a}こ あったよ。あたらしく ほしが ふえたよ。` },
  { item: "flower", color: "#DDF6EC", ask: (a) => `はなが ${a}本 さいてたよ。あとから はなが ふえたよ。` },
  { item: "cookie", color: "#FBE6CF", ask: (a) => `クッキーが ${a}こ あったよ。クッキーを もらったよ。` },
];
function makeAddCarryQuestion(mastery, lastWrongKey) {
  const facts = [];
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a + b >= 10) facts.push([a, b]);
  const weights = facts.map(([a, b]) => {
    const key = "add:" + a + "+" + b;
    const m = Math.max(0, mastery[key] || 0);
    let w = 1 / (1 + m);
    if (key === lastWrongKey) w *= 3.5;
    return w;
  });
  const [a, b] = facts[weightedIndex(weights)];
  const ans = a + b;
  const seen = new Set([ans]);
  const cand = [ans - 1, ans + 1, ans - 2, ans + 2, ans - 3, ans + 3, ans - 10, ans + 10, a, b];
  const distractors = [];
  for (const c of shuffle(cand)) { if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } if (distractors.length === 3) break; }
  let k = 1;
  while (distractors.length < 3) { const c = ans + k * (Math.random() < 0.5 ? 1 : -1); if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } k++; }
  const scene = SCENES_ADD[(Math.random() * SCENES_ADD.length) | 0];
  return { gameType: "addCarry", a, b, ans, key: "add:" + a + "+" + b, scene, options: shuffle([ans, ...distractors]) };
}

/* ---- くりさがりの ひきざん（11〜18 ひく 1けた、かりてくる ひつよう） ---- */
const SCENES_SUB = [
  { item: "candy",  color: "#F3E8FD", ask: (a) => `あめが ${a}こ あったよ。いくつか たべたよ。` },
  { item: "cookie", color: "#FBE6CF", ask: (a) => `クッキーが ${a}こ あったよ。いくつか あげたよ。` },
  { item: "star",   color: "#FCE0EE", ask: (a) => `ほしが ${a}こ あったよ。いくつか つかったよ。` },
];
function makeSubBorrowQuestion(mastery, lastWrongKey) {
  const facts = [];
  for (let a = 11; a <= 18; a++) for (let b = 1; b <= 9; b++) if ((a % 10) < b) facts.push([a, b]);
  const weights = facts.map(([a, b]) => {
    const key = "sub:" + a + "-" + b;
    const m = Math.max(0, mastery[key] || 0);
    let w = 1 / (1 + m);
    if (key === lastWrongKey) w *= 3.5;
    return w;
  });
  const [a, b] = facts[weightedIndex(weights)];
  const ans = a - b;
  const seen = new Set([ans]);
  const cand = [ans - 1, ans + 1, ans - 2, ans + 2, ans - 3, ans + 3, a - (10 - b), b - a + 10];
  const distractors = [];
  for (const c of shuffle(cand)) { if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } if (distractors.length === 3) break; }
  let k = 1;
  while (distractors.length < 3) { const c = ans + k * (Math.random() < 0.5 ? 1 : -1); if (c > 0 && !seen.has(c)) { seen.add(c); distractors.push(c); } k++; }
  const scene = SCENES_SUB[(Math.random() * SCENES_SUB.length) | 0];
  return { gameType: "subBorrow", a, b, ans, key: "sub:" + a + "-" + b, scene, options: shuffle([ans, ...distractors]) };
}

/* ---- 10を つくろう（1けたの数 + ? = 10） ---- */
const SCENES_MAKE10 = [
  { item: "star",   color: "#FCE0EE", ask: (a) => `ほしが ${a}こ あるよ。` },
  { item: "flower", color: "#DDF6EC", ask: (a) => `はなが ${a}本 あるよ。` },
  { item: "cookie", color: "#FBE6CF", ask: (a) => `クッキーが ${a}こ あるよ。` },
];
function makeMake10Question(mastery, lastWrongKey) {
  const facts = [];
  for (let a = 1; a <= 9; a++) facts.push(a);
  const weights = facts.map((a) => {
    const key = "m10:" + a;
    const m = Math.max(0, mastery[key] || 0);
    let w = 1 / (1 + m);
    if (key === lastWrongKey) w *= 3.5;
    return w;
  });
  const a = facts[weightedIndex(weights)];
  const ans = 10 - a;
  const seen = new Set([ans]);
  const cand = [a, ans - 1, ans + 1, ans - 2, ans + 2, 10 - ans];
  const distractors = [];
  for (const c of shuffle(cand)) { if (c > 0 && c <= 9 && !seen.has(c)) { seen.add(c); distractors.push(c); } if (distractors.length === 3) break; }
  let k = 1;
  while (distractors.length < 3) { const c = ans + k; if (c > 0 && c <= 9 && !seen.has(c)) { seen.add(c); distractors.push(c); } k++; if (k > 9) break; }
  const scene = SCENES_MAKE10[(Math.random() * SCENES_MAKE10.length) | 0];
  return { gameType: "make10", a, b: ans, ans, key: "m10:" + a, scene, options: shuffle([ans, ...distractors]) };
}

const TAIL_BY_GAMETYPE = {
  kuku:     "ぜんぶで いくつ？",
  addCarry: "ぜんぶで いくつ？",
  subBorrow:"のこりは いくつ？",
  make10:   "あと いくつで 10こに なる？",
};

const GAMETYPE_INFO = {
  kuku:     { label: "九九",                 sub: "かけざんの れんしゅう", icon: "✖️", accent: "#C9A8F0" },
  addCarry: { label: "くりあがりの たしざん", sub: "10を こえる たしざん",   icon: "➕", accent: "#FFC9A0" },
  subBorrow:{ label: "くりさがりの ひきざん", sub: "かりてくる ひきざん",     icon: "➖", accent: "#9CC4FF" },
  make10:   { label: "10を つくろう",         sub: "あわせて 10こに しよう", icon: "🔟", accent: "#9FE6D6" },
};

function generateQuestion(gameType, mode, mastery, lastWrongKey) {
  if (gameType === "addCarry") return makeAddCarryQuestion(mastery, lastWrongKey);
  if (gameType === "subBorrow") return makeSubBorrowQuestion(mastery, lastWrongKey);
  if (gameType === "make10") return makeMake10Question(mastery, lastWrongKey);
  return makeQuestion(mode, mastery, lastWrongKey);
}

function rewardForGameType(gameType, streak) {
  if (gameType === "kuku") return 12 + Math.min(8, streak) * 2;
  return 7 + Math.min(8, streak) * 1;
}

function feedbackTextFor(q) {
  if (q.gameType === "addCarry") return { big: "できた〜！✨", total: <>ぜんぶで <b>{q.ans}</b> こ！</>, echo: `${q.a} ＋ ${q.b} ＝ ${q.ans}` };
  if (q.gameType === "subBorrow") return { big: "できた〜！✨", total: <>のこりは <b>{q.ans}</b> こ！</>, echo: `${q.a} － ${q.b} ＝ ${q.ans}` };
  if (q.gameType === "make10") return { big: "10こ できた〜！✨", total: <>あと <b>{q.ans}</b> こで 10こ！</>, echo: `${q.a} ＋ ${q.ans} ＝ 10` };
  return { big: "あつまった〜！✨", total: <>ぜんぶで <b>{q.ans}</b> こ！</>, echo: `${q.a}が ${q.b}つで ${q.ans}` };
}

/* ============================ SVG: 魔女ルナ ============================== */
function Witch({ mood = "idle", size = 150 }) {
  const happy = mood === "happy";
  const oops = mood === "oops";
  return (
    <svg viewBox="0 0 160 180" width={size} height={size * 180 / 160} aria-label="まじょのルナ" role="img" style={{ display: "block", overflow: "visible" }}>
      {/* familiar sparkles when happy */}
      {happy && [[18, 30], [140, 44], [26, 96], [134, 110]].map(([x, y], i) => (
        <g key={i} className="kk-pop"><path d={`M${x} ${y-7} L${x+2} ${y-2} L${x+7} ${y} L${x+2} ${y+2} L${x} ${y+7} L${x-2} ${y+2} L${x-7} ${y} L${x-2} ${y-2} Z`} fill={C.gold} /></g>
      ))}
      {/* hair behind */}
      <path d="M44 78 q-16 30 -6 60 q12 -10 18 -8 q-6 -28 -2 -52 Z" fill="#B98AE0" />
      <path d="M116 78 q16 30 6 60 q-12 -10 -18 -8 q6 -28 2 -52 Z" fill="#B98AE0" />
      {/* robe */}
      <path d="M58 118 q22 -10 44 0 l14 46 q-36 14 -72 0 Z" fill={C.night} />
      <path d="M58 118 q22 -10 44 0 l4 14 q-26 -8 -52 0 Z" fill="#4d3a86" />
      {/* hands */}
      <circle cx="52" cy="150" r="7" fill="#FBE3D2" />
      <circle cx="108" cy="150" r="7" fill="#FBE3D2" />
      {/* wand */}
      <line x1="108" y1="150" x2="128" y2="120" stroke="#7A5C98" strokeWidth="4" strokeLinecap="round" />
      <path d="M128 112 l2.6 6.2 l6.7 .5 l-5.1 4.4 l1.6 6.5 l-5.8 -3.4 l-5.8 3.4 l1.6 -6.5 l-5.1 -4.4 l6.7 -.5 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1.5" />
      {/* face */}
      <circle cx="80" cy="86" r="30" fill="#FCEAD9" />
      {/* cheeks */}
      <ellipse cx="62" cy="94" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      <ellipse cx="98" cy="94" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      {/* eyes */}
      {happy ? (
        <>
          <path d="M64 86 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
          <path d="M84 86 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="70" cy="86" rx="5.5" ry="7" fill={C.plum} />
          <ellipse cx="90" cy="86" rx="5.5" ry="7" fill={C.plum} />
          <circle cx="72" cy="83" r="2" fill="#fff" />
          <circle cx="92" cy="83" r="2" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {oops ? <circle cx="80" cy="100" r="4" fill="#C0568A" />
        : <path d="M74 99 q6 7 12 0" fill="none" stroke="#C0568A" strokeWidth="3" strokeLinecap="round" />}
      {oops && <path d="M104 80 q4 8 0 14 q-4 -6 0 -14Z" fill="#9CC4FF" />}
      {/* hair front */}
      <path d="M50 70 q30 -22 60 0 q-6 -4 -10 0 q-4 -6 -10 -2 q-4 -6 -10 0 q-6 -4 -10 0 q-6 -4 -10 2 Z" fill="#C79BEC" />
      {/* hat */}
      <path d="M44 70 q36 -16 72 0 q4 6 -4 9 q-32 -10 -64 0 q-8 -3 -4 -9 Z" fill={C.night} />
      <path d="M58 64 q22 -64 44 0 q-22 -12 -44 0 Z" fill={C.night} />
      <path d="M97 22 q14 6 6 26 q-8 -10 -18 -8 q8 -10 12 -18Z" fill="#4d3a86" />
      <path d="M70 50 l2.4 5.6 l6 .5 l-4.6 4 l1.5 5.9 l-5.3 -3.1 l-5.3 3.1 l1.5 -5.9 l-4.6 -4 l6 -.5 Z" fill={C.gold} />
    </svg>
  );
}

/* ============================ SVG: にんぎょ マリン ========================= */
function Mermaid({ mood = "idle", size = 150 }) {
  const happy = mood === "happy";
  const oops = mood === "oops";
  return (
    <svg viewBox="0 0 160 190" width={size} height={size * 190 / 160} aria-label="にんぎょのマリン" role="img" style={{ display: "block", overflow: "visible" }}>
      {happy && [[18, 30], [140, 40], [22, 110], [138, 118]].map(([x, y], i) => (
        <circle key={i} className="kk-pop" cx={x} cy={y} r="5" fill="#BFEFF5" opacity="0.85" />
      ))}
      {/* hair behind */}
      <path d="M42 76 q-18 32 -6 64 q14 -10 20 -8 q-8 -30 -2 -56 Z" fill="#7FD9E6" />
      <path d="M118 76 q18 32 6 64 q-14 -10 -20 -8 q8 -30 2 -56 Z" fill="#7FD9E6" />
      {/* tail */}
      <path d="M58 120 q22 -10 44 0 l10 32 q-12 24 -32 30 q-20 -6 -32 -30 Z" fill="#5FD6CB" />
      <path d="M58 120 q22 -10 44 0 l4 14 q-26 -8 -52 0 Z" fill="#3FB8AE" />
      <path d="M46 172 q14 18 34 22 q20 -4 34 -22 q-17 14 -34 12 q-17 2 -34 -12Z" fill="#3FB8AE" />
      {/* hands */}
      <circle cx="50" cy="118" r="7" fill="#FCEAD9" />
      <circle cx="110" cy="118" r="7" fill="#FCEAD9" />
      {/* top */}
      <path d="M58 102 q22 10 44 0 l-4 16 q-18 8 -36 0 Z" fill="#FF9FC9" stroke="#E85FA3" strokeWidth="2" />
      {/* face */}
      <circle cx="80" cy="80" r="30" fill="#FCEAD9" />
      <ellipse cx="62" cy="88" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      <ellipse cx="98" cy="88" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      {happy ? (
        <>
          <path d="M64 80 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
          <path d="M84 80 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="70" cy="80" rx="5.5" ry="7" fill={C.plum} />
          <ellipse cx="90" cy="80" rx="5.5" ry="7" fill={C.plum} />
          <circle cx="72" cy="77" r="2" fill="#fff" />
          <circle cx="92" cy="77" r="2" fill="#fff" />
        </>
      )}
      {oops ? <circle cx="80" cy="94" r="4" fill="#C0568A" />
        : <path d="M74 93 q6 7 12 0" fill="none" stroke="#C0568A" strokeWidth="3" strokeLinecap="round" />}
      {oops && <path d="M104 74 q4 8 0 14 q-4 -6 0 -14Z" fill="#9CC4FF" />}
      {/* hair front */}
      <path d="M48 62 q32 -26 64 0 q4 22 -8 36 q2 -18 -6 -28 q-4 8 -14 2 q-4 8 -14 0 q-4 8 -14 -2 q-8 10 -6 28 q-14 -14 -10 -36Z" fill="#8FE3EA" />
      {/* shell clip accent */}
      <path d="M54 60 l6 10 l-11 1 Z" fill="#FFD6E8" stroke="#E85FA3" strokeWidth="1.5" />
    </svg>
  );
}

/* ============================ SVG: プリンセス ロゼ ========================= */
function Princess({ mood = "idle", size = 150 }) {
  const happy = mood === "happy";
  const oops = mood === "oops";
  return (
    <svg viewBox="0 0 160 190" width={size} height={size * 190 / 160} aria-label="プリンセスのロゼ" role="img" style={{ display: "block", overflow: "visible" }}>
      {happy && [[18, 30], [140, 38], [22, 102], [138, 110]].map(([x, y], i) => (
        <path key={i} className="kk-pop" d={`M${x} ${y-6} L${x+6} ${y} L${x} ${y+6} L${x-6} ${y} Z`} fill={C.gold} />
      ))}
      {/* hair behind */}
      <path d="M40 72 q-14 30 -4 58 q12 -8 18 -6 q-8 -26 -4 -50 Z" fill="#F0C572" />
      <path d="M120 72 q14 30 4 58 q-12 -8 -18 -6 q8 -26 4 -50 Z" fill="#F0C572" />
      {/* ballgown skirt */}
      <path d="M48 118 q32 -14 64 0 l16 56 q-48 18 -96 0 Z" fill="#FFC2DA" />
      <path d="M48 118 q32 -14 64 0 l4 16 q-36 -10 -72 0 Z" fill="#FF9FC9" />
      <path d="M56 152 q24 6 48 0" fill="none" stroke="#fff" strokeWidth="3" opacity="0.55" />
      {/* bodice */}
      <path d="M62 100 q18 10 36 0 l-4 18 q-14 8 -28 0 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="2" />
      {/* hands */}
      <circle cx="52" cy="130" r="7" fill="#FCEAD9" />
      <circle cx="108" cy="130" r="7" fill="#FCEAD9" />
      {/* face */}
      <circle cx="80" cy="78" r="30" fill="#FCEAD9" />
      <ellipse cx="62" cy="86" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      <ellipse cx="98" cy="86" rx="6" ry="4" fill={C.rose} opacity="0.7" />
      {happy ? (
        <>
          <path d="M64 78 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
          <path d="M84 78 q6 -8 12 0" fill="none" stroke={C.plum} strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="70" cy="78" rx="5.5" ry="7" fill={C.plum} />
          <ellipse cx="90" cy="78" rx="5.5" ry="7" fill={C.plum} />
          <circle cx="72" cy="75" r="2" fill="#fff" />
          <circle cx="92" cy="75" r="2" fill="#fff" />
        </>
      )}
      {oops ? <circle cx="80" cy="92" r="4" fill="#C0568A" />
        : <path d="M74 91 q6 7 12 0" fill="none" stroke="#C0568A" strokeWidth="3" strokeLinecap="round" />}
      {oops && <path d="M104 72 q4 8 0 14 q-4 -6 0 -14Z" fill="#9CC4FF" />}
      {/* hair front with curls */}
      <path d="M48 58 q32 -28 64 0 q4 20 -6 34 q2 -18 -8 -26 q-4 8 -14 2 q-4 8 -14 0 q-4 8 -14 -2 q-10 8 -6 26 q-10 -14 -6 -34Z" fill="#F5D08A" />
      <circle cx="46" cy="68" r="6" fill="#F5D08A" />
      <circle cx="114" cy="68" r="6" fill="#F5D08A" />
      {/* hair ribbon */}
      <path d="M58 56 q22 -8 44 0" fill="none" stroke="#fff" strokeWidth="3" opacity="0.7" />
    </svg>
  );
}
function ItemIcon({ id, size = 64 }) {
  const s = { width: size, height: size, display: "block" };
  const sw = 4, stroke = C.plum;
  switch (id) {
    case "ribbon": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 50 L18 32 q-8 18 0 36 Z" fill={C.rose} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 50 L82 32 q8 18 0 36 Z" fill={C.rose} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="50" r="10" fill={C.roseDeep} stroke={stroke} strokeWidth={sw}/><circle cx="46" cy="46" r="3" fill="#fff"/></svg>);
    case "starpin": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 16 l9 22 l24 1.6 l-18.5 15.4 l6 23.4 L50 68 l-20.5 13.8 l6 -23.4 L17 39.6 l24 -1.6 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><circle cx="44" cy="40" r="4" fill="#fff" opacity=".8"/></svg>);
    case "flower": return (<svg viewBox="0 0 100 100" style={s}>{[0,72,144,216,288].map(a=>(<ellipse key={a} cx="50" cy="30" rx="11" ry="16" fill={C.rose} stroke={stroke} strokeWidth={sw} transform={`rotate(${a} 50 50)`}/>))}<circle cx="50" cy="50" r="11" fill={C.gold} stroke={stroke} strokeWidth={sw}/></svg>);
    case "candy": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="22" fill={C.mint} stroke={stroke} strokeWidth={sw}/><path d="M50 30 a20 20 0 0 1 18 12 M50 70 a20 20 0 0 0 -18 -12" fill="none" stroke={C.rose} strokeWidth="6" strokeLinecap="round"/><path d="M72 50 l18 -10 v20 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M28 50 l-18 -10 v20 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>);
    case "minihat": return (<svg viewBox="0 0 100 100" style={s}><path d="M22 70 q28 -10 56 0 q4 6 -3 9 q-25 -8 -50 0 q-7 -3 -3 -9Z" fill={C.night} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M36 66 q14 -44 28 0 q-14 -8 -28 0Z" fill={C.night} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 24 l3 8 l8 .6 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 l8 -.6Z" fill={C.gold}/></svg>);
    case "socks": return (<svg viewBox="0 0 100 100" style={s}><path d="M40 18 h18 v34 q0 14 -14 18 l-12 6 q-10 -4 -8 -14 l10 -6 q6 -2 6 -10 Z" fill={C.cream} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="42" cy="40" r="3" fill={C.rose}/><circle cx="50" cy="52" r="3" fill={C.rose}/><circle cx="35" cy="58" r="3" fill={C.rose}/><rect x="38" y="18" width="22" height="8" fill={C.rose} opacity=".7"/></svg>);
    case "wand": return (<svg viewBox="0 0 100 100" style={s}><line x1="40" y1="78" x2="64" y2="42" stroke="#A98ED0" strokeWidth="7" strokeLinecap="round"/><path d="M64 18 l6 16 l17 1 l-13 11 l4 17 l-14 -9 l-14 9 l4 -17 l-13 -11 l17 -1 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><circle cx="58" cy="34" r="3.5" fill="#fff" opacity=".85"/></svg>);
    case "crystal": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 14 L74 42 L50 86 L26 42 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 14 L50 86 M26 42 L74 42" stroke={stroke} strokeWidth="3"/><path d="M50 14 L74 42 L50 42 Z" fill="#E0CCF7"/><circle cx="44" cy="34" r="3" fill="#fff" opacity=".9"/></svg>);
    case "dress": return (<svg viewBox="0 0 100 100" style={s}><path d="M40 22 q10 8 20 0 l8 14 l-6 6 l4 42 q-16 8 -32 0 l4 -42 l-6 -6 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M34 84 q16 8 32 0" fill="none" stroke={stroke} strokeWidth="3"/><circle cx="50" cy="50" r="3" fill={C.gold}/><circle cx="50" cy="62" r="3" fill={C.gold}/><path d="M40 22 q10 8 20 0" fill="none" stroke="#fff" strokeWidth="3"/></svg>);
    case "boots": return (<svg viewBox="0 0 100 100" style={s}><path d="M38 16 h18 l3 44 l18 6 v14 h-39 q-6 -2 -6 -10 Z" fill={C.roseDeep} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><rect x="36" y="14" width="22" height="8" rx="4" fill={C.gold}/><circle cx="47" cy="40" r="2.5" fill={C.gold}/><circle cx="48" cy="52" r="2.5" fill={C.gold}/></svg>);
    case "cape": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 18 q22 0 30 10 q-6 50 -30 58 q-24 -8 -30 -58 q8 -10 30 -10 Z" fill={C.night} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M30 28 q20 -8 40 0" fill="none" stroke={C.gold} strokeWidth="4"/><circle cx="38" cy="24" r="4" fill={C.gold}/><circle cx="62" cy="24" r="4" fill={C.gold}/><path d="M44 30 q6 40 6 50 q0 -10 6 -50" fill="#4d3a86"/></svg>);
    case "necklace": return (<svg viewBox="0 0 100 100" style={s}><path d="M22 26 q28 34 56 0" fill="none" stroke={C.gold} strokeWidth="5" strokeLinecap="round"/><path d="M50 54 a13 13 0 1 1 0.1 0 Z" fill="none" stroke={C.gold} strokeWidth="4"/><path d="M50 50 a8 8 0 0 1 0 16 a8 8 0 0 1 0 -16Z" fill={C.lav} stroke={stroke} strokeWidth="3"/><circle cx="46" cy="56" r="2.5" fill="#fff"/></svg>);
    case "tiara": return (<svg viewBox="0 0 100 100" style={s}><path d="M18 64 L26 38 L40 56 L50 30 L60 56 L74 38 L82 64 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="30" r="5" fill={C.rose} stroke={stroke} strokeWidth="2.5"/><circle cx="26" cy="38" r="4" fill={C.mint} stroke={stroke} strokeWidth="2.5"/><circle cx="74" cy="38" r="4" fill={C.mint} stroke={stroke} strokeWidth="2.5"/><rect x="16" y="64" width="68" height="7" rx="3" fill={C.goldDeep}/></svg>);
    case "cat": return (<svg viewBox="0 0 100 100" style={s}><path d="M30 40 L24 22 L42 34 M70 40 L76 22 L58 34" fill={C.nightDeep} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><ellipse cx="50" cy="58" rx="26" ry="24" fill={C.nightDeep} stroke={stroke} strokeWidth={sw}/><path d="M40 56 q3 5 6 0 M54 56 q3 5 6 0" fill="none" stroke={C.gold} strokeWidth="3.5" strokeLinecap="round"/><path d="M46 66 q4 4 8 0" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round"/><circle cx="50" cy="63" r="2" fill={C.rose}/></svg>);
    case "moon": return (<svg viewBox="0 0 100 100" style={s}><path d="M64 18 a34 34 0 1 0 18 60 a26 26 0 1 1 -18 -60 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><path d="M44 40 l2 6 l6 .4 l-4.6 3.8 l1.5 5.8 l-4.9 -3 l-4.9 3 l1.5 -5.8 L33 46.4 l6 -.4 Z" fill="#fff" opacity=".9"/></svg>);
    case "wings": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 50 q-30 -28 -42 -8 q-4 22 18 26 q-10 12 4 18 q12 -6 20 -22Z" fill={C.mint} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 50 q30 -28 42 -8 q4 22 -18 26 q10 12 -4 18 q-12 -6 -20 -22Z" fill={C.rose} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M22 48 q14 4 20 14 M78 48 q-14 4 -20 14" fill="none" stroke="#fff" strokeWidth="3" opacity=".7"/></svg>);

    /* ---- にんぎょ マリン の アイテム ---- */
    case "m_shellclip": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 20 q26 6 26 40 q-26 10 -52 0 q0 -34 26 -40Z" fill="#FFD6E8" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 20 L50 60 M38 26 L42 58 M62 26 L58 58" stroke={stroke} strokeWidth="2.5" fill="none"/><circle cx="50" cy="66" r="5" fill={C.gold}/></svg>);
    case "m_pearlband": return (<svg viewBox="0 0 100 100" style={s}><path d="M14 52 q36 -30 72 0" fill="none" stroke="#3FB8AE" strokeWidth="7" strokeLinecap="round"/><circle cx="26" cy="42" r="6" fill="#FFF6F0" stroke={stroke} strokeWidth="2"/><circle cx="42" cy="34" r="6" fill="#FFF6F0" stroke={stroke} strokeWidth="2"/><circle cx="58" cy="34" r="6" fill="#FFF6F0" stroke={stroke} strokeWidth="2"/><circle cx="74" cy="42" r="6" fill="#FFF6F0" stroke={stroke} strokeWidth="2"/></svg>);
    case "m_starfishpin": return (<svg viewBox="0 0 100 100" style={s}>{[0,72,144,216,288].map(a=>(<ellipse key={a} cx="50" cy="28" rx="9" ry="20" fill="#FFB36B" stroke={stroke} strokeWidth={sw} transform={`rotate(${a} 50 50)`}/>))}<circle cx="50" cy="50" r="10" fill="#FFC97A" stroke={stroke} strokeWidth={sw}/><circle cx="44" cy="46" r="2.2" fill={stroke}/><circle cx="56" cy="46" r="2.2" fill={stroke}/></svg>);
    case "m_coralcrown": return (<svg viewBox="0 0 100 100" style={s}><path d="M20 66 q4 -30 14 -10 q6 -34 16 6 q10 -40 16 0 q10 -20 14 10 q4 14 -2 18 h-56 q-6 -4 -2 -18Z" fill="#FF9FA8" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="36" r="5" fill="#FFF6F0" stroke={stroke} strokeWidth="2"/><rect x="18" y="66" width="64" height="8" rx="4" fill="#3FB8AE"/></svg>);
    case "m_scaledress": return (<svg viewBox="0 0 100 100" style={s}><path d="M38 20 q12 8 24 0 l8 14 l-6 6 l4 42 q-18 8 -36 0 l4 -42 l-6 -6 Z" fill="#5FD6CB" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M36 56 a5 5 0 1 0 .1 0 M48 60 a5 5 0 1 0 .1 0 M60 56 a5 5 0 1 0 .1 0" fill="none" stroke="#3FB8AE" strokeWidth="2"/><path d="M38 20 q12 8 24 0" fill="none" stroke="#fff" strokeWidth="3"/></svg>);
    case "m_pearlcape": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 18 q22 0 30 10 q-6 50 -30 58 q-24 -8 -30 -58 q8 -10 30 -10 Z" fill="#BFEFF5" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="38" cy="26" r="4" fill="#fff" stroke={stroke} strokeWidth="1.5"/><circle cx="62" cy="26" r="4" fill="#fff" stroke={stroke} strokeWidth="1.5"/><path d="M44 30 q6 40 6 50 q0 -10 6 -50" fill="#8FE3EA"/></svg>);
    case "m_finanklet": return (<svg viewBox="0 0 100 100" style={s}><ellipse cx="50" cy="60" rx="22" ry="14" fill="none" stroke="#3FB8AE" strokeWidth="6"/><path d="M50 46 q10 -14 18 -6 q-4 10 -18 10Z" fill="#5FD6CB" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round"/><circle cx="32" cy="60" r="3" fill={C.gold}/></svg>);
    case "m_pearlanklet": return (<svg viewBox="0 0 100 100" style={s}><ellipse cx="50" cy="62" rx="24" ry="13" fill="none" stroke="#E0A8E8" strokeWidth="5"/>{[30,42,58,70].map((x,i)=>(<circle key={i} cx={x} cy="62" r="5" fill="#FFF6F0" stroke={stroke} strokeWidth="1.8"/>))}</svg>);
    case "m_trident": return (<svg viewBox="0 0 100 100" style={s}><line x1="50" y1="80" x2="50" y2="32" stroke="#3FB8AE" strokeWidth="6" strokeLinecap="round"/><path d="M50 32 l0 -16 M40 30 l-6 -16 M60 30 l6 -16" stroke="#3FB8AE" strokeWidth="5" strokeLinecap="round" fill="none"/><circle cx="50" cy="14" r="4" fill={C.gold}/><circle cx="34" cy="12" r="4" fill={C.gold}/><circle cx="66" cy="12" r="4" fill={C.gold}/></svg>);
    case "m_seacandy": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="22" fill="#8FE3EA" stroke={stroke} strokeWidth={sw}/><path d="M50 30 a20 20 0 0 1 18 12 M50 70 a20 20 0 0 0 -18 -12" fill="none" stroke="#FF9FC9" strokeWidth="6" strokeLinecap="round"/><path d="M72 50 l18 -10 v20 Z" fill="#3FB8AE" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M28 50 l-18 -10 v20 Z" fill="#3FB8AE" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>);
    case "m_pearl": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="54" r="26" fill="#FFF6F0" stroke={stroke} strokeWidth={sw}/><circle cx="40" cy="44" r="6" fill="#fff" opacity=".8"/><path d="M28 54 q22 -30 44 0" fill="none" stroke="#E8DCEE" strokeWidth="2" opacity=".5"/></svg>);
    case "m_shellbag": return (<svg viewBox="0 0 100 100" style={s}><path d="M30 42 q20 -20 40 0 l6 30 q-26 14 -52 0 Z" fill="#FFD6E8" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M40 42 q10 -12 20 0" fill="none" stroke={stroke} strokeWidth="3"/><circle cx="50" cy="58" r="4" fill={C.gold}/></svg>);
    case "m_pearlnecklace": return (<svg viewBox="0 0 100 100" style={s}><path d="M22 26 q28 34 56 0" fill="none" stroke="#3FB8AE" strokeWidth="3" strokeLinecap="round"/>{[34,46,58,68].map((x,i)=>(<circle key={i} cx={x} cy={26+ (i%2===0?14:18)} r="5" fill="#FFF6F0" stroke={stroke} strokeWidth="1.8"/>))}</svg>);
    case "m_moonshell": return (<svg viewBox="0 0 100 100" style={s}><path d="M64 18 a34 34 0 1 0 18 60 a26 26 0 1 1 -18 -60 Z" fill="#8FE3EA" stroke="#3FB8AE" strokeWidth={sw} strokeLinejoin="round"/><path d="M44 40 l2 6 l6 .4 l-4.6 3.8 l1.5 5.8 l-4.9 -3 l-4.9 3 l1.5 -5.8 L33 46.4 l6 -.4 Z" fill="#fff" opacity=".9"/></svg>);
    case "m_dolphin": return (<svg viewBox="0 0 100 100" style={s}><path d="M20 56 q10 -28 50 -20 q14 4 14 14 q-6 -2 -10 2 q6 4 4 10 q-8 -2 -12 2 q-30 8 -46 -8Z" fill="#7FC8E8" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="36" cy="52" r="2.5" fill={stroke}/><path d="M22 56 q-8 4 -10 12 q8 0 14 -6Z" fill="#5FA8D0" stroke={stroke} strokeWidth="2"/></svg>);
    case "m_bubblewings": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 50 q-30 -28 -42 -8 q-4 22 18 26 q-10 12 4 18 q12 -6 20 -22Z" fill="#BFEFF5" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 50 q30 -28 42 -8 q4 22 -18 26 q10 12 -4 18 q-12 -6 -20 -22Z" fill="#8FE3EA" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="30" cy="40" r="3" fill="#fff" opacity=".7"/><circle cx="70" cy="40" r="3" fill="#fff" opacity=".7"/></svg>);

    /* ---- プリンセス ロゼ の アイテム ---- */
    case "p_hairribbon": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 50 L18 32 q-8 18 0 36 Z" fill="#FFC2DA" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 50 L82 32 q8 18 0 36 Z" fill="#FFC2DA" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="50" r="10" fill={C.gold} stroke={stroke} strokeWidth={sw}/><circle cx="46" cy="46" r="3" fill="#fff"/></svg>);
    case "p_pearlpin": return (<svg viewBox="0 0 100 100" style={s}><line x1="30" y1="70" x2="70" y2="30" stroke={C.gold} strokeWidth="5" strokeLinecap="round"/><circle cx="70" cy="30" r="10" fill="#FFF6F0" stroke={stroke} strokeWidth="2.5"/><circle cx="66" cy="26" r="3" fill="#fff"/></svg>);
    case "p_flowercrown": return (<svg viewBox="0 0 100 100" style={s}><path d="M18 64 q32 -16 64 0" fill="none" stroke="#7FAE6A" strokeWidth="6" strokeLinecap="round"/>{[28,44,56,72].map((x,i)=>(<g key={i}>{[0,72,144,216,288].map(a=>(<ellipse key={a} cx={x} cy="50" rx="4" ry="7" fill="#FFC2DA" transform={`rotate(${a} ${x} 50)`}/>))}<circle cx={x} cy="50" r="3" fill={C.gold}/></g>))}</svg>);
    case "p_tiara": return (<svg viewBox="0 0 100 100" style={s}><path d="M18 64 L26 38 L40 56 L50 30 L60 56 L74 38 L82 64 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="30" r="5" fill="#FFC2DA" stroke={stroke} strokeWidth="2.5"/><circle cx="26" cy="38" r="4" fill="#FFF6F0" stroke={stroke} strokeWidth="2.5"/><circle cx="74" cy="38" r="4" fill="#FFF6F0" stroke={stroke} strokeWidth="2.5"/><rect x="16" y="64" width="68" height="7" rx="3" fill={C.goldDeep}/></svg>);
    case "p_balldress": return (<svg viewBox="0 0 100 100" style={s}><path d="M36 28 q14 8 28 0 l10 14 q-24 14 -48 0 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="2.5"/><path d="M22 86 q28 -34 56 0 q-28 12 -56 0Z" fill="#FFC2DA" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 42 q22 14 22 44" fill="none" stroke="#fff" strokeWidth="2" opacity=".5"/></svg>);
    case "p_cape": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 18 q22 0 30 10 q-6 50 -30 58 q-24 -8 -30 -58 q8 -10 30 -10 Z" fill="#FFC2DA" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M30 28 q20 -8 40 0" fill="none" stroke={C.gold} strokeWidth="4"/><circle cx="38" cy="24" r="4" fill={C.gold}/><circle cx="62" cy="24" r="4" fill={C.gold}/></svg>);
    case "p_lacesocks": return (<svg viewBox="0 0 100 100" style={s}><path d="M40 18 h18 v34 q0 14 -14 18 l-12 6 q-10 -4 -8 -14 l10 -6 q6 -2 6 -10 Z" fill="#FFF6F0" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M38 18 q22 6 22 0 M38 26 q22 6 22 0 M38 34 q22 6 22 0" stroke="#E0A8C8" strokeWidth="2" fill="none"/></svg>);
    case "p_glassshoes": return (<svg viewBox="0 0 100 100" style={s}><path d="M28 62 q4 -14 18 -14 q14 0 22 10 l14 6 q4 8 -4 10 h-44 q-8 -2 -6 -12Z" fill="#D8F0FF" stroke="#7AA8FF" strokeWidth={sw} strokeLinejoin="round"/><circle cx="40" cy="56" r="3" fill="#fff"/></svg>);
    case "p_wand": return (<svg viewBox="0 0 100 100" style={s}><line x1="40" y1="78" x2="64" y2="42" stroke="#FFC2DA" strokeWidth="7" strokeLinecap="round"/><path d="M64 18 l6 16 l17 1 l-13 11 l4 17 l-14 -9 l-14 9 l4 -17 l-13 -11 l17 -1 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/></svg>);
    case "p_candy": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="22" fill="#FFC2DA" stroke={stroke} strokeWidth={sw}/><path d="M50 30 a20 20 0 0 1 18 12 M50 70 a20 20 0 0 0 -18 -12" fill="none" stroke={C.gold} strokeWidth="6" strokeLinecap="round"/><path d="M72 50 l18 -10 v20 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M28 50 l-18 -10 v20 Z" fill={C.lav} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/></svg>);
    case "p_rose": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="42" r="16" fill="#E8556F" stroke={stroke} strokeWidth="3"/><circle cx="50" cy="42" r="9" fill="#FF7E96" stroke={stroke} strokeWidth="2"/><path d="M50 58 q-4 20 0 30 M50 70 q8 -4 12 -2 M50 76 q-8 -2 -12 2" stroke="#7FAE6A" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>);
    case "p_mirror": return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="44" r="24" fill="#D8F0FF" stroke={C.gold} strokeWidth="5"/><rect x="44" y="64" width="12" height="26" rx="4" fill={C.gold}/><circle cx="42" cy="36" r="5" fill="#fff" opacity=".8"/></svg>);
    case "p_necklace": return (<svg viewBox="0 0 100 100" style={s}><path d="M22 26 q28 34 56 0" fill="none" stroke={C.gold} strokeWidth="5" strokeLinecap="round"/><path d="M50 54 a13 13 0 1 1 0.1 0 Z" fill="none" stroke={C.gold} strokeWidth="4"/><circle cx="50" cy="58" r="8" fill="#FFC2DA" stroke={stroke} strokeWidth="2.5"/></svg>);
    case "p_moon": return (<svg viewBox="0 0 100 100" style={s}><path d="M64 18 a34 34 0 1 0 18 60 a26 26 0 1 1 -18 -60 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth={sw} strokeLinejoin="round"/><path d="M44 40 l2 6 l6 .4 l-4.6 3.8 l1.5 5.8 l-4.9 -3 l-4.9 3 l1.5 -5.8 L33 46.4 l6 -.4 Z" fill="#fff" opacity=".9"/></svg>);
    case "p_kitten": return (<svg viewBox="0 0 100 100" style={s}><path d="M30 40 L24 22 L42 34 M70 40 L76 22 L58 34" fill="#FFE3D2" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><ellipse cx="50" cy="58" rx="26" ry="24" fill="#FFE3D2" stroke={stroke} strokeWidth={sw}/><path d="M40 56 q3 5 6 0 M54 56 q3 5 6 0" fill="none" stroke="#C0568A" strokeWidth="3.5" strokeLinecap="round"/><path d="M46 66 q4 4 8 0" fill="none" stroke="#C0568A" strokeWidth="3" strokeLinecap="round"/><circle cx="50" cy="63" r="2" fill={C.rose}/></svg>);
    case "p_angelwings": return (<svg viewBox="0 0 100 100" style={s}><path d="M50 50 q-30 -28 -42 -8 q-4 22 18 26 q-10 12 4 18 q12 -6 20 -22Z" fill="#fff" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><path d="M50 50 q30 -28 42 -8 q4 22 -18 26 q10 12 -4 18 q-12 -6 -20 -22Z" fill="#F5F0FF" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/><circle cx="50" cy="46" r="4" fill={C.gold}/></svg>);

    default: return (<svg viewBox="0 0 100 100" style={s}><circle cx="50" cy="50" r="30" fill={C.lav}/></svg>);
  }
}

/* ============ かたまりを かぞえる ミニアイテム＆グループ絵 ============ */
function MiniItem({ type, size = 16 }) {
  const st = { width: size, height: size, display: "block" };
  if (type === "flower") return (<svg viewBox="0 0 24 24" style={st}>{[0,72,144,216,288].map(a=>(<ellipse key={a} cx="12" cy="6" rx="3" ry="4.6" fill={C.rose} transform={`rotate(${a} 12 12)`}/>))}<circle cx="12" cy="12" r="3" fill={C.gold}/></svg>);
  if (type === "cookie") return (<svg viewBox="0 0 24 24" style={st}><circle cx="12" cy="12" r="9" fill="#D9A05B" stroke="#B07a3c" strokeWidth="1.5"/><circle cx="9" cy="9" r="1.5" fill="#5b3a1e"/><circle cx="15" cy="11" r="1.5" fill="#5b3a1e"/><circle cx="11" cy="15" r="1.5" fill="#5b3a1e"/></svg>);
  if (type === "candy")  return (<svg viewBox="0 0 24 24" style={st}><circle cx="12" cy="12" r="6" fill={C.mint} stroke={C.plum} strokeWidth="1"/><path d="M3 12 l-2 -3 v6 Z" fill={C.lav}/><path d="M21 12 l2 -3 v6 Z" fill={C.lav}/></svg>);
  return (<svg viewBox="0 0 24 24" style={st}><path d="M12 2 l2.6 6.3 l6.8 .5 l-5.2 4.4 l1.7 6.6 L12 16.7 l-5.9 3.6 l1.7 -6.6 L2.6 9.3 l6.8 -.5 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="1"/></svg>);
}
function GroupVisual({ a, b, scene, view }) {
  return (
    <div className="kk-groups">
      {Array.from({ length: a }).map((_, gi) => (
        <div key={gi} className="kk-group-card" style={{ background: scene.color }}>
          {view === "dots"
            ? <div className="kk-dots">{Array.from({ length: b }).map((_, i) => <MiniItem key={i} type={scene.item} size={15} />)}</div>
            : <div className="kk-badge"><MiniItem type={scene.item} size={20} /><span>{b}</span></div>}
        </div>
      ))}
    </div>
  );
}

/* ---- たしざん：2つの かたまりが あつまる ようす ---- */
function TwoClusterVisual({ a, b, scene }) {
  return (
    <div className="kk-twocluster">
      <div className="kk-cluster-box" style={{ background: scene.color }}>
        {Array.from({ length: a }).map((_, i) => <MiniItem key={i} type={scene.item} size={17} />)}
      </div>
      <div className="kk-cluster-op">＋</div>
      <div className="kk-cluster-box" style={{ background: scene.color }}>
        {Array.from({ length: b }).map((_, i) => <MiniItem key={i} type={scene.item} size={17} />)}
      </div>
    </div>
  );
}

/* ---- ひきざん：とった分に ×を つける ようす ---- */
function CrossOutVisual({ a, b, scene }) {
  return (
    <div className="kk-cluster-box kk-crossout-box" style={{ background: scene.color }}>
      {Array.from({ length: a }).map((_, i) => (
        <div key={i} className={"kk-crossout-item" + (i < b ? " kk-crossed" : "")}>
          <MiniItem type={scene.item} size={17} />
        </div>
      ))}
    </div>
  );
}

/* ---- 10づくり：あといくつで 10こに なるか ---- */
function FillToTenVisual({ a, scene }) {
  return (
    <div className="kk-cluster-box kk-fillten-box" style={{ background: scene.color }}>
      {Array.from({ length: 10 }).map((_, i) => (
        i < a
          ? <div key={i} className="kk-fillten-item"><MiniItem type={scene.item} size={17} /></div>
          : <div key={i} className="kk-fillten-slot" />
      ))}
    </div>
  );
}

/* ---- 5の まとまりと のこり ---- */
function FiveFrame({ n }) {
  const filled = Math.min(n, 5);
  const rest = Math.max(n - 5, 0);
  return (
    <div className="kk-fiveframe">
      <div className="kk-fiveframe-row">
        {Array.from({ length: 5 }).map((_, i) => (
          i < filled
            ? <span key={i} className="kk-fiveframe-dot kk-fiveframe-dot-main" />
            : <span key={i} className="kk-fiveframe-dot kk-fiveframe-dot-empty" />
        ))}
      </div>
      {rest > 0 && (
        <div className="kk-fiveframe-row kk-fiveframe-row2">
          {Array.from({ length: rest }).map((_, i) => (
            <span key={i} className="kk-fiveframe-dot kk-fiveframe-dot-extra" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================ まほうのメモ（九九一覧） ================== */
function MagicMemo({ q, onClose }) {
  const dan = q ? q.a : null;
  const col = q ? q.b : null;
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [dan, col]);

  return (
    <div className="kk-memo-backdrop" onClick={onClose} role="dialog" aria-label="まほうのメモ">
      <div className="kk-memo-sheet" onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="kk-memo-head">
          <div className="kk-memo-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 3 q6-3 12 0 v15 q-6-3-12 0 Z" fill="#C9A8F0" stroke="#7A5C98" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6 3 v15 M18 3 v15" stroke="#7A5C98" strokeWidth="1" strokeDasharray="2 3"/>
              <circle cx="12" cy="10" r="2.5" fill="#FFC94D"/>
            </svg>
            まほうのメモ
          </div>
          <button className="kk-memo-close" onClick={onClose} aria-label="とじる">✕ とじる</button>
        </div>

        {/* ── 今のもんだいカード（常に見える） ── */}
        {q && (
          <div className="kk-memo-qcard" style={{ background: q.scene.color }}>
            <div className="kk-memo-qlabel">今のもんだい 📌</div>
            <div className="kk-memo-qtext">{q.scene.ask(q.a, q.b)}</div>
            <div className="kk-memo-qrow">
              {/* ミニグループ絵（バッジ形式で横並び） */}
              <div className="kk-memo-qgroups">
                {Array.from({ length: q.a }).map((_, gi) => (
                  <div key={gi} className="kk-memo-qgroup">
                    <MiniItem type={q.scene.item} size={18} />
                    <span className="kk-memo-qcount">×{q.b}</span>
                  </div>
                ))}
              </div>
              <div className="kk-memo-qans">ぜんぶで <b>？</b></div>
            </div>
          </div>
        )}

        {/* 凡例 */}
        <div className="kk-memo-legend">
          <span className="kk-leg-row">たての れつ</span>
          <span className="kk-leg-col">よこの れつ</span>
          <span className="kk-leg-cross">かさなる ところ</span>
        </div>

        {/* 九九テーブル */}
        <div className="kk-memo-body">
          <div className="kk-memo-colhead">
            <div className="kk-memo-danlabel" />
            {[1,2,3,4,5,6,7,8,9].map(b => (
              <div key={b} className={"kk-memo-colnum" + (b === col ? " kk-memo-colhi" : "")}>{b}</div>
            ))}
          </div>
          {[1,2,3,4,5,6,7,8,9].map(a => {
            const rowHi = a === dan;
            return (
              <div key={a} className={"kk-memo-row" + (rowHi ? " kk-memo-rowhi" : "")}>
                <div className="kk-memo-danlabel">
                  {rowHi && <span className="kk-memo-arrow">▶</span>}
                  {a}
                </div>
                {[1,2,3,4,5,6,7,8,9].map(b => {
                  const colHi = b === col;
                  const isCross = rowHi && colHi;
                  let cls = "kk-memo-cell";
                  if (isCross) cls += " kk-cell-cross" + (flash ? " kk-cell-flash" : "");
                  else if (rowHi) cls += " kk-cell-row";
                  else if (colHi) cls += " kk-cell-col";
                  return <div key={b} className={cls}>{a*b}</div>;
                })}
              </div>
            );
          })}
        </div>

        <div className="kk-memo-footer">たての れつと よこの れつが かさなる ところを みつけよう！</div>
      </div>
    </div>
  );
}

/* ============================ ひっさんメモ（くりあがり／くりさがり） ===== */
function ColumnMemo({ q, onClose }) {
  if (!q) return null;
  const isAdd = q.gameType === "addCarry";
  const a = q.a, b = q.b;
  const onesA = a % 10;
  return (
    <div className="kk-memo-backdrop" onClick={onClose} role="dialog" aria-label="ひっさんメモ">
      <div className="kk-memo-sheet kk-colmemo-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="kk-memo-head">
          <div className="kk-memo-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 3 q6-3 12 0 v15 q-6-3-12 0 Z" fill="#C9A8F0" stroke="#7A5C98" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M6 3 v15 M18 3 v15" stroke="#7A5C98" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx="12" cy="10" r="2.5" fill="#FFC94D" />
            </svg>
            ひっさんメモ
          </div>
          <button className="kk-memo-close" onClick={onClose} aria-label="とじる">✕ とじる</button>
        </div>

        <div className="kk-colmemo-body">
          {isAdd ? (
            <>
              <div className="kk-fivesplit-row">
                <div className="kk-fivesplit-block">
                  <FiveFrame n={a} />
                  <div className="kk-fivesplit-label">{a >= 5 ? <>5 と <b>{a - 5}</b></> : a}</div>
                </div>
                <div className="kk-fivesplit-plus">＋</div>
                <div className="kk-fivesplit-block">
                  <FiveFrame n={b} />
                  <div className="kk-fivesplit-label">{b >= 5 ? <>5 と <b>{b - 5}</b></> : b}</div>
                </div>
              </div>
              <div className="kk-colmemo-caption kk-fivesplit-caption">
                5の まとまりが 2つ あつまると、<b>10</b>に なるよ！
              </div>

              <div className="kk-col-grid">
                <div className="kk-col-row kk-col-carryrow">
                  <div className="kk-col-cell kk-col-blank" />
                  <div className="kk-col-cell kk-col-carryval kk-col-flash">1</div>
                </div>
                <div className="kk-col-row">
                  <div className="kk-col-cell kk-col-blank" />
                  <div className="kk-col-cell">{a}</div>
                </div>
                <div className="kk-col-row">
                  <div className="kk-col-cell kk-col-op">＋</div>
                  <div className="kk-col-cell">{b}</div>
                </div>
                <div className="kk-col-line" />
                <div className="kk-col-row kk-col-answer">
                  <div className="kk-col-cell">1</div>
                  <div className="kk-col-cell kk-col-mystery">？</div>
                </div>
              </div>
              <div className="kk-colmemo-caption">
                {a} と {b} を たすと <b>10</b> を こえるよ。<br />
                じゅうのくらいに <b>1</b> くりあがる！<br />
                いちのくらいの こたえを かんがえよう。
              </div>
            </>
          ) : (
            <>
              <div className="kk-col-grid">
                <div className="kk-col-row kk-col-borrowrow">
                  <div className="kk-col-cell kk-col-strike kk-col-flash">1<span className="kk-col-small">0</span></div>
                  <div className="kk-col-cell kk-col-strike kk-col-flash">{onesA}<span className="kk-col-small">{a}</span></div>
                </div>
                <div className="kk-col-row">
                  <div className="kk-col-cell kk-col-op">－</div>
                  <div className="kk-col-cell">{b}</div>
                </div>
                <div className="kk-col-line" />
                <div className="kk-col-row kk-col-answer">
                  <div className="kk-col-cell kk-col-blank" />
                  <div className="kk-col-cell kk-col-mystery">？</div>
                </div>
              </div>
              <div className="kk-colmemo-caption">
                じゅうのくらいから <b>10</b> かりてくるよ。<br />
                いちのくらいは {onesA} → <b>{a}</b> に なるよ。<br />
                {a} － {b} を かんがえよう。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ 主人公の せんたくし ============ */
const CHARACTERS = [
  { id: "witch",    charaName: "ルナ",   label: "まじょ",     title: "まほうの おしゃれ",       sub: "ふしぎな まほうの アイテムを あつめよう",   Comp: Witch,    ratio: 180 / 160, accent: "#C9A8F0" },
  { id: "mermaid",  charaName: "マリン", label: "にんぎょ",   title: "うみの たからの おしゃれ", sub: "うみの なかの たからものを あつめよう",     Comp: Mermaid,  ratio: 190 / 160, accent: "#5FD6CB" },
  { id: "princess", charaName: "ロゼ",   label: "プリンセス", title: "おしろの おしゃれ",         sub: "おしろに ぴったりな ドレスを あつめよう",   Comp: Princess, ratio: 190 / 160, accent: "#FFC2DA" },
];

/* ============ きせかえ：アイテムをまとった しゅじんこう ============ */
const EQUIP_POS = {
  head:   { top: "1%",  left: "70%" },
  acc:    { top: "30%", left: "90%" },
  outfit: { top: "52%", left: "50%" },
  hold:   { top: "62%", left: "10%" },
  feet:   { top: "92%", left: "40%" },
};
function DressedCharacter({ character = "witch", mood = "idle", size = 150, equipped = {} }) {
  const CHAR = CHARACTERS.find((c) => c.id === character) || CHARACTERS[0];
  const Comp = CHAR.Comp;
  const slots = SLOT_DEFS_BY_CHAR[character] || SLOT_DEFS_BY_CHAR.witch;
  const h = size * CHAR.ratio;
  const badge = Math.max(26, size * 0.24);
  return (
    <div style={{ position: "relative", width: size, height: h }}>
      <Comp mood={mood} size={size} />
      {slots.map((slot) => {
        const itemId = equipped[slot.key];
        if (!itemId) return null;
        const pos = EQUIP_POS[slot.key];
        return (
          <div key={slot.key} className="kk-equip-badge" style={{ top: pos.top, left: pos.left, width: badge, height: badge }}>
            <ItemIcon id={itemId} size={badge * 0.68} />
          </div>
        );
      })}
    </div>
  );
}

/* ============ ものがたりの たっせい イベント ============ */
const STORY_MILESTONES = [
  { id: "castle",   count: 4,  scene: "castle",   title: "🏰 おしろへの しょうたい",
    text: (name) => `${name}に、おしろから しょうたいじょうが とどいたよ！`, bonus: 25 },
  { id: "ball",     count: 8,  scene: "ball",     title: "💃 ぶとうかい",
    text: (name) => `${name}は ぶとうかいに さんか できるように なったよ！`, bonus: 25 },
  { id: "villain",  count: 12, scene: "villain",  title: "⚔️ さいごの たたかい",
    text: (name) => `${name}は わるものを たいじする ことが できたよ！`, bonus: 25 },
  { id: "complete", count: 16, scene: "complete", title: "👑 ものがたり かんせい！",
    text: (name) => `${name}の おしゃれが ぜんぶ あつまったよ！`, bonus: 50 },
];

const STAGE_LABEL = {
  castle:   "🏰 おしろへの とちゅう",
  ball:     "💃 ぶとうかいの じゅんび",
  villain:  "⚔️ さいごの たたかいへ",
  complete: "👑 ものがたり かんせい",
};

function MilestoneScene({ type }) {
  if (type === "castle") {
    return (
      <svg viewBox="0 0 280 160" width="100%" height="160" style={{ display: "block" }}>
        <defs>
          <linearGradient id="kkSkyCastle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFB7D5" /><stop offset="100%" stopColor="#C9A8F0" />
          </linearGradient>
        </defs>
        <rect width="280" height="160" fill="url(#kkSkyCastle)" />
        {[[30,20],[78,14],[210,22],[252,38],[18,46]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.9" />))}
        <path d="M0 142 Q70 116 140 138 T280 128 V160 H0 Z" fill="#F0D8F7" />
        <rect x="100" y="82" width="80" height="58" fill="#FFF3F9" />
        <rect x="88" y="60" width="22" height="42" fill="#FFE7F1" />
        <rect x="170" y="60" width="22" height="42" fill="#FFE7F1" />
        <rect x="129" y="48" width="22" height="52" fill="#FFE7F1" />
        <path d="M88 60 l11 -15 l11 15Z" fill="#E85FA3" /><path d="M170 60 l11 -15 l11 15Z" fill="#E85FA3" /><path d="M129 48 l11 -15 l11 15Z" fill="#E85FA3" />
        <rect x="132" y="104" width="16" height="22" rx="8" fill="#7A5C98" />
        <circle cx="99" cy="80" r="2.4" fill={C.gold} /><circle cx="181" cy="80" r="2.4" fill={C.gold} /><circle cx="140" cy="68" r="2.4" fill={C.gold} />
      </svg>
    );
  }
  if (type === "ball") {
    return (
      <svg viewBox="0 0 280 160" width="100%" height="160" style={{ display: "block" }}>
        <defs>
          <linearGradient id="kkSkyBall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE3B0" /><stop offset="100%" stopColor="#FFC2DA" />
          </linearGradient>
        </defs>
        <rect width="280" height="160" fill="url(#kkSkyBall)" />
        <path d="M140 14 v14 M120 30 q20 -14 40 0" fill="none" stroke={C.goldDeep} strokeWidth="2" />
        <path d="M104 30 q36 -22 72 0 q-6 16 -36 16 q-30 0 -36 -16Z" fill="#FFF6E0" stroke={C.goldDeep} strokeWidth="1.5" />
        {[112,128,144,160,176].map((x,i)=>(<circle key={i} cx={x} cy="34" r="3" fill={C.gold} />))}
        {[[40,50],[230,60],[60,90],[210,40],[26,100],[250,95]].map(([x,y],i)=>(
          <path key={i} d={`M${x} ${y-5} L${x+2.5} ${y} L${x+5} ${y} L${x+2} ${y+2} L${x+3} ${y+5} L${x} ${y+3} L${x-3} ${y+5} L${x-2} ${y+2} L${x-5} ${y} L${x-2.5} ${y} Z`} fill={C.gold} opacity="0.85" />
        ))}
        <path d="M0 152 H280 V160 H0 Z" fill="#fff" opacity="0.5" />
        <path d="M0 152 H280" stroke="#E0A8C8" strokeWidth="1" />
      </svg>
    );
  }
  if (type === "villain") {
    return (
      <svg viewBox="0 0 280 160" width="100%" height="160" style={{ display: "block" }}>
        <defs>
          <linearGradient id="kkSkyVillain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2A6B" /><stop offset="100%" stopColor="#7A5C98" />
          </linearGradient>
        </defs>
        <rect width="280" height="160" fill="url(#kkSkyVillain)" />
        <path d="M170 40 q40 0 50 40 q4 24 -16 34 q4 -14 -8 -20 q2 12 -10 16 q0 -12 -10 -14 q-2 10 -12 10 q4 -10 -4 -16 q-18 4 -22 -10 q24 -2 22 -20 q-22 4 -28 -8 q22 -10 38 -12Z" fill="#241848" opacity="0.9" />
        <circle cx="206" cy="58" r="3.4" fill="#FFC94D" /><circle cx="222" cy="58" r="3.4" fill="#FFC94D" />
        <path d="M195 70 q14 8 28 0" stroke="#FFC94D" strokeWidth="2" fill="none" />
        <path d="M120 70 l24 -16 l-8 24 l24 -8 l-30 26 l10 -28 l-22 10Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="2" strokeLinejoin="round" />
        {[[40,30],[60,110],[230,100],[20,80]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity="0.6" />))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 280 160" width="100%" height="160" style={{ display: "block" }}>
      <defs>
        <linearGradient id="kkSkyComplete" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3C9" /><stop offset="100%" stopColor="#FFC2DA" />
        </linearGradient>
      </defs>
      <rect width="280" height="160" fill="url(#kkSkyComplete)" />
      {[[30,124,"#FF9FC9"],[60,40,C.gold],[100,130,"#7DE0C8"],[150,36,"#C9A8F0"],[190,124,C.gold],[230,44,"#FF9FC9"],[250,118,"#7DE0C8"]].map(([x,y,col],i)=>(
        <rect key={i} x={x} y={y} width="7" height="11" rx="2" fill={col} transform={`rotate(${(i*37)%60-30} ${x} ${y})`} opacity="0.9" />
      ))}
      <path d="M110 70 L130 30 L140 55 L150 28 L160 55 L170 30 L190 70 Z" fill={C.gold} stroke={C.goldDeep} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="150" cy="30" r="5" fill="#FFC2DA" stroke={C.goldDeep} strokeWidth="2" />
      <rect x="108" y="70" width="84" height="9" rx="3" fill={C.goldDeep} />
      {[[50,90],[230,90]].map(([x,y],i)=>(
        <g key={i}>
          <path d={`M${x} ${y} l0 -22 M${x} ${y} l16 -14 M${x} ${y} l-16 -14 M${x} ${y} l20 4 M${x} ${y} l-20 4`} stroke={C.rose} strokeWidth="2" opacity="0.8" />
        </g>
      ))}
    </svg>
  );
}

/* ---- れんしゅう画面の さりげない 背景（たっせいに応じて 雰囲気が変わる） ---- */
function PracticeBackdrop({ stage }) {
  if (!stage) return null;
  if (stage === "castle") {
    return (
      <svg className="kk-bg-deco" viewBox="0 0 320 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 220 L0 178 L18 178 L18 160 L36 160 L36 178 L54 178 L54 140 L66 122 L78 140 L78 178 L112 178 L112 150 L134 150 L134 178 L168 178 L168 130 L186 108 L204 130 L204 178 L238 178 L238 162 L260 162 L260 178 L284 178 L284 168 L304 168 L304 178 L320 178 L320 220 Z" fill="rgba(255,255,255,.06)" />
        <circle cx="66" cy="150" r="2.2" fill="#FFC94D" opacity="0.8" />
        <circle cx="186" cy="138" r="2.2" fill="#FFC94D" opacity="0.8" />
        <circle cx="260" cy="170" r="2" fill="#FFC94D" opacity="0.7" />
      </svg>
    );
  }
  if (stage === "ball") {
    return (
      <svg className="kk-bg-deco" viewBox="0 0 320 220" aria-hidden="true">
        <ellipse cx="160" cy="6" rx="80" ry="22" fill="rgba(255,201,77,.13)" />
        {[[36,30],[280,40],[60,90],[250,70],[24,130],[296,110],[150,20],[210,150],[90,170]].map(([x,y],i)=>(
          <path key={i} d={`M${x} ${y-4} L${x+2} ${y} L${x+4} ${y} L${x+1.5} ${y+1.5} L${x+2} ${y+4} L${x} ${y+2} L${x-2} ${y+4} L${x-1.5} ${y+1.5} L${x-4} ${y} L${x-2} ${y} Z`} fill="#FFD66B" opacity="0.55" />
        ))}
      </svg>
    );
  }
  if (stage === "villain") {
    return (
      <svg className="kk-bg-deco" viewBox="0 0 320 220" aria-hidden="true">
        <defs>
          <radialGradient id="kkVignette" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="rgba(120,30,60,0)" /><stop offset="100%" stopColor="rgba(120,20,50,.28)" />
          </radialGradient>
        </defs>
        <rect width="320" height="220" fill="url(#kkVignette)" />
        <path d="M250 30 q26 0 32 26 q2 14 -10 20 q2 -8 -6 -12 q0 8 -8 10 q0 -8 -8 -8 q-2 6 -8 6 q2 -6 -2 -10 q-12 2 -14 -8 q14 -2 12 -14 q-14 2 -18 -6 q14 -6 30 -4Z" fill="rgba(36,24,72,.45)" />
        <circle cx="258" cy="42" r="2" fill="#FFC94D" opacity="0.7" /><circle cx="270" cy="42" r="2" fill="#FFC94D" opacity="0.7" />
      </svg>
    );
  }
  // complete
  return (
    <svg className="kk-bg-deco" viewBox="0 0 320 220" aria-hidden="true">
      <ellipse cx="160" cy="0" rx="160" ry="50" fill="rgba(255,201,77,.14)" />
      {[[40,30,"#FF9FC9"],[80,160,C.gold],[140,24,"#7DE0C8"],[200,150,"#C9A8F0"],[260,30,C.gold],[290,160,"#FF9FC9"],[20,110,"#7DE0C8"]].map(([x,y,col],i)=>(
        <rect key={i} x={x} y={y} width="6" height="10" rx="2" fill={col} opacity="0.6" transform={`rotate(${(i*41)%50-25} ${x} ${y})`} />
      ))}
    </svg>
  );
}

function MilestoneModal({ milestone, character, equipped, onClose }) {
  if (!milestone) return null;
  const CHAR = CHARACTERS.find((c) => c.id === character) || CHARACTERS[0];
  return (
    <div className="kk-modal" onClick={onClose}>
      <div className="kk-milestone-card" onClick={(e) => e.stopPropagation()}>
        <div className="kk-milestone-title">{milestone.title}</div>
        <div className="kk-milestone-stage">
          <MilestoneScene type={milestone.scene} />
          <div className="kk-milestone-char">
            <DressedCharacter character={character} mood="happy" size={84} equipped={equipped} />
          </div>
        </div>
        <div className="kk-milestone-text">{milestone.text(CHAR.charaName)}</div>
        <div className="kk-milestone-bonus">★ ＋{milestone.bonus} ボーナス！</div>
        <button className="kk-big-btn" onClick={onClose}>やったね！</button>
      </div>
    </div>
  );
}

/* ============================ メイン ==================================== */
export default function App() {
  const [screen, setScreen] = useState("title");        // title | mode | play | collection
  const [gameType, setGameType] = useState("kuku");      // kuku | addCarry | subBorrow | make10
  const [mode, setMode] = useState("mix");
  const [q, setQ] = useState(null);
  const [phase, setPhase] = useState("ask");            // ask | right | wrong
  const [picked, setPicked] = useState(null);
  const [stardust, setStardust] = useState(0);
  const [collection, setCollection] = useState({});     // { charId: { itemId: count } }
  const [mastery, setMastery] = useState({});
  const [lastWrong, setLastWrong] = useState(null);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0, best: 0, shines: 0 });
  const [sound, setSound] = useState(true);
  const [reveal, setReveal] = useState(null);           // {item, dup}
  const [pulls, setPulls] = useState(0);
  const [sparkles, setSparkles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [moonHi, setMoonHi] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDan, setShowDan] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [showColumnMemo, setShowColumnMemo] = useState(false);
  const [equipped, setEquipped] = useState({});         // { charId: { slotKey: itemId } }
  const [activeSlot, setActiveSlot] = useState(null);
  const [seenMilestones, setSeenMilestones] = useState({}); // { charId: [milestoneId, ...] }
  const [pendingMilestone, setPendingMilestone] = useState(null);
  const [storyMilestone, setStoryMilestone] = useState(null);
  const afterMilestoneRef = useRef(null); // 'dressup' | null
  const [exportCode, setExportCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [characterId, setCharacterId] = useState(null); // witch | mermaid | princess

  /* ---- load save ---- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (typeof window !== "undefined" && storage) {
          const r = await storage.get(SAVE_KEY);
          if (!cancel && r && r.value) {
            const d = JSON.parse(r.value);
            setStardust(d.stardust || 0);
            setCollection(d.collection || {});
            setMastery(d.mastery || {});
            setStats(d.stats || { correct: 0, total: 0, best: 0, shines: 0 });
            if (typeof d.sound === "boolean") setSound(d.sound);
            setEquipped(d.equipped || {});
            setSeenMilestones(d.seenMilestones || {});
            if (d.character) setCharacterId(d.character);
          }
        }
      } catch (e) { /* ignore -> in-memory */ }
      if (!cancel) setLoaded(true);
    })();
    return () => { cancel = true; };
  }, []);

  /* ---- persist ---- */
  const persist = useCallback((patch) => {
    if (typeof window === "undefined" || !storage) return;
    const data = { stardust, collection, mastery, stats, sound, equipped, character: characterId, seenMilestones, ...patch };
    try { storage.set(SAVE_KEY, JSON.stringify(data)); } catch (e) {}
  }, [stardust, collection, mastery, stats, sound, equipped, characterId, seenMilestones]);

  /* ---- 現在の主人公に応じた データ ---- */
  const charKey = characterId || "witch";
  const myItems = ITEMS_BY_CHAR[charKey] || WITCH_ITEMS;
  const mySlots = SLOT_DEFS_BY_CHAR[charKey] || SLOT_DEFS_BY_CHAR.witch;
  const myCollection = collection[charKey] || {};
  const myEquipped = equipped[charKey] || {};
  const collectedCount = Object.keys(myCollection).length;
  const allDone = collectedCount >= myItems.length;
  const myAchievedMilestones = STORY_MILESTONES.filter((ms) => (seenMilestones[charKey] || []).includes(ms.id));
  const sceneStage = myAchievedMilestones.length ? myAchievedMilestones[myAchievedMilestones.length - 1].scene : null;

  const nextQuestion = useCallback(() => {
    setQ(generateQuestion(gameType, mode, mastery, lastWrong));
    setPicked(null);
    setShowHint(false);
    setShowColumnMemo(false);
    setPhase("ask");
  }, [gameType, mode, mastery, lastWrong]);

  const startGame = (gt, m) => {
    if (ac()) ac().resume && ac().resume();
    SFX.tap(sound);
    setGameType(gt);
    const useMode = gt === "kuku" ? (m || "mix") : null;
    if (gt === "kuku") setMode(useMode);
    setScreen("play");
    setStreak(0);
    setQ(generateQuestion(gt, useMode, mastery, lastWrong));
    setPicked(null);
    setShowHint(false);
    setShowColumnMemo(false);
    setPhase("ask");
  };

  const spawnSparkles = () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: Date.now() + i,
      left: 8 + Math.random() * 84,
      delay: Math.random() * 0.25,
      dur: 0.9 + Math.random() * 0.6,
      size: 12 + Math.random() * 16,
    }));
    setSparkles(items);
    setTimeout(() => setSparkles([]), 1700);
  };

  const doPull = useCallback(() => {
    const uncollected = myItems.filter((it) => !myCollection[it.id]);
    let item, dup = false;
    if (uncollected.length === 0) {
      item = myItems[(Math.random() * myItems.length) | 0];
      dup = true;
    } else {
      const weights = uncollected.map((it) => RARITY[it.rarity].weight);
      item = uncollected[weightedIndex(weights)];
    }
    SFX.reveal(sound);
    setReveal({ item, dup, isNew: !dup });
    if (dup) {
      setStats((s) => { const ns = { ...s, shines: s.shines + 1 }; persist({ stats: ns }); return ns; });
      setStardust((v) => { const nv = v + 20; persist({ stardust: nv }); return nv; });
    } else {
      const charColl = { ...myCollection, [item.id]: (myCollection[item.id] || 0) + 1 };
      const nc = { ...collection, [charKey]: charColl };

      const newCount = Object.keys(charColl).length;
      const seenForChar = seenMilestones[charKey] || [];
      const hit = STORY_MILESTONES.find((ms) => ms.count === newCount && !seenForChar.includes(ms.id));

      let nsm = seenMilestones;
      let newStardust = stardust;
      if (hit) {
        nsm = { ...seenMilestones, [charKey]: [...seenForChar, hit.id] };
        newStardust = stardust + hit.bonus;
        setSeenMilestones(nsm);
        setStardust(newStardust);
        setPendingMilestone(hit);
      }
      setCollection(nc);
      persist({ collection: nc, seenMilestones: nsm, stardust: newStardust });
    }
  }, [myItems, myCollection, collection, charKey, sound, persist, seenMilestones, stardust]);

  const answer = (opt) => {
    if (phase !== "ask" || !q) return;
    setPicked(opt);
    const right = opt === q.ans;
    setStats((s) => {
      const ns = { ...s, total: s.total + 1, correct: s.correct + (right ? 1 : 0) };
      return ns;
    });
    if (right) {
      SFX.correct(sound);
      spawnSparkles();
      setPhase("right");
      const ns = Math.min(streak + 1, 99);
      setStreak(ns);
      setStats((s) => ({ ...s, best: Math.max(s.best, ns) }));
      setMastery((m) => { const nm = { ...m, [q.key]: Math.min(3, (m[q.key] || 0) + 1) }; return nm; });
      const gain = rewardForGameType(q.gameType, ns);
      setStardust((v) => {
        const nv = v + gain;
        const owed = Math.floor(nv / PULL_COST) - Math.floor(v / PULL_COST);
        if (owed > 0) setPulls((p) => p + owed);
        return nv;
      });
    } else {
      SFX.wrong(sound);
      setPhase("wrong");
      setStreak(0);
      setLastWrong(q.key);
      setMastery((m) => { const nm = { ...m, [q.key]: Math.max(-1, (m[q.key] || 0) - 1) }; return nm; });
    }
  };

  // persist mastery/stats after answer settles
  useEffect(() => { if (phase === "right" || phase === "wrong") persist({}); /* eslint-disable-next-line */ }, [phase]);

  const onNext = () => {
    SFX.tap(sound);
    if (pulls > 0) { setPulls((p) => p - 1); doPull(); return; }
    nextQuestion();
  };
  const retryQuestion = () => {
    SFX.tap(sound);
    setPicked(null);
    setShowHint(true);
    setPhase("ask");
    setQ((prev) => (prev ? { ...prev, options: shuffle(prev.options) } : prev));
  };
  const closeReveal = () => {
    SFX.tap(sound);
    setReveal(null);
    if (pendingMilestone) {
      setStoryMilestone(pendingMilestone);
      setPendingMilestone(null);
      afterMilestoneRef.current = null;
      return;
    }
    if (pulls > 0) { setPulls((p) => p - 1); doPull(); return; }
    nextQuestion();
  };
  const goDressUp = () => {
    SFX.tap(sound);
    setReveal(null);
    if (pendingMilestone) {
      setStoryMilestone(pendingMilestone);
      setPendingMilestone(null);
      afterMilestoneRef.current = "dressup";
      return;
    }
    setScreen("dressup");
  };
  const closeMilestone = () => {
    SFX.tap(sound);
    setStoryMilestone(null);
    const after = afterMilestoneRef.current;
    afterMilestoneRef.current = null;
    if (after === "dressup") { setScreen("dressup"); return; }
    if (pulls > 0) { setPulls((p) => p - 1); doPull(); return; }
    nextQuestion();
  };

  const buildSnapshot = () => ({
    stardust, collection, mastery, stats, sound, equipped,
    character: characterId, seenMilestones,
  });

  const applySnapshot = (d) => {
    setStardust(d.stardust || 0);
    setCollection(d.collection || {});
    setMastery(d.mastery || {});
    setStats(d.stats || { correct: 0, total: 0, best: 0, shines: 0 });
    if (typeof d.sound === "boolean") setSound(d.sound);
    setEquipped(d.equipped || {});
    setSeenMilestones(d.seenMilestones || {});
    if (d.character) setCharacterId(d.character);
  };

  const resetAll = () => {
    if (typeof window !== "undefined" && !window.confirm("コレクションをぜんぶ さいしょから にする？")) return;
    if (typeof window !== "undefined" && storage) {
      try { storage.set(RESET_BACKUP_KEY, JSON.stringify(buildSnapshot())); } catch (e) {}
    }
    setStardust(0); setCollection({}); setMastery({}); setEquipped({}); setSeenMilestones({});
    setStats({ correct: 0, total: 0, best: 0, shines: 0 });
    if (typeof window !== "undefined" && storage) { try { storage.delete(SAVE_KEY); } catch (e) {} }
  };

  const handleExport = () => {
    SFX.tap(sound);
    setExportCode(encodeSave(buildSnapshot()));
    setBackupMsg("");
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportCode);
      setBackupMsg("コピーしました！どこかに メモして おいてね。");
    } catch (e) {
      setBackupMsg("コピーできなかったら、上の はこを ながく タップして じぶんで コピーしてね。");
    }
  };
  const handleRestore = () => {
    const d = decodeSave(importCode);
    if (!d) { setBackupMsg("コードが ただしくないみたい。もう一度 たしかめてね。"); return; }
    if (typeof window !== "undefined" && !window.confirm("今の データの うえに 上書きします。よろしいですか？")) return;
    applySnapshot(d);
    persist(d);
    setBackupMsg("もとに 戻しました！");
  };
  const handleUndoReset = async () => {
    if (typeof window === "undefined" || !storage) { setBackupMsg("もどせる データが ないみたい。"); return; }
    try {
      const r = await storage.get(RESET_BACKUP_KEY);
      if (!r || !r.value) { setBackupMsg("もどせる データが ないみたい。"); return; }
      const d = JSON.parse(r.value);
      if (!window.confirm("リセットの まえの データに もどします。よろしいですか？")) return;
      applySnapshot(d);
      persist(d);
      setBackupMsg("リセットまえの データに もどしました！");
    } catch (e) { setBackupMsg("もどせる データが ないみたい。"); }
  };

  const equip = (slotKey, itemId) => {
    SFX.tap(sound);
    setEquipped((prev) => {
      const charEq = { ...(prev[charKey] || {}), [slotKey]: itemId };
      const ne = { ...prev, [charKey]: charEq };
      persist({ equipped: ne });
      return ne;
    });
    setActiveSlot(null);
  };

  const stardustToNext = PULL_COST - (stardust % PULL_COST);

  /* ------------------------------- render ------------------------------- */
  return (
    <div className="kk-root">
      <Style />
      <div className="kk-stars" aria-hidden="true">
        {STAR_POS.map((p, i) => (
          <span key={i} className="kk-star" style={{ left: p[0] + "%", top: p[1] + "%", animationDelay: p[2] + "s", fontSize: p[3] + "px" }}>✦</span>
        ))}
      </div>

      <div className="kk-frame">
        {/* ---------- TOP BAR ---------- */}
        {screen !== "title" && (
          <div className="kk-bar">
            <button className="kk-icon-btn" onClick={() => { SFX.tap(sound); if (screen === "dressup") setScreen("collection"); else if (screen === "collection") setScreen(q ? "play" : "mode"); else if (screen === "select") setScreen("title"); else setScreen("mode"); }} aria-label="もどる">‹ もどる</button>
            <div className="kk-bar-mid">
              <span className="kk-dust">★ {stardust}</span>
            </div>
            <button className="kk-icon-btn" onClick={() => { const n = !sound; setSound(n); persist({ sound: n }); if (n) SFX.tap(true); }} aria-label="おと">{sound ? "🔊" : "🔇"}</button>
          </div>
        )}

        {/* ---------- TITLE ---------- */}
        {screen === "title" && (
          <div className="kk-title-screen">
            <div className="kk-witch-float"><DressedCharacter character={charKey} mood="happy" size={170} equipped={myEquipped} /></div>
            <h1 className="kk-logo">けいさんプリンセス</h1>
            <p className="kk-sub">すきな こを えらんで、<br />すてきな おしゃれを あつめよう！</p>
            <button className="kk-big-btn" onClick={() => { if (ac()) ac().resume && ac().resume(); SFX.tap(sound); setScreen(characterId ? "mode" : "select"); }}>あそぶ ♪</button>
            {characterId && (
              <>
                <button className="kk-text-btn" onClick={() => { SFX.tap(sound); setScreen("collection"); }}>コレクションを 見る（{collectedCount}/{myItems.length}）</button>
                {collectedCount > 0 && (
                  <button className="kk-text-btn" onClick={() => { SFX.tap(sound); setScreen("dressup"); }}>{CHARACTERS.find(c=>c.id===charKey).charaName}の コーデを する</button>
                )}
              </>
            )}
          </div>
        )}

        {/* ---------- CHARACTER SELECT ---------- */}
        {screen === "select" && (
          <div className="kk-select-screen">
            <h2 className="kk-h2">だれで あそぶ？</h2>
            <div className="kk-char-grid">
              {CHARACTERS.map((c) => (
                <button
                  key={c.id}
                  className={"kk-char-card" + (characterId === c.id ? " kk-char-card-active" : "")}
                  style={{ borderColor: c.accent }}
                  onClick={() => { SFX.tap(sound); setCharacterId(c.id); persist({ character: c.id }); setScreen("mode"); }}
                >
                  <div className="kk-char-preview"><c.Comp mood="happy" size={88} /></div>
                  <div className="kk-char-name">{c.label}</div>
                  <div className="kk-char-title" style={{ color: c.accent }}>{c.title}</div>
                  <div className="kk-char-sub">{c.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------- MODE SELECT ---------- */}
        {screen === "mode" && (
          <div className="kk-mode-screen">
            <div className="kk-witch-mini"><DressedCharacter character={charKey} mood="idle" size={108} equipped={myEquipped} /></div>
            <h2 className="kk-h2">今日は どれを れんしゅうする？</h2>

            <div className="kk-gametype-grid">
              {Object.entries(GAMETYPE_INFO).map(([key, info]) => (
                <button
                  key={key}
                  className="kk-gametype-card"
                  style={{ borderColor: info.accent }}
                  onClick={() => startGame(key, key === "kuku" ? "mix" : undefined)}
                >
                  <span className="kk-gt-icon">{info.icon}</span>
                  <span className="kk-gt-text"><b>{info.label}</b><small>{info.sub}</small></span>
                </button>
              ))}
            </div>

            <button className="kk-text-btn" onClick={() => { SFX.tap(sound); setScreen("collection"); }}>あつめた おしゃれを 見る →</button>
            <button className="kk-text-btn" onClick={() => { SFX.tap(sound); setScreen("select"); }}>ほかの こで あそぶ</button>
            <div className="kk-parentmenu-hint">九九の だんの せってい・バックアップが できます</div>
            <button className="kk-tiny-btn" onClick={() => { SFX.tap(sound); setShowDan((v) => !v); }}>{showDan ? "とじる" : "おうちのひとメニュー"}</button>
            {showDan && (
              <div className="kk-dan-wrap">
                <div className="kk-dan-note">九九の れんしゅうする だんを えらべます（ふだんは「おまかせ」で にがてを じどうで おおめに）</div>
                <div className="kk-dan-grid">
                  {[1,2,3,4,5,6,7,8,9].map((d) => (
                    <button key={d} className="kk-dan-btn" onClick={() => startGame("kuku", d)}>{d}のだん</button>
                  ))}
                </div>

                <div className="kk-backup-section">
                  <div className="kk-backup-title">📋 バックアップ</div>
                  <div className="kk-dan-note">データが きえてしまった時の ために、バックアップコードを とっておけます。コードを どこかに メモしておいてください。</div>

                  <button className="kk-backup-btn" onClick={handleExport}>バックアップコードを 出す</button>
                  {exportCode && (
                    <>
                      <textarea
                        className="kk-backup-textarea"
                        readOnly
                        value={exportCode}
                        onClick={(e) => e.target.select()}
                      />
                      <button className="kk-backup-btn kk-backup-btn-copy" onClick={handleCopy}>コードを コピーする</button>
                    </>
                  )}

                  <div className="kk-backup-divider" />

                  <div className="kk-dan-note">コードを もどして、データを ふっかつさせます。</div>
                  <textarea
                    className="kk-backup-textarea"
                    placeholder="ここに バックアップコードを はりつけてね"
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                  />
                  <button className="kk-backup-btn kk-backup-btn-restore" onClick={handleRestore}>この コードで もとに戻す</button>

                  <button className="kk-tiny-btn kk-backup-undo" onClick={handleUndoReset}>うっかり「さいしょから」を おしちゃった時は ここ</button>

                  {backupMsg && <div className="kk-backup-msg">{backupMsg}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------- PLAY ---------- */}
        {screen === "play" && q && (
          <div className="kk-play">
            <div className="kk-sky">
              <PracticeBackdrop stage={sceneStage} />
              {sceneStage && <div className="kk-stage-badge">{STAGE_LABEL[sceneStage]}</div>}
              {sparkles.map((s) => (
                <span key={s.id} className="kk-sparkle" style={{ left: s.left + "%", animationDelay: s.delay + "s", animationDuration: s.dur + "s", fontSize: s.size + "px" }}>★</span>
              ))}
              <div className="kk-witch-stage"><DressedCharacter character={charKey} mood={phase === "right" ? "happy" : phase === "wrong" ? "oops" : "idle"} size={120} equipped={myEquipped} /></div>
              {streak >= 2 && phase === "ask" && <div className="kk-combo">れんぞく {streak}！🔥</div>}
              <div className="kk-progress" aria-label="つぎのとびらまで">
                <div className="kk-progress-fill" style={{ width: (100 - stardustToNext / PULL_COST * 100) + "%" }} />
                <span className="kk-progress-label">つぎのとびらまで ★{stardustToNext}</span>
              </div>
            </div>

            {phase === "ask" && (() => {
              const gt = q.gameType;
              const tail = TAIL_BY_GAMETYPE[gt] || "ぜんぶで いくつ？";
              const m = mastery[q.key] || 0;
              const recall = m >= 2;                              // 覚えてきたら絵を消す
              let scaffold;
              if (gt === "kuku") {
                const view = (m <= 0 && q.a * q.b <= 25) ? "dots" : "badge";
                scaffold = <GroupVisual a={q.a} b={q.b} scene={q.scene} view={view} />;
              } else if (gt === "addCarry") {
                scaffold = <TwoClusterVisual a={q.a} b={q.b} scene={q.scene} />;
              } else if (gt === "subBorrow") {
                scaffold = <CrossOutVisual a={q.a} b={q.b} scene={q.scene} />;
              } else {
                scaffold = <FillToTenVisual a={q.a} scene={q.scene} />;
              }
              const hasColumnMemo = gt === "addCarry" || gt === "subBorrow";
              return (
                <>
                  <div className="kk-scene">
                    <div className="kk-scene-text">{q.scene.ask(q.a, q.b)}<br /><b>{tail}</b></div>
                    {!recall && scaffold}
                    {recall && (showHint
                      ? scaffold
                      : <button className="kk-hint-btn" onClick={() => { SFX.tap(sound); setShowHint(true); }}>？ ヒントを 見る</button>)}
                    {gt === "kuku" && (
                      <button className="kk-memo-btn" onClick={() => { SFX.tap(sound); setShowMemo(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{marginRight:5,verticalAlign:'middle'}}>
                          <path d="M6 3 q6-3 12 0 v15 q-6-3-12 0 Z" fill="#C9A8F0" stroke="#7A5C98" strokeWidth="2" strokeLinejoin="round"/>
                          <circle cx="12" cy="10" r="2.5" fill="#FFC94D"/>
                        </svg>
                        まほうのメモを 見る
                      </button>
                    )}
                    {hasColumnMemo && (
                      <button className="kk-memo-btn" onClick={() => { SFX.tap(sound); setShowColumnMemo(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{marginRight:5,verticalAlign:'middle'}}>
                          <path d="M6 3 q6-3 12 0 v15 q-6-3-12 0 Z" fill="#C9A8F0" stroke="#7A5C98" strokeWidth="2" strokeLinejoin="round"/>
                          <circle cx="12" cy="10" r="2.5" fill="#FFC94D"/>
                        </svg>
                        ひっさんメモを 見る
                      </button>
                    )}
                  </div>
                  <div className="kk-opts">
                    {q.options.map((o) => (
                      <button key={o} className="kk-opt" onClick={() => answer(o)}>{o}</button>
                    ))}
                  </div>
                </>
              );
            })()}

            {phase !== "ask" && (() => {
              const fb = feedbackTextFor(q);
              return (
                <div className={"kk-feedback " + (phase === "right" ? "kk-fb-right" : "kk-fb-wrong")}>
                  {phase === "right" ? (
                    <>
                      <div className="kk-fb-big">{fb.big}</div>
                      <div className="kk-fb-total">{fb.total}</div>
                      <div className="kk-fb-echo">{fb.echo}</div>
                      <div className="kk-fb-msg">星のかけらを ★{rewardForGameType(q.gameType, streak)} ゲット！</div>
                      <button className="kk-big-btn" onClick={onNext}>
                        {pulls > 0 ? "✨ まほうのとびらが ひらく！" : "つぎへ →"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="kk-fb-big kk-fb-oops-text">あら？ ちがうみたい</div>
                      <div className="kk-fb-msg">もういちど かぞえてみよう♪</div>
                      <button className="kk-big-btn kk-retry-btn" onClick={retryQuestion}>もう いちど やってみよう</button>
                    </>
                  )}
                </div>
              );
            })()}

            <button className="kk-text-btn kk-coll-link" onClick={() => { SFX.tap(sound); setScreen("collection"); }}>
              あつめた おしゃれ（{collectedCount}/{myItems.length}）
            </button>
          </div>
        )}

        {/* ---------- COLLECTION ---------- */}
        {screen === "collection" && (
          <div className="kk-coll">
            <h2 className="kk-h2">{CHARACTERS.find(c=>c.id===charKey).title} 図かん</h2>
            <div className="kk-coll-count">{collectedCount} / {myItems.length} こ あつめた{allDone && " 🎉 コンプリート！"}</div>
            <div className="kk-grid">
              {myItems.map((it) => {
                const have = !!myCollection[it.id];
                const r = RARITY[it.rarity];
                return (
                  <div key={it.id} className={"kk-cell " + (have ? "have" : "locked")} style={have ? { boxShadow: `0 0 0 3px ${r.ring}` } : {}}>
                    {have ? (
                      <>
                        <span className="kk-rarity" style={{ background: r.glow }}>{r.label}</span>
                        <div className="kk-cell-icon"><ItemIcon id={it.id} size={56} /></div>
                        <div className="kk-cell-name">{it.name}</div>
                        <div className="kk-cell-flavor">{it.flavor}</div>
                        {myCollection[it.id] > 1 && <span className="kk-dup">×{myCollection[it.id]}</span>}
                      </>
                    ) : (
                      <>
                        <div className="kk-cell-icon kk-silhouette"><ItemIcon id={it.id} size={56} /></div>
                        <div className="kk-cell-name">？？？</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="kk-stats">
              <div><b>{stats.correct}</b><small>正かい</small></div>
              <div><b>{stats.best}</b><small>れんぞく</small></div>
              <div><b>{stats.total ? Math.round(stats.correct / stats.total * 100) : 0}%</b><small>正かいりつ</small></div>
              <div><b>{stats.shines}</b><small>キラキラ</small></div>
            </div>

            {collectedCount > 0 && (
              <button className="kk-big-btn kk-retry-btn kk-dress-link-btn" onClick={() => { SFX.tap(sound); setScreen("dressup"); }}>👗 {CHARACTERS.find(c=>c.id===charKey).charaName}の コーデを する</button>
            )}
            <button className="kk-big-btn" onClick={() => { SFX.tap(sound); setScreen(mode && q ? "play" : "mode"); }}>つづける ♪</button>
            <button className="kk-text-btn kk-reset" onClick={resetAll}>さいしょから にする</button>
          </div>
        )}

        {/* ---------- DRESS UP ---------- */}
        {screen === "dressup" && (
          <div className="kk-dress-screen">
            <h2 className="kk-h2">{CHARACTERS.find(c=>c.id===charKey).charaName}の コーデ</h2>
            <div className="kk-dress-stage">
              <DressedCharacter character={charKey} mood="happy" size={190} equipped={myEquipped} />
            </div>
            <div className="kk-dress-slots">
              {mySlots.map((slot) => {
                const itemId = myEquipped[slot.key];
                const it = itemId ? myItems.find((x) => x.id === itemId) : null;
                const haveAny = slot.items.some((id) => myCollection[id]);
                return (
                  <button
                    key={slot.key}
                    className={"kk-slot-btn" + (it ? " kk-slot-filled" : "") + (!haveAny ? " kk-slot-empty-disabled" : "")}
                    onClick={() => { if (haveAny) { SFX.tap(sound); setActiveSlot(slot.key); } }}
                  >
                    <div className="kk-slot-icon">
                      {it ? <ItemIcon id={it.id} size={30} /> : <span className="kk-slot-plus">{haveAny ? "＋" : "🔒"}</span>}
                    </div>
                    <div className="kk-slot-label">{slot.label}</div>
                  </button>
                );
              })}
            </div>
            <div className="kk-dress-hint">あつめた アイテムを タップして、すきな コーデに しよう♪</div>
            <button className="kk-big-btn" onClick={() => { SFX.tap(sound); setScreen(q ? "play" : "mode"); }}>
              ✨ {CHARACTERS.find(c=>c.id===charKey).charaName}の おてつだいを する →
            </button>
            <button className="kk-text-btn" onClick={() => { SFX.tap(sound); setScreen("collection"); }}>図かんに もどる</button>
          </div>
        )}
      </div>

      {/* ---------- SLOT PICKER ---------- */}
      {activeSlot && (() => {
        const slot = mySlots.find((s) => s.key === activeSlot);
        const haveItems = slot.items.filter((id) => myCollection[id]);
        return (
          <div className="kk-memo-backdrop" onClick={() => setActiveSlot(null)} role="dialog" aria-label="アイテムをえらぶ">
            <div className="kk-picker-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="kk-memo-head">
                <div className="kk-memo-title">{slot.label}を えらぼう</div>
                <button className="kk-memo-close" onClick={() => setActiveSlot(null)} aria-label="とじる">✕ とじる</button>
              </div>
              <div className="kk-picker-grid">
                <button className={"kk-picker-chip" + (!myEquipped[activeSlot] ? " kk-picker-selected" : "")} onClick={() => equip(activeSlot, null)}>
                  <span className="kk-picker-none">なし</span>
                </button>
                {haveItems.map((id) => {
                  const it = myItems.find((x) => x.id === id);
                  const selected = myEquipped[activeSlot] === id;
                  return (
                    <button key={id} className={"kk-picker-chip" + (selected ? " kk-picker-selected" : "")} onClick={() => equip(activeSlot, id)}>
                      <ItemIcon id={id} size={44} />
                      <span className="kk-picker-name">{it.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        );
      })()}

      {/* ---------- MAGIC MEMO ---------- */}
      {showMemo && <MagicMemo q={q} onClose={() => setShowMemo(false)} />}
      {showColumnMemo && <ColumnMemo q={q} onClose={() => setShowColumnMemo(false)} />}

      {/* ---------- REVEAL MODAL ---------- */}
      {reveal && (
        <div className="kk-modal" onClick={closeReveal}>
          <div className="kk-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="kk-modal-title">まほうのとびらが ひらいた！</div>
            <div className="kk-circle-wrap">
              <svg className="kk-magic-circle" viewBox="0 0 200 200" width="220" height="220" aria-hidden="true">
                <circle cx="100" cy="100" r="92" fill="none" stroke={RARITY[reveal.item.rarity].glow} strokeWidth="3" strokeDasharray="6 10" />
                <circle cx="100" cy="100" r="74" fill="none" stroke={C.gold} strokeWidth="2" strokeDasharray="2 14" />
                {[0,60,120,180,240,300].map(a => (<path key={a} d="M100 18 l4 9 l9 .7 l-7 6 l2.2 9 l-8.2-5 l-8.2 5 l2.2-9 l-7-6 l9-.7 Z" fill={C.gold} transform={`rotate(${a} 100 100)`} />))}
              </svg>
              <div className="kk-reveal-rays" />
              <div className="kk-reveal-item"><ItemIcon id={reveal.item.id} size={96} /></div>
            </div>
            <div className="kk-reveal-rarity" style={{ color: RARITY[reveal.item.rarity].glow }}>{RARITY[reveal.item.rarity].label}</div>
            <div className="kk-reveal-name">{reveal.item.name}</div>
            <div className="kk-reveal-flavor">「{reveal.item.flavor}」</div>
            {reveal.dup
              ? (
                <>
                  <div className="kk-reveal-dup">もってた！ キラキラ＋1 と ★20 ボーナス♪</div>
                  <button className="kk-big-btn" onClick={closeReveal}>やったー！</button>
                </>
              ) : (
                <>
                  <div className="kk-reveal-get">新しく ゲット！</div>
                  <div className="kk-reveal-prompt">コーデの きせかえを 見てみる？</div>
                  <div className="kk-reveal-btnrow">
                    <button className="kk-big-btn kk-retry-btn kk-reveal-btn-half" onClick={closeReveal}>あとで</button>
                    <button className="kk-big-btn kk-reveal-btn-half" onClick={goDressUp}>見てみる</button>
                  </div>
                </>
              )}
          </div>
        </div>
      )}

      {/* ---------- STORY MILESTONE ---------- */}
      <MilestoneModal milestone={storyMilestone} character={charKey} equipped={myEquipped} onClose={closeMilestone} />
    </div>
  );
}

const STAR_POS = [
  [6, 12, 0, 10], [18, 30, 1.2, 7], [30, 8, 0.6, 9], [44, 22, 2.1, 6], [58, 10, 0.9, 11],
  [72, 26, 1.6, 7], [86, 14, 0.3, 9], [92, 40, 1.1, 6], [10, 52, 2.4, 8], [24, 70, 0.7, 7],
  [40, 60, 1.9, 6], [54, 78, 0.4, 9], [70, 64, 2.2, 7], [84, 80, 1.0, 8], [14, 88, 1.5, 6],
  [62, 92, 0.8, 7], [88, 62, 2.0, 9], [4, 38, 1.3, 7],
];

/* ============================ STYLES ==================================== */
function Style() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700;900&family=Yomogi&display=swap');

.kk-root{
  --night:${C.night}; --night-deep:${C.nightDeep}; --rose:${C.rose}; --rose-deep:${C.roseDeep};
  --gold:${C.gold}; --mint:${C.mint}; --lav:${C.lav}; --plum:${C.plum}; --cream:${C.cream};
  position:relative; min-height:100vh; width:100%;
  font-family:'Zen Maru Gothic',sans-serif; color:var(--plum);
  background:
    radial-gradient(120% 80% at 50% -10%, #FFE7F4 0%, #F3DEFB 38%, #E7D2F7 70%, #DCC6F2 100%);
  display:flex; justify-content:center; align-items:flex-start;
  overflow-x:hidden; padding:0 0 40px;
}
.kk-stars{position:fixed; inset:0; pointer-events:none; z-index:0;}
.kk-star{position:absolute; color:#fff; opacity:.0; animation:kk-tw 3.4s ease-in-out infinite; text-shadow:0 0 6px rgba(255,201,77,.8);}
@keyframes kk-tw{0%,100%{opacity:.15; transform:scale(.7)}50%{opacity:.9; transform:scale(1.1)}}

.kk-frame{position:relative; z-index:1; width:100%; max-width:480px; margin:0 12px; padding:14px 0 0;}

.kk-bar{display:flex; align-items:center; justify-content:space-between; gap:8px; margin:6px 4px 12px;}
.kk-bar-mid{flex:1; display:flex; justify-content:center;}
.kk-dust{font-family:'Mochiy Pop One'; background:var(--night); color:var(--gold); padding:7px 18px; border-radius:999px; box-shadow:0 4px 0 rgba(74,45,107,.35); font-size:18px; letter-spacing:.5px;}
.kk-icon-btn{font-family:'Zen Maru Gothic'; font-weight:700; border:none; background:rgba(255,255,255,.85); color:var(--plum); padding:8px 12px; border-radius:14px; box-shadow:0 3px 0 rgba(124,92,152,.3); cursor:pointer; font-size:14px;}
.kk-icon-btn:active{transform:translateY(2px); box-shadow:0 1px 0 rgba(124,92,152,.3);}

/* ---- title ---- */
.kk-title-screen{display:flex; flex-direction:column; align-items:center; text-align:center; padding-top:6vh;}
.kk-witch-float{animation:kk-bob 3.2s ease-in-out infinite; filter:drop-shadow(0 12px 14px rgba(74,45,107,.25));}
@keyframes kk-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-12px) rotate(2deg)}}
.kk-logo{font-family:'Mochiy Pop One'; font-size:36px; margin:6px 0 2px; color:var(--night);
  text-shadow:2px 2px 0 var(--gold), 4px 4px 0 rgba(255,143,196,.6); letter-spacing:1px; line-height:1.3; max-width:300px;}
.kk-sub{font-size:15px; color:var(--plum); margin:4px 16px 26px; font-weight:700; line-height:1.7;}

.kk-big-btn{font-family:'Mochiy Pop One'; font-size:22px; color:#fff; border:none; cursor:pointer;
  background:linear-gradient(180deg,var(--rose),var(--rose-deep)); padding:16px 40px; border-radius:999px;
  box-shadow:0 6px 0 ${C.roseDeep}, 0 10px 18px rgba(232,95,163,.4); margin:6px 0; letter-spacing:1px;
  transition:transform .08s;}
.kk-big-btn:active{transform:translateY(4px); box-shadow:0 2px 0 ${C.roseDeep}, 0 6px 10px rgba(232,95,163,.4);}
.kk-text-btn{background:none; border:none; color:var(--plum); font-family:'Zen Maru Gothic'; font-weight:700; font-size:14px; cursor:pointer; margin-top:14px; text-decoration:underline; text-underline-offset:4px; text-decoration-color:var(--rose);}

/* ---- mode ---- */
.kk-mode-screen{display:flex; flex-direction:column; align-items:center; text-align:center; padding-top:1vh;}
.kk-h2{font-family:'Mochiy Pop One'; font-size:24px; color:var(--night); margin:6px 0 18px;}
.kk-gametype-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; width:100%; max-width:400px; margin-bottom:16px;}
.kk-gametype-card{
  display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center;
  background:#fff; border:3px solid var(--lav); border-radius:20px;
  padding:16px 10px; cursor:pointer; box-shadow:0 5px 0 rgba(201,168,240,.45);
}
.kk-gametype-card:active{transform:translateY(3px); box-shadow:0 2px 0 rgba(201,168,240,.45);}
.kk-gt-icon{font-size:30px;}
.kk-gt-text{display:flex; flex-direction:column; gap:3px;}
.kk-gt-text b{font-family:'Mochiy Pop One'; font-size:14px; color:var(--night); line-height:1.3;}
.kk-gt-text small{font-family:'Yomogi'; font-size:11px; color:var(--plum-soft,#7A5C98); line-height:1.3;}
.kk-dan-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:100%; max-width:380px;}
.kk-dan-btn{font-family:'Mochiy Pop One'; font-size:19px; color:var(--night); background:#fff; border:3px solid var(--lav); border-radius:18px; padding:16px 0; cursor:pointer; box-shadow:0 5px 0 rgba(201,168,240,.9);}
.kk-dan-btn:active{transform:translateY(3px); box-shadow:0 2px 0 rgba(201,168,240,.9);}

/* ---- play ---- */
.kk-play{display:flex; flex-direction:column; align-items:center;}
.kk-sky{position:relative; width:100%; background:linear-gradient(180deg,var(--night),var(--night-deep)); border-radius:26px; padding:18px 16px 16px; overflow:hidden; box-shadow:inset 0 0 30px rgba(0,0,0,.25);}
.kk-bg-deco{position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:0;}
.kk-stage-badge{position:absolute; top:14px; left:14px; z-index:2; font-family:'Yomogi'; color:#fff; font-size:11.5px; background:rgba(0,0,0,.25); padding:5px 10px; border-radius:999px;}
.kk-witch-stage{position:relative; z-index:1; display:flex; justify-content:center; animation:kk-bob2 3s ease-in-out infinite;}
@keyframes kk-bob2{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.kk-combo{position:absolute; top:14px; right:14px; z-index:2; font-family:'Mochiy Pop One'; color:var(--gold); font-size:15px; background:rgba(0,0,0,.25); padding:5px 12px; border-radius:999px;}
.kk-progress{position:relative; z-index:1; height:22px; background:rgba(255,255,255,.18); border-radius:999px; margin-top:12px; overflow:hidden;}
.kk-progress-fill{position:absolute; inset:0 auto 0 0; background:linear-gradient(90deg,var(--gold),var(--rose)); border-radius:999px; transition:width .5s;}
.kk-progress-label{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11px; font-weight:700; text-shadow:0 1px 2px rgba(0,0,0,.4);}
.kk-sparkle{position:absolute; top:60%; z-index:1; color:var(--gold); animation:kk-rise linear forwards; pointer-events:none; text-shadow:0 0 8px var(--gold);}
@keyframes kk-rise{0%{opacity:0; transform:translateY(0) scale(.4) rotate(0)}20%{opacity:1}100%{opacity:0; transform:translateY(-160px) scale(1.2) rotate(180deg)}}

.kk-qbox{background:#fff; border-radius:24px; padding:18px 20px 20px; margin:16px 0; width:100%; text-align:center; box-shadow:0 6px 0 rgba(201,168,240,.5);}
.kk-q-sub{font-size:14px; color:var(--plum-soft,#7A5C98); font-weight:700; margin-bottom:6px; font-family:'Yomogi';}
.kk-q-main{font-family:'Mochiy Pop One'; font-size:46px; color:var(--night); line-height:1;}
.kk-x{color:var(--rose-deep); margin:0 4px;}
.kk-eq{color:var(--plum); margin-left:6px;}
.kk-qq{color:var(--gold); -webkit-text-stroke:2px var(--goldDeep,#F2A93B);}
.kk-opts{display:grid; grid-template-columns:1fr 1fr; gap:14px; width:100%;}
.kk-opt{font-family:'Mochiy Pop One'; font-size:30px; color:var(--night); background:#fff; border:3px solid var(--mint); border-radius:20px; padding:20px 0; cursor:pointer; box-shadow:0 6px 0 #57c9b0; transition:transform .06s;}
.kk-opt:hover{background:#F4FFFB;}
.kk-opt:active{transform:translateY(4px); box-shadow:0 2px 0 #57c9b0;}

.kk-feedback{width:100%; background:#fff; border-radius:24px; padding:22px 18px; margin:16px 0 6px; text-align:center; box-shadow:0 6px 0 rgba(201,168,240,.5); animation:kk-pop .3s ease;}
@keyframes kk-pop{0%{transform:scale(.85); opacity:0}100%{transform:scale(1); opacity:1}}
.kk-fb-right .kk-fb-big{color:var(--rose-deep);}
.kk-fb-wrong .kk-fb-big{color:var(--plum-soft,#7A5C98);}
.kk-fb-big{font-family:'Mochiy Pop One'; font-size:34px; margin-bottom:6px;}
.kk-retry-btn{background:linear-gradient(180deg,var(--lav),#A98ED0); box-shadow:0 6px 0 #8A6BB8, 0 10px 18px rgba(169,142,208,.4);}
.kk-retry-btn:active{box-shadow:0 2px 0 #8A6BB8, 0 6px 10px rgba(169,142,208,.4);}
.kk-fb-eq{font-family:'Mochiy Pop One'; font-size:26px; color:var(--night); margin-bottom:8px;}
.kk-fb-eq b{color:var(--rose-deep);}
.kk-fb-msg{font-size:14px; font-weight:700; color:var(--plum); margin-bottom:14px; font-family:'Yomogi';}

.kk-coll-link{margin-top:4px;}

/* ---- scene (おてつだいの場面) ---- */
.kk-scene{background:#fff; border-radius:24px; padding:16px 14px 18px; margin:16px 0; width:100%; box-shadow:0 6px 0 rgba(201,168,240,.5); display:flex; flex-direction:column; align-items:center;}
.kk-scene-text{font-family:'Zen Maru Gothic'; font-weight:700; font-size:16px; color:var(--plum); text-align:center; line-height:1.7; margin-bottom:14px;}
.kk-scene-text b{font-family:'Mochiy Pop One'; color:var(--rose-deep); font-size:20px;}
.kk-groups{display:flex; flex-wrap:wrap; gap:8px; justify-content:center;}
.kk-group-card{border-radius:14px; padding:8px; min-width:46px; min-height:46px; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 0 0 2px rgba(74,45,107,.12);}
.kk-dots{display:flex; flex-wrap:wrap; gap:3px; max-width:57px; justify-content:center;}
.kk-badge{display:flex; flex-direction:column; align-items:center; gap:1px;}
.kk-badge span{font-family:'Mochiy Pop One'; font-size:20px; color:var(--night); line-height:1;}
.kk-hint-btn{font-family:'Zen Maru Gothic'; font-weight:700; font-size:13px; color:var(--plum-soft,#7A5C98); background:#F3ECFB; border:2px dashed var(--lav); border-radius:14px; padding:9px 18px; cursor:pointer;}
.kk-hint-btn:active{transform:translateY(2px);}
.kk-fb-total{font-family:'Mochiy Pop One'; font-size:24px; color:var(--night); margin-bottom:2px;}
.kk-fb-total b{color:var(--rose-deep); font-size:30px;}
.kk-fb-echo{font-family:'Yomogi'; font-size:13px; color:var(--plum-soft,#7A5C98); opacity:.75; margin-bottom:10px;}
.kk-witch-mini{margin-bottom:2px; animation:kk-bob2 3s ease-in-out infinite;}
.kk-parentmenu-hint{font-family:'Yomogi'; font-size:11px; color:var(--plum-soft,#7A5C98); opacity:.7; margin-top:18px; text-align:center;}
.kk-tiny-btn{background:none; border:none; color:var(--plum-soft,#7A5C98); font-family:'Zen Maru Gothic'; font-weight:700; font-size:12px; cursor:pointer; margin-top:4px; opacity:.7; text-decoration:underline; text-underline-offset:3px;}
.kk-dan-wrap{width:100%; max-width:380px; margin-top:10px;}
.kk-dan-note{font-size:11.5px; color:var(--plum); font-weight:700; margin-bottom:10px; line-height:1.6;}

/* ---- バックアップ ---- */
.kk-backup-section{margin-top:20px; padding-top:16px; border-top:2px dashed rgba(201,168,240,.5); text-align:left;}
.kk-backup-title{font-family:'Mochiy Pop One'; font-size:14px; color:var(--night); margin-bottom:8px;}
.kk-backup-btn{
  display:block; width:100%; font-family:'Zen Maru Gothic'; font-weight:700; font-size:13px;
  color:#fff; background:var(--lav); border:none; border-radius:14px; padding:11px 0;
  cursor:pointer; margin:6px 0; box-shadow:0 3px 0 #A98ED0;
}
.kk-backup-btn:active{transform:translateY(2px); box-shadow:0 1px 0 #A98ED0;}
.kk-backup-btn-copy{background:var(--mint); box-shadow:0 3px 0 #57c9b0;}
.kk-backup-btn-copy:active{box-shadow:0 1px 0 #57c9b0;}
.kk-backup-btn-restore{background:var(--rose-deep); box-shadow:0 3px 0 #C0568A;}
.kk-backup-btn-restore:active{box-shadow:0 1px 0 #C0568A;}
.kk-backup-textarea{
  width:100%; min-height:64px; font-size:11px; font-family:monospace; color:var(--plum);
  background:#fff; border:2px solid #EADCF9; border-radius:12px; padding:8px; margin:6px 0;
  resize:vertical; box-sizing:border-box; word-break:break-all;
}
.kk-backup-divider{height:1px; background:rgba(201,168,240,.4); margin:16px 0;}
.kk-backup-undo{display:block; width:100%; text-align:center; margin-top:10px;}
.kk-backup-msg{font-family:'Yomogi'; font-size:12.5px; color:var(--rose-deep); font-weight:700; margin-top:8px; text-align:center;}

/* ---- collection ---- */
.kk-coll{display:flex; flex-direction:column; align-items:center; text-align:center;}
.kk-coll-count{font-family:'Mochiy Pop One'; color:var(--rose-deep); font-size:16px; margin-bottom:14px;}
.kk-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px; width:100%;}
.kk-cell{position:relative; background:#fff; border-radius:20px; padding:14px 10px 12px; min-height:150px; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(74,45,107,.12);}
.kk-cell.locked{background:#EFE6F7;}
.kk-cell-icon{filter:drop-shadow(0 4px 5px rgba(74,45,107,.18));}
.kk-silhouette{filter:brightness(0) opacity(.18);}
.kk-cell-name{font-family:'Mochiy Pop One'; font-size:13px; color:var(--night); margin-top:8px;}
.kk-cell-flavor{font-family:'Yomogi'; font-size:11px; color:var(--plum-soft,#7A5C98); margin-top:3px; line-height:1.4;}
.kk-rarity{position:absolute; top:8px; left:8px; font-size:10px; font-weight:900; color:#fff; padding:2px 8px; border-radius:999px;}
.kk-dup{position:absolute; top:8px; right:8px; font-family:'Mochiy Pop One'; font-size:12px; color:var(--rose-deep);}

.kk-stats{display:grid; grid-template-columns:repeat(4,1fr); gap:8px; width:100%; margin:18px 0 6px;}
.kk-stats div{background:rgba(255,255,255,.7); border-radius:16px; padding:10px 4px; display:flex; flex-direction:column;}
.kk-stats b{font-family:'Mochiy Pop One'; color:var(--rose-deep); font-size:18px;}
.kk-stats small{font-size:10.5px; color:var(--plum); font-weight:700; margin-top:2px;}
.kk-reset{color:var(--plum-soft,#7A5C98); text-decoration-color:var(--lav); margin-top:8px; font-size:12px;}

/* ---- reveal modal ---- */
.kk-modal{position:fixed; inset:0; z-index:30; background:rgba(36,24,72,.7); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:20px; animation:kk-fade .25s;}
@keyframes kk-fade{from{opacity:0}to{opacity:1}}
.kk-modal-card{background:linear-gradient(180deg,#fff,#FFF1F8); border-radius:28px; padding:22px 22px 24px; text-align:center; max-width:340px; width:100%; box-shadow:0 14px 40px rgba(0,0,0,.4); animation:kk-pop .35s ease;}
.kk-modal-title{font-family:'Mochiy Pop One'; color:var(--night); font-size:16px; margin-bottom:6px;}
.kk-circle-wrap{position:relative; width:220px; height:220px; margin:4px auto 6px; display:flex; align-items:center; justify-content:center;}
.kk-magic-circle{position:absolute; inset:0; margin:auto; animation:kk-spin 8s linear infinite;}
@keyframes kk-spin{to{transform:rotate(360deg)}}
.kk-reveal-rays{position:absolute; width:200px; height:200px; border-radius:50%;
  background:conic-gradient(from 0deg, rgba(255,201,77,.0) 0deg, rgba(255,201,77,.35) 18deg, rgba(255,201,77,0) 36deg, rgba(255,201,77,.35) 54deg, rgba(255,201,77,0) 72deg, rgba(255,201,77,.35) 90deg, rgba(255,201,77,0) 108deg, rgba(255,201,77,.35) 126deg, rgba(255,201,77,0) 144deg, rgba(255,201,77,.35) 162deg, rgba(255,201,77,0) 180deg, rgba(255,201,77,.35) 198deg, rgba(255,201,77,0) 216deg, rgba(255,201,77,.35) 234deg, rgba(255,201,77,0) 252deg, rgba(255,201,77,.35) 270deg, rgba(255,201,77,0) 288deg, rgba(255,201,77,.35) 306deg, rgba(255,201,77,0) 324deg, rgba(255,201,77,.35) 342deg, rgba(255,201,77,0) 360deg);
  animation:kk-spin 6s linear infinite reverse; opacity:.7;}
.kk-reveal-item{position:relative; z-index:2; animation:kk-itempop .6s cubic-bezier(.2,1.4,.4,1); filter:drop-shadow(0 6px 10px rgba(74,45,107,.3));}
@keyframes kk-itempop{0%{transform:scale(0) rotate(-40deg); opacity:0}60%{transform:scale(1.2) rotate(8deg)}100%{transform:scale(1) rotate(0); opacity:1}}
.kk-reveal-rarity{font-family:'Mochiy Pop One'; font-size:14px; letter-spacing:1px;}
.kk-reveal-name{font-family:'Mochiy Pop One'; font-size:24px; color:var(--night); margin:2px 0 4px;}
.kk-reveal-flavor{font-family:'Yomogi'; font-size:14px; color:var(--plum-soft,#7A5C98); margin-bottom:8px;}
.kk-reveal-get{color:var(--rose-deep); font-weight:900; font-size:14px; margin-bottom:12px;}
.kk-reveal-dup{color:var(--goldDeep,#F2A93B); font-weight:900; font-size:13px; margin-bottom:12px;}

.kk-pop{animation:kk-popstar .6s ease infinite alternate; transform-origin:center;}
@keyframes kk-popstar{from{opacity:.3; transform:scale(.7)}to{opacity:1; transform:scale(1.1)}}

/* ---- まほうのメモ ---- */
.kk-memo-btn{
  display:inline-flex; align-items:center; margin-top:14px;
  font-family:'Zen Maru Gothic'; font-weight:700; font-size:13px;
  color:var(--plum-soft,#7A5C98); background:rgba(201,168,240,.18);
  border:2px solid var(--lav); border-radius:14px; padding:8px 16px;
  cursor:pointer; transition:background .15s;
}
.kk-memo-btn:hover{background:rgba(201,168,240,.34);}
.kk-memo-btn:active{transform:translateY(2px);}

.kk-memo-backdrop{
  position:fixed; inset:0; z-index:40;
  background:rgba(36,24,72,.55); backdrop-filter:blur(4px);
  display:flex; align-items:flex-end; justify-content:center;
  animation:kk-fade .2s;
}
.kk-memo-sheet{
  width:100%; max-width:500px;
  background:linear-gradient(170deg,#FFF8FE 0%,#F3E8FD 60%,#EDE0F9 100%);
  border-radius:26px 26px 0 0;
  box-shadow:0 -8px 32px rgba(74,45,107,.28);
  max-height:82vh; display:flex; flex-direction:column;
  animation:kk-slideup .28s cubic-bezier(.2,1,.4,1);
  border-top:4px solid var(--lav);
}
@keyframes kk-slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}

.kk-memo-head{
  display:flex; align-items:center; gap:8px;
  padding:14px 16px 10px; border-bottom:1.5px solid rgba(201,168,240,.5);
  flex-shrink:0;
}
.kk-memo-title{
  font-family:'Mochiy Pop One'; font-size:16px; color:var(--night);
  display:flex; align-items:center; gap:6px; flex:1;
}
.kk-memo-badge{
  font-size:11px; font-weight:700; color:var(--rose-deep);
  background:#FFE8F4; border-radius:999px; padding:3px 10px; white-space:nowrap;
}
.kk-memo-close{
  border:none; background:rgba(201,168,240,.3); color:var(--plum);
  font-weight:700; font-size:12px; border-radius:14px;
  cursor:pointer; flex-shrink:0; padding:6px 10px;
  display:flex; align-items:center; gap:3px; white-space:nowrap;
}
.kk-memo-close:active{transform:scale(.95);}

/* 今のもんだいカード */
.kk-memo-qcard{
  margin:0 12px 10px; border-radius:16px; padding:10px 14px;
  border:2px solid rgba(74,45,107,.12);
  box-shadow:0 2px 8px rgba(74,45,107,.1);
}
.kk-memo-qlabel{
  font-family:'Mochiy Pop One'; font-size:11px; color:var(--plum-soft,#7A5C98);
  margin-bottom:4px; letter-spacing:.3px;
}
.kk-memo-qtext{
  font-family:'Zen Maru Gothic'; font-weight:700; font-size:14px;
  color:var(--night); line-height:1.5; margin-bottom:8px;
}
.kk-memo-qrow{
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
}
.kk-memo-qgroups{
  display:flex; flex-wrap:wrap; gap:5px; flex:1;
}
.kk-memo-qgroup{
  display:flex; align-items:center; gap:2px;
  background:rgba(255,255,255,.7); border-radius:8px; padding:3px 6px;
}
.kk-memo-qcount{
  font-family:'Mochiy Pop One'; font-size:11px; color:var(--plum);
}
.kk-memo-qans{
  font-family:'Mochiy Pop One'; font-size:15px; color:var(--plum);
  white-space:nowrap;
}
.kk-memo-qans b{color:var(--rose-deep); font-size:20px;}

.kk-memo-legend{
  display:flex; gap:10px; padding:6px 16px 8px; flex-shrink:0; flex-wrap:wrap;
}
.kk-leg-row,.kk-leg-col,.kk-leg-cross{font-size:10.5px; font-weight:700; color:var(--plum); display:flex; align-items:center; gap:4px;}
.kk-leg-row::before{content:''; display:inline-block; width:14px; height:14px; background:rgba(255,143,196,.5); border-radius:4px;}
.kk-leg-col::before{content:''; display:inline-block; width:14px; height:14px; background:rgba(125,224,200,.5); border-radius:4px;}
.kk-leg-cross::before{content:''; display:inline-block; width:14px; height:14px; background:linear-gradient(135deg,#FFC94D,#FF8FC4); border-radius:4px;}

.kk-memo-body{
  overflow-y:auto; padding:0 12px 8px; flex:1;
  /* スクロールバーを細く */ scrollbar-width:thin; scrollbar-color:var(--lav) transparent;
}
.kk-memo-colhead{
  display:grid; grid-template-columns:36px repeat(9,1fr);
  gap:3px; padding:4px 0 2px; position:sticky; top:0;
  background:linear-gradient(170deg,#FFF8FE,#F3E8FD);
  z-index:2; border-bottom:1.5px dashed rgba(201,168,240,.5);
}
.kk-memo-colnum{
  font-family:'Mochiy Pop One'; font-size:12px; color:var(--plum-soft,#7A5C98);
  text-align:center; padding:3px 0;
}
.kk-memo-colhi{color:var(--rose-deep);}

.kk-memo-row{
  display:grid; grid-template-columns:36px repeat(9,1fr);
  gap:3px; margin:2px 0; border-radius:10px;
  transition:background .1s;
}
.kk-memo-rowhi{ background:rgba(255,143,196,.08); }
.kk-memo-danlabel{
  font-family:'Mochiy Pop One'; font-size:12px; color:var(--plum-soft,#7A5C98);
  display:flex; align-items:center; justify-content:center; gap:1px;
  padding:6px 2px;
}
.kk-memo-arrow{font-size:9px; color:var(--rose-deep);}
.kk-memo-cell{
  font-family:'Mochiy Pop One'; font-size:14px; color:var(--night);
  text-align:center; padding:6px 2px; border-radius:7px;
  position:relative; display:flex; align-items:center; justify-content:center;
  gap:1px; min-width:0; background:rgba(255,255,255,.4);
}
.kk-cell-row{ background:rgba(255,143,196,.32); }
.kk-cell-col{ background:rgba(125,224,200,.34); }
.kk-cell-cross{
  background:linear-gradient(135deg, rgba(255,201,77,.55), rgba(255,143,196,.55));
}
.kk-cell-flash{ animation:kk-cellflash .9s ease; }
@keyframes kk-cellflash{
  0%{ box-shadow:0 0 0 0 rgba(255,201,77,0); transform:scale(1); }
  30%{ box-shadow:0 0 0 6px rgba(255,201,77,.55); transform:scale(1.18); }
  100%{ box-shadow:0 0 0 0 rgba(255,201,77,0); transform:scale(1); }
}

.kk-memo-footer{
  text-align:center; font-family:'Yomogi'; font-size:12px;
  color:var(--plum-soft,#7A5C98); padding:8px 16px 16px; flex-shrink:0;
  border-top:1px dashed rgba(201,168,240,.4); margin-top:4px;
}

/* ---- きせかえ：ルナにつけたアイテムのバッジ ---- */
.kk-equip-badge{
  position:absolute; transform:translate(-50%,-50%);
  background:rgba(255,255,255,.92); border:2px solid #fff;
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  box-shadow:0 3px 8px rgba(74,45,107,.3);
  animation:kk-badgepop .35s ease;
}
@keyframes kk-badgepop{0%{transform:translate(-50%,-50%) scale(0)}70%{transform:translate(-50%,-50%) scale(1.25)}100%{transform:translate(-50%,-50%) scale(1)}}

/* ---- コーデ画面 ---- */
.kk-dress-screen{display:flex; flex-direction:column; align-items:center; text-align:center;}
.kk-dress-stage{
  background:linear-gradient(180deg,var(--night),var(--night-deep));
  border-radius:26px; padding:16px; margin-bottom:16px;
  display:flex; justify-content:center; box-shadow:inset 0 0 30px rgba(0,0,0,.25);
  width:100%;
}
.kk-dress-slots{display:grid; grid-template-columns:repeat(5,1fr); gap:8px; width:100%; margin-bottom:10px;}
.kk-slot-btn{
  display:flex; flex-direction:column; align-items:center; gap:4px;
  background:#fff; border:3px solid var(--lav); border-radius:16px;
  padding:10px 2px 8px; cursor:pointer; box-shadow:0 4px 0 rgba(201,168,240,.7);
}
.kk-slot-btn:active{transform:translateY(2px); box-shadow:0 2px 0 rgba(201,168,240,.7);}
.kk-slot-filled{border-color:var(--rose-deep); box-shadow:0 4px 0 rgba(232,95,163,.5);}
.kk-slot-empty-disabled{opacity:.45; border-color:#ccc; box-shadow:none; cursor:default;}
.kk-slot-icon{height:32px; display:flex; align-items:center; justify-content:center;}
.kk-slot-plus{font-size:18px; color:var(--lav); font-weight:900;}
.kk-slot-label{font-family:'Mochiy Pop One'; font-size:10.5px; color:var(--night);}
.kk-dress-hint{font-family:'Yomogi'; font-size:12.5px; color:var(--plum-soft,#7A5C98); margin:4px 0 18px;}
.kk-dress-link-btn{font-size:18px; padding:13px 32px;}

/* ---- アイテム選択シート ---- */
.kk-picker-sheet{
  width:100%; max-width:500px;
  background:linear-gradient(170deg,#FFF8FE 0%,#F3E8FD 60%,#EDE0F9 100%);
  border-radius:26px 26px 0 0; box-shadow:0 -8px 32px rgba(74,45,107,.28);
  max-height:78vh; display:flex; flex-direction:column;
  animation:kk-slideup .28s cubic-bezier(.2,1,.4,1); border-top:4px solid var(--lav);
}
.kk-picker-grid{
  display:grid; grid-template-columns:repeat(3,1fr); gap:10px;
  padding:14px 14px 20px; overflow-y:auto;
}
.kk-picker-chip{
  display:flex; flex-direction:column; align-items:center; gap:4px;
  background:#fff; border:3px solid #EADCF9; border-radius:16px;
  padding:10px 4px; cursor:pointer; min-height:90px; justify-content:center;
}
.kk-picker-chip:active{transform:translateY(2px);}
.kk-picker-selected{border-color:var(--rose-deep); background:#FFF0F7; box-shadow:0 0 0 3px rgba(232,95,163,.25);}
.kk-picker-name{font-family:'Zen Maru Gothic'; font-weight:700; font-size:10.5px; color:var(--night); text-align:center; line-height:1.3;}
.kk-picker-none{font-family:'Mochiy Pop One'; font-size:14px; color:var(--plum-soft,#7A5C98);}

/* ---- キャラクター せんたく ---- */
.kk-select-screen{display:flex; flex-direction:column; align-items:center; text-align:center;}
.kk-char-grid{display:flex; flex-direction:column; gap:14px; width:100%; max-width:420px;}
.kk-char-card{
  display:flex; align-items:center; gap:14px; text-align:left;
  background:#fff; border:3px solid var(--lav); border-radius:22px;
  padding:12px 16px; cursor:pointer; box-shadow:0 5px 0 rgba(201,168,240,.5);
}
.kk-char-card:active{transform:translateY(3px); box-shadow:0 2px 0 rgba(201,168,240,.5);}
.kk-char-card-active{background:#FFF6FB;}
.kk-char-preview{flex-shrink:0; width:78px; display:flex; justify-content:center;}
.kk-char-name{font-family:'Mochiy Pop One'; font-size:18px; color:var(--night);}
.kk-char-title{font-family:'Mochiy Pop One'; font-size:12.5px; margin-top:2px;}
.kk-char-sub{font-family:'Yomogi'; font-size:11.5px; color:var(--plum-soft,#7A5C98); margin-top:3px; line-height:1.4;}

/* ---- リビール：コーデへの導線 ---- */
.kk-reveal-prompt{font-family:'Mochiy Pop One'; font-size:14px; color:var(--plum); margin:2px 0 12px;}
.kk-reveal-btnrow{display:flex; gap:10px; width:100%; justify-content:center;}
.kk-reveal-btn-half{flex:1; font-size:16px; padding:14px 8px; margin:0;}

/* ---- たしざん／ひきざん／10づくり の ビジュアル ---- */
.kk-twocluster{display:flex; align-items:center; justify-content:center; gap:10px; width:100%; flex-wrap:wrap;}
.kk-cluster-box{display:flex; flex-wrap:wrap; gap:4px; align-items:center; justify-content:center; border-radius:16px; padding:10px; min-width:60px; min-height:46px; max-width:160px;}
.kk-cluster-op{font-family:'Mochiy Pop One'; font-size:24px; color:var(--rose-deep);}
.kk-crossout-box{display:flex; flex-wrap:wrap; gap:5px; justify-content:center; max-width:280px; margin:0 auto;}
.kk-crossout-item{position:relative; display:flex; align-items:center; justify-content:center;}
.kk-crossout-item.kk-crossed{opacity:.35;}
.kk-crossout-item.kk-crossed::after{
  content:""; position:absolute; inset:-2px; pointer-events:none;
  background:linear-gradient(45deg, transparent 46%, var(--rose-deep) 46%, var(--rose-deep) 54%, transparent 54%),
             linear-gradient(-45deg, transparent 46%, var(--rose-deep) 46%, var(--rose-deep) 54%, transparent 54%);
}
.kk-fillten-box{display:grid; grid-template-columns:repeat(5,1fr); gap:6px; max-width:220px; margin:0 auto; padding:10px; border-radius:16px;}
.kk-fillten-item{display:flex; align-items:center; justify-content:center;}
.kk-fillten-slot{width:17px; height:17px; border-radius:50%; border:2px dashed rgba(74,45,107,.35); margin:auto;}

/* ---- ひっさんメモ ---- */
.kk-colmemo-sheet{max-height:88vh; overflow-y:auto;}
.kk-colmemo-body{display:flex; flex-direction:column; align-items:center; padding:6px 16px 20px;}

/* ---- 5の まとまりと のこり ---- */
.kk-fivesplit-row{display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:8px;}
.kk-fivesplit-block{display:flex; flex-direction:column; align-items:center; gap:6px;}
.kk-fivesplit-plus{font-family:'Mochiy Pop One'; font-size:22px; color:var(--rose-deep);}
.kk-fivesplit-label{font-family:'Mochiy Pop One'; font-size:13px; color:var(--night); background:#F3ECFB; border-radius:10px; padding:3px 10px;}
.kk-fivesplit-label b{color:var(--rose-deep);}
.kk-fivesplit-caption{margin-bottom:16px !important;}
.kk-fiveframe{display:flex; flex-direction:column; gap:4px; background:#fff; border-radius:14px; padding:8px 10px; box-shadow:0 3px 0 rgba(201,168,240,.4);}
.kk-fiveframe-row{display:flex; gap:4px;}
.kk-fiveframe-row2{padding-top:2px; border-top:1px dashed rgba(74,45,107,.25);}
.kk-fiveframe-dot{width:14px; height:14px; border-radius:50%; display:inline-block;}
.kk-fiveframe-dot-main{background:var(--gold); box-shadow:0 1px 2px rgba(242,169,59,.6);}
.kk-fiveframe-dot-empty{border:2px dashed rgba(74,45,107,.3); width:10px; height:10px; margin:2px;}
.kk-fiveframe-dot-extra{background:var(--rose-deep);}
.kk-col-grid{display:flex; flex-direction:column; align-items:flex-end; gap:2px; margin-bottom:14px;}
.kk-col-row{display:flex; gap:6px;}
.kk-col-cell{
  width:48px; height:48px; display:flex; align-items:center; justify-content:center;
  font-family:'Mochiy Pop One'; font-size:24px; color:var(--night);
  position:relative;
}
.kk-col-blank{visibility:hidden;}
.kk-col-op{color:var(--rose-deep); font-size:22px;}
.kk-col-carryrow .kk-col-cell{width:48px; height:32px; font-size:16px;}
.kk-col-carryval{color:var(--rose-deep); font-weight:900;}
.kk-col-line{width:108px; height:3px; background:var(--plum); border-radius:2px; margin:2px 0;}
.kk-col-answer .kk-col-cell{color:var(--rose-deep);}
.kk-col-mystery{color:var(--gold); -webkit-text-stroke:1.5px var(--goldDeep,#F2A93B); font-size:26px;}
.kk-col-strike{text-decoration:line-through; text-decoration-color:rgba(74,45,107,.6); text-decoration-thickness:2px;}
.kk-col-small{position:absolute; top:-4px; right:-2px; font-size:14px; color:var(--rose-deep); text-decoration:none; font-weight:900;}
.kk-colmemo-caption{font-family:'Zen Maru Gothic'; font-weight:700; font-size:13.5px; color:var(--plum); text-align:center; line-height:1.8; max-width:280px;}
.kk-colmemo-caption b{color:var(--rose-deep); font-family:'Mochiy Pop One'; font-size:15px;}
.kk-col-flash{animation:kk-flashglow 1s ease-out;}
@keyframes kk-flashglow{
  0%{box-shadow:0 0 0 0 rgba(255,201,77,0); transform:scale(1);}
  30%{box-shadow:0 0 14px 6px rgba(255,201,77,.9); transform:scale(1.18);}
  100%{box-shadow:0 0 0 0 rgba(255,201,77,0); transform:scale(1);}
}

/* ---- ものがたりの たっせい イベント ---- */
.kk-milestone-card{
  background:linear-gradient(180deg,#fff,#FFF6FB); border-radius:28px;
  padding:18px 18px 22px; text-align:center; max-width:340px; width:100%;
  box-shadow:0 14px 40px rgba(0,0,0,.4); animation:kk-pop .35s ease;
}
.kk-milestone-title{font-family:'Mochiy Pop One'; font-size:17px; color:var(--night); margin-bottom:10px;}
.kk-milestone-stage{position:relative; border-radius:18px; overflow:hidden; margin-bottom:12px; box-shadow:0 3px 10px rgba(74,45,107,.2);}
.kk-milestone-char{position:absolute; bottom:-4px; left:50%; transform:translateX(-50%); filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));}
.kk-milestone-text{font-family:'Zen Maru Gothic'; font-weight:700; font-size:14.5px; color:var(--plum); line-height:1.7; margin-bottom:8px;}
.kk-milestone-bonus{font-family:'Mochiy Pop One'; font-size:15px; color:var(--rose-deep); margin-bottom:14px;}

@media (max-width:380px){
  .kk-logo{font-size:28px;}
  .kk-q-main{font-size:38px;}
  .kk-opt{font-size:26px;}
  .kk-memo-cell{font-size:12px; padding:5px 1px;}
  .kk-memo-danlabel{font-size:11px;}
  .kk-slot-label{font-size:9px;}
  .kk-col-cell{width:38px; height:42px; font-size:20px;}
  .kk-col-line{width:88px;}
}
@media (prefers-reduced-motion: reduce){
  .kk-star,.kk-witch-float,.kk-witch-stage,.kk-magic-circle,.kk-reveal-rays,.kk-pop,.kk-sparkle,.kk-cell-flash,.kk-equip-badge,.kk-col-flash,.kk-milestone-card{animation:none !important;}
}
.kk-icon-btn:focus-visible,.kk-big-btn:focus-visible,.kk-opt:focus-visible,.kk-dan-btn:focus-visible,.kk-text-btn:focus-visible,.kk-gametype-card:focus-visible{outline:3px solid var(--rose-deep); outline-offset:3px;}
`}</style>
  );
}
