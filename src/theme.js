/* =====================================================================
   テーマ（けいさんプリンセス ／ けいさんプリンス）— 絵・名前・セリフ だけを さしかえる
   - ゲームの しくみ・問題・モード・ポイントは かえない。キャラや アイテムの id（セーブの きごう）も そのまま
   - セーブの theme キー（"princess" | "prince"）。無い セーブ・バックアップコードは princess
   - 絵：もとの 名前の すえに "_prince" を つけた .webp が あれば それ、無ければ 今の（共通の）絵
       例 src/art/dragons/fire_adult_prince.webp、src/art/chars/witch_idle_prince.webp、
          src/art/items/p_wand_prince.webp、src/assets/fairy/fairy-mint-bust_prince.webp
   - princess に 書いて いない ものは、各ファイルに ある 今の 文の まま（princess は 今と 同じ）
   ===================================================================== */
import { useSyncExternalStore } from "react";

export const THEME_IDS = ["princess", "prince"];
export const normalizeTheme = (t) => (t === "prince" ? "prince" : "princess");

export const THEMES = {
  princess: {
    id: "princess",
    label: "プリンセス",
    icon: "👑",
    appTitle: "けいさんプリンセス",
    words: {
      titleSub: ["すきな こを えらんで、", "すてきな おしゃれを あつめよう！"],
      coord: "コーデ",                 // 〇〇の コーデ
      collection: "おしゃれ",          // あつめた おしゃれ
      dressIcon: "👗",
      dressHint: "あつめた アイテムを タップして、すきな コーデに しよう♪",
      revealPrompt: "コーデの きせかえを 見てみる？",
    },
    chars: {},                         // 今の CHARACTERS の まま
    items: {},                         // 今の アイテム名の まま
    milestones: {},
    stageLabel: {},
    // イベント「ぶとうかい」の 勝ち負け（event-modes ブランチの イベントモードが main に 入ったら つかう）
    ballEvent: { title: "ぶとうかい", win: "じょうずに おどれた！", lose: "ころんじゃった…！" },
    names: {},                         // おはなし もんだいの 名前
    fairy: { lines: {}, praise: {} },
  },

  prince: {
    id: "prince",
    label: "プリンス",
    icon: "🛡️",
    appTitle: "けいさんプリンス",
    words: {
      titleSub: ["すきな こを えらんで、", "かっこいい そうびを あつめよう！"],
      coord: "そうび",
      collection: "そうび",
      dressIcon: "🛡️",
      dressHint: "あつめた アイテムを タップして、かっこよく そうび しよう！",
      revealPrompt: "そうびを つけて 見てみる？",
    },
    chars: {
      witch: { charaName: "ソル", label: "まほうつかい", title: "まほうの そうび", sub: "ふしぎな まほうの そうびを あつめよう" },
      mermaid: { charaName: "カイ", label: "うみの おうじ", title: "うみの たからの そうび", sub: "うみの なかの たからものを あつめよう" },
      princess: { charaName: "レオ", label: "プリンス", title: "おしろの そうび", sub: "おしろに ぴったりな よろいを あつめよう" },
      // 名前は 仮（ゴリラ王子(仮)）。きまったら ここを さしかえる
      gorilla: { charaName: "ゴリラ王子(仮)", label: "ゴリラの プリンス", title: "もりの そうび", sub: "ちからもちで やさしい もりの そうびを あつめよう" },
    },
    // そうび：id は そのまま、名前と ひとことだけ（絵が 無い ものは 今の 絵）
    items: {
      // まほうつかい ソル
      ribbon: ["ほしの バンダナ", "まくと やる気が でる！"],
      starpin: ["ほしの ピン", "キラッと 光るよ"],
      minihat: ["まほうつかいの ぼうし", "かぶると まほうが つよくなる"],
      tiara: ["ほしの かんむり", "今日の きみは おうじさま"],
      dress: ["よぞらの ローブ", "ばさっと ひるがえる"],
      cape: ["よぞらの マント", "風で ばさっと なびく"],
      socks: ["ほしがらの くつした", "足もとも かっこよく"],
      boots: ["まほうの ブーツ", "遠くまで 歩けるよ"],
      wand: ["ほしの つえ", "ふると 星が とびだす！"],
      candy: ["にじいろ キャンディ", "食べたら まほうが 出る…？"],
      flower: ["まほうの 花", "いい においが するみたい"],
      crystal: ["ゆめみる クリスタル", "なかに 星が いるみたい"],
      necklace: ["月の ペンダント", "夜に そっと 光る"],
      moon: ["みかづきの おまもり", "ねがいごとが かなうかも"],
      cat: ["くろねこ ノワール", "まほうの あいぼう！"],
      wings: ["ドラゴンの つばさ", "空を びゅんと とべる！"],
      // うみの おうじ カイ
      m_shellclip: ["かいがらの バッジ", "むねを はって つけよう"],
      m_pearlband: ["しんじゅの はちまき", "しんじゅが ひかるよ"],
      m_starfishpin: ["ヒトデの ピン", "うみの ほしだよ"],
      m_coralcrown: ["さんごの かんむり", "うみの おうじの しるし"],
      m_scaledress: ["うろこの よろい", "なみにも まけない"],
      m_pearlcape: ["しんじゅの マント", "うみかぜに なびくよ"],
      m_finanklet: ["かいがらの あしわ", "あしもとも かっこよく"],
      m_pearlanklet: ["しんじゅの あしわ", "あるくたびに ひかるよ"],
      m_trident: ["うみの ほこ", "ふると なみが おこるよ"],
      m_seacandy: ["うみのほし キャンディ", "たべたら うみの あじ"],
      m_pearl: ["おおきな パール", "なかに ひかりが あるみたい"],
      m_shellbag: ["かいがらの たて", "どんな なみも ふせぐよ"],
      m_pearlnecklace: ["しんじゅの くびかざり", "むねもとで ゆれるよ"],
      m_moonshell: ["つきがたの シェル", "よるの うみで ひかるよ"],
      m_dolphin: ["ともの イルカ", "なかよしの あいぼう！"],
      m_bubblewings: ["あわの つばさ", "うみを とべちゃう！"],
      // プリンス レオ
      p_hairribbon: ["ゆうしゃの はちまき", "まくと やる気が でる！"],
      p_pearlpin: ["きしの バッジ", "きらりと 光るよ"],
      p_flowercrown: ["しょうりの かんむり", "かったら かぶれる はっぱの かんむり"],
      p_tiara: ["おうじの かんむり", "今日の きみは おうじさま"],
      p_balldress: ["きしの よろい", "ぴかぴかで じょうぶ"],
      p_cape: ["おうじの マント", "風で ばさっと なびく"],
      p_lacesocks: ["きしの すねあて", "足もとも まもるよ"],
      p_glassshoes: ["きしの ブーツ", "あるくと かつかつ ひびくよ"],
      p_wand: ["ゆうしゃの けん", "かかげると ひかる！"],
      p_candy: ["おしろの あめ", "おしろの あじが するよ"],
      p_rose: ["あかい バラ", "だいじな ひとに あげよう"],
      p_mirror: ["ひかりの たて", "まほうも はねかえす！"],
      p_necklace: ["おうじの メダル", "がんばった しるし"],
      p_moon: ["つきの おまもり", "ねがいごとが かなうかも"],
      p_kitten: ["ともの こねこ", "なかよしの あいぼう！"],
      p_angelwings: ["ペガサスの つばさ", "空を とべちゃう！"],
      // ゴリラの プリンス
      g_leafband: ["はっぱの はちまき", "まくと ちからが わいてくる！"],
      g_flowerpin: ["もりの はなの バッジ", "むねを はって つけよう"],
      g_acornclip: ["どんぐりの ピン", "ころんと かわいい"],
      g_forestcrown: ["はっぱの かんむり", "もりの おうじの しるし"],
      g_mossdress: ["ジャングルの うわぎ", "うごきやすくて じょうぶ"],
      g_leafcape: ["おおきな はっぱの マント", "あめも かぜも へっちゃら"],
      g_vinesocks: ["つたの サンダル", "ジャングルも へっちゃら"],
      g_forestboots: ["もりの ブーツ", "どしどし 歩けるよ"],
      g_banana: ["バナナの つえ", "かかげると ちからが わいてくる！"],
      g_honeypot: ["はちみつの つぼ", "ひとくちで げんき いっぱい"],
      g_bigacorn: ["おおきな どんぐり", "ポケットに いれて おこう"],
      g_drum: ["もりの たいこ", "どんどこ ひびくよ"],
      g_leafnecklace: ["バナナの ブローチ", "がんばった しるし"],
      g_sunstone: ["おひさまの おまもり", "ちからが わいて くるよ"],
      g_bird: ["ともの ことり", "かたに のって うたうよ"],
      g_leafwings: ["おおわしの つばさ", "空を びゅんと とべる！"],
    },
    // ものがたりの たっせい イベント（題と 文だけ。いつ 出るか・ボーナスは かえない）
    milestones: {
      ball: { title: "⚔️ ぶとうかい（武闘会）", text: (name) => `${name}は ぶとうかいに でられるように なったよ！` },
      complete: { text: (name) => `${name}の そうびが ぜんぶ あつまったよ！` },
    },
    stageLabel: { ball: "⚔️ ぶとうかいの じゅんび" },
    ballEvent: { title: "ぶとうかい（武闘会）", win: "勝てた！", lose: "こけちゃった…！" },
    names: { "ルナ": "ソル", "マリン": "カイ", "ロゼ": "レオ" },
    // 妖精：名前は 同じ。あいさつと ほめことばを すこし いさましく（ヒント・せつめいは 共通）
    fairy: {
      lines: {
        map: "ようこそ！ わたしは ミント。ようせいの くにを いっしょに ぼうけんしよう！",
        tsumiki: "つみきを ころがすと、紙に ついた マスに 色が つくよ。さあ、ちょうせんだ！",
        tsumikiCuboid: "2こ つなげた つみきも ころがせるように なったよ！ たったり ねたり するよ。いくぞ！",
        juice: "わたしは ラムネ！ ジュースを そそいで、L・dL・mL の かさを はかる しゅぎょうだ！",
        masume: "わたしは ポピー！ 花だんの 広さを、切ったり うごかしたり して「何ます分」か しらべに いこう！",
        hako: "わたしは ペタ！ はこを きって ひらいたり、おって くみたてたり する しゅぎょうだよ！",
        hakoCuboid: "直方体の はこにも ちょうせん できるよ！ 長い 面と みじかい 面が あるね",
      },
      praise: {
        juice: ["ぴったり！ みごとな うでまえ！", "すごい！ 目もりを よく 見ぬいたね！", "できた！ ラムネも かんしん！"],
        masume: ["ぴったり！ みごとに かぞえたね！", "すごい！ 何ます分か 見ぬいたね！", "できた！ ポピーも かんしん！"],
        tsumikiAll: ["ぜんぶ ぬれた！ みごと！", "やったね！ 盤を ぜんぶ せいはした！", "できた！ じょうずに ころがせたね！"],
        tsumikiOk: ["ぴったり！ よそうどおり だったね！", "すごい！ あたまの 中で ころがせたね！", "ばっちり！ ミントも かんしん！"],
        tsumikiOrder: ["点線の マスが ぜんぶ ぬれた！ じゅんばん 名人だ！", "できた！ もようと そっくり！", "すごい！ じゅんばんを 見ぬいたね！"],
      },
    },
  },
};

