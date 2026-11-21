/* =====================================================================
   モード選択メニュー：「どこから はじめよう？」の 4つの グループ（純粋データ。画面は App.jsx）
   - 1つの モードを 2つの グループに おいても、同じ モード・同じ セーブデータ（ここでは キーを ならべるだけ）
   - item は App の GAMETYPE_INFO の キー（九九・くりあがり など）か、ここの EXTRA_ITEMS の キー
   - 前に えらんだ グループは セーブの menuGroup に のこす（つぎに ひらいた とき すこし 目立たせる）
   ===================================================================== */
export const MENU_GROUPS = [
  // 1ねんせいは 学ぶ じゅんばん：かずと すうじ → 10までの けいさん → 10を つくろう → くりあがり → くりさがり
  { id: "g1", label: "1ねんせい", sub: "かずと すうじ・10までの けいさん・10を つくろう・くりあがり・くりさがり", icon: "🌱", color: "#3FB37F", bg: "#E8FAF0",
    items: ["kazu", "tashi10", "make10", "addCarry", "subBorrow"] },
  // まいにち けいさん（2年生）は チャレンジから ここへ うつした（中身・セーブ・ドラゴン・スタンプは そのまま）
  { id: "g2", label: "2ねんせい", sub: "まいにち けいさん・くりあがり・くりさがり・九九・ひっさん・おはなし", icon: "📘", color: "#4A86C5", bg: "#EAF3FF",
    items: ["daily", "addCarry", "subBorrow", "kuku", "write", "story"] },
  // 3年生：ボタンの 字は 漢字（1・2年生の 字は かえない）
  { id: "g3", label: "3年生", sub: "わり算・小数・分数・毎日計算", icon: "📗", color: "#7C5CC4", bg: "#F3EEFF",
    items: ["div", "dec", "frac", "daily3"] },
  // id は "challenge" の まま（セーブの menuGroup を こわさない）。名前だけ かえた
  { id: "challenge", label: "かたち・かさ チャレンジ", sub: "ようせいの くに・ドラゴン", icon: "🏆", color: "#E8721C", bg: "#FFF3E6", art: true,
    items: ["fairy", "dragon"] },
];

/* GAMETYPE_INFO に ない もの（もとは メニューの 下の ボタン）。カードの 見た目は 同じ */
export const EXTRA_ITEMS = {
  fairy: { label: "ようせいの くに たんけん", sub: "つみき・ジュース・ますめ・はこ", icon: "🧚", accent: "#9EE6B8" },
  dragon: { label: "ドラゴン", sub: "そだてた ドラゴンを 見る", icon: "🐉", accent: "#FFB38A" },
  // 3年生（grade3/）
  div: { label: "わり算", sub: "クッキーを 同じ数ずつ くばろう", icon: "🍪", accent: "#F2B880" },
  dec: { label: "小数", sub: "0.1Lずつ ジュースを そそごう", icon: "🧃", accent: "#FFA94D" },
  frac: { label: "分数", sub: "ケーキや ピザを 同じ 大きさに わけよう", icon: "🍰", accent: "#FF9EC4" },
  daily3: { label: "毎日計算", sub: "1日10もん・3年生の けいさん（ドラゴンも そだつ）", icon: "📅", accent: "#B49CF0" },
};
/* メニューで だけ 説明を かえる もの（モードの 中身は かえない） */
export const MENU_SUB = { daily: "1日10もん・ドラゴンを そだてよう" };

/* えらんだ ときの 行き先：screen … その 画面へ ／ game … ゲームを はじめる（mode は 九九の だん） */
export const ITEM_TARGET = {
  daily: { screen: "daily" },
  fairy: { screen: "fairy" },
  dragon: { screen: "dragon" },
  story: { screen: "storyPick" },          // ふつう／むずかしい を えらぶ 画面
  kazu: { screen: "g1Pick", pick: "kazu" },        // 段階 1〜4 を えらぶ 画面
  tashi10: { screen: "g1Pick", pick: "tashi10" },  // たしざん／ひきざん／まぜて を えらぶ 画面
  kuku: { game: "kuku", mode: "mix" },
  addCarry: { game: "addCarry" },
  subBorrow: { game: "subBorrow" },
  make10: { game: "make10" },
  write: { game: "write" },
  div: { screen: "g3unit", unit: "div" },
  dec: { screen: "g3unit", unit: "dec" },
  frac: { screen: "g3unit", unit: "frac" },
  daily3: { screen: "daily3" },
};

export const groupById = (id) => MENU_GROUPS.find((g) => g.id === id) || null;
export const normalizeGroup = (id) => (groupById(id) ? id : null);
/* あるモードが 入っている グループ（重ねて おいて ある ときは ぜんぶ） */
export const groupsOf = (item) => MENU_GROUPS.filter((g) => g.items.includes(item)).map((g) => g.id);
