# テーマ：けいさんプリンス

ゲームの しくみ・問題・モード・ポイントは かえず、絵・名前・セリフ だけを さしかえる。設定は `src/theme.js` に まとめて いる。

- えらぶ 場所：「だれで あそぶ？」の 画面の 上と、おうちのひとメニューの「テーマ」
- セーブ：`theme`（`"princess"` | `"prince"`）。無い セーブ・バックアップコードは プリンセス。キャラ・アイテムの id は かえないので、あつめた もの・そうび・ほしは そのまま
- 主人公：まじょ ルナ → まほうつかい ソル／にんぎょ マリン → うみの おうじ カイ／プリンセス ロゼ → プリンス レオ
- コーデ → そうび（48こ。id は そのまま 名前と ひとこと だけ）、ぶとうかい → ぶとうかい（武闘会）
- おはなし もんだい（ふつう・むずかしい）は 名前だけ さしかえ（数・文の 形・こたえは 同じ）
- 妖精：名前は 同じ。あいさつ 7文と ほめことば 15文を すこし いさましく。ヒント・せつめいは 共通
- 勝ち負けの セリフ（勝てた！／こけちゃった…！）は `THEMES.prince.ballEvent` に 用意。イベントモード（event-modes ブランチ）が main に 入ったら つかう

## 絵（まだ 無い ものは 共通の 絵が 出る）

名前：もとの 名前の すえに `_prince`（.webp）。

| しゅるい | ファイル | 数 |
|---|---|---|
| ドラゴン（こども・おとな。たまご・あかちゃんは 共通） | `src/art/dragons/{fire,water,light}_{child,adult}_prince.webp` | 6 |
| 主人公 | `src/art/chars/{witch,mermaid,princess}_{idle,happy,oops}_prince.webp` | 9 |
| 妖精（全身から 上半身・顔を 切りだす） | `src/assets/fairy/fairy-{mint,ramune,poppy,peta}{,-bust,-face}_prince.webp` | 4（生成） |
| そうび | `src/art/items/<id>_prince.webp` | 24 |

そうびで 新しく 絵を 作る もの（24）：ribbon, tiara, dress, socks, boots, wings, cat ／ m_shellclip, m_pearlband, m_scaledress, m_trident, m_shellbag ／ p_hairribbon, p_pearlpin, p_flowercrown, p_tiara, p_balldress, p_cape, p_lacesocks, p_glassshoes, p_wand, p_mirror, p_necklace, p_moon

生成：元の 絵と 同じ プロンプト・シードに `determined eyes, sharp eyebrows, confident smile, heroic pose, chest out, slightly cool and brave expression, same character design, same colors, cute, chibi` を たす（文字は 入れない）。じゅんばん：ドラゴン → 主人公 → 妖精 → そうび