/* ---------- いまの テーマ（App が セーブから よんで きめる。どの 画面からも よめる） ---------- */
let current = "princess";
const subs = new Set();
export const getTheme = () => current;
export function setTheme(t) {
  const n = normalizeTheme(t);
  if (n === current) return;
  current = n;
  subs.forEach((fn) => fn());
}
const subscribe = (fn) => { subs.add(fn); return () => { subs.delete(fn); }; };
export const useThemeId = () => useSyncExternalStore(subscribe, getTheme, getTheme);
export const useTheme = () => THEMES[useThemeId()];

/* ---------- 絵：key + "_prince" が あれば それ、無ければ key（共通の 絵） ---------- */
export const ART_SUFFIX = { princess: "", prince: "_prince" };
export function themedArtKey(has, key, theme = current) {
  const s = ART_SUFFIX[normalizeTheme(theme)];
  if (s && has(key + s)) return key + s;
  return has(key) ? key : null;
}

/* ---------- 文字 ---------- */
export const themedChar = (c, theme = current) => ({ ...c, ...(THEMES[normalizeTheme(theme)].chars[c.id] || {}) });
export function themedItem(it, theme = current) {
  const o = THEMES[normalizeTheme(theme)].items[it.id];
  return o ? { ...it, name: o[0], flavor: o[1] } : it;
}
export const themedMilestone = (ms, theme = current) => ({ ...ms, ...(THEMES[normalizeTheme(theme)].milestones[ms.id] || {}) });
export const fairyLine = (key, fallback, theme = current) => THEMES[normalizeTheme(theme)].fairy.lines[key] || fallback;
export const fairyPraise = (key, fallback, theme = current) => THEMES[normalizeTheme(theme)].fairy.praise[key] || fallback;

/* おはなし もんだい：名前だけ さしかえる（数・文の 形・こたえは かえない）。もとの ものは かえずに 新しい ものを かえす */
export function renameText(s, theme = current) {
  const names = THEMES[normalizeTheme(theme)].names;
  let out = s;
  for (const [a, b] of Object.entries(names)) out = out.split(a).join(b);
  return out;
}
export function renameDeep(v, theme = current) {
  if (!Object.keys(THEMES[normalizeTheme(theme)].names).length) return v;
  if (typeof v === "string") return renameText(v, theme);
  if (Array.isArray(v)) return v.map((x) => renameDeep(x, theme));
  if (v && typeof v === "object") {
    const o = {};
    // 文を つくる 関数（おはなしの text(a, b) など）は、できた 文の 名前を さしかえる
    for (const [k, x] of Object.entries(v)) o[k] = typeof x === "function" ? (...args) => renameDeep(x(...args), theme) : renameDeep(x, theme);
    return o;
  }
  return v;
}
