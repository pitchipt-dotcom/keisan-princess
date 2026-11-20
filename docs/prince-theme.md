# テーマ：けいさんプリンス

ゲームの しくみ・問題・モード・ポイントは かえず、絵・名前・セリフ だけを さしかえる。設定は `src/theme.js` に まとめて いる。

- えらぶ 場所：「だれで あそぶ？」の 画面の 上と、おうちのひとメニューの「テーマ」
- セーブ：`theme`（`"princess"` | `"prince"`）。無い セーブ・バックアップコードは プリンセス。キャラ・アイテムの id は かえないので、あつめた もの・そうび・ほしは そのまま
- 主人公：まじょ ルナ → まほうつかい ソル／にんぎょ マリン → うみの おうじ カイ／プリンセス ロゼ → プリンス レオ
- コーデ → そうび（48こ。id は そのまま 名前と ひとこと だけ）、ぶとうかい → ぶとうかい（武闘会）
- おはなし もんだい（ふつう・むずかしい）は 名前だけ さしかえ（数・文の 形・こたえは 同じ）
- 妖精：名前は 同じ。あいさつ 7文と ほめことば 15文を すこし いさましく。ヒント・せつめいは 共通
- 勝ち負けの セリフ（勝てた！／こけちゃった…！）は `THEMES.prince.ballEvent` に 用意。イベントモード（event-modes ブランチ）が main に 入ったら つかう

## 絵（`_prince` が 無い ものは 共通の 絵が 出る）

名前：もとの 名前の すえに `_prince`（.webp）。生成は Pitch-chat 経由の MOSS-Image（`tools/art/moss_prince.py`。プロンプト・seed は art-raw の `_moss.json`・`_prince.json` に のこる）。

| しゅるい | ファイル | 数 | 作り方 |
|---|---|---|---|
| ドラゴン（こども・おとな） | `src/art/dragons/{fire,water,light}_{child,adult}_prince.webp` | 6 | 元の プロンプト・seed ＋ 表情の 指定（水の おとなは 胸の ハートを negative で けした） |
| 主人公 | `src/art/chars/{witch,mermaid,princess}_{idle,happy,oops}_prince.webp` | 9 | 立ち絵は 新しく 生成（seed 8101/8202/8303。カイは slightly で よわめた）、表情は flux-klein で 立ち絵から |
| 妖精 | `src/assets/fairy/fairy-{mint,ramune,poppy,peta}{,-bust,-face}_prince.webp` | 4（＋切りだし 8） | ミント・ポピーは 元の プロンプト・seed ＋ 表情・マント。ラムネ・ペタは 元の 絵から flux-klein（顔と 色を のこすため） |
| そうび | `src/art/items/<id>_prince.webp` | 24 | 今の アイテムと 同じ 絵がらで 新しく（seed 9001〜9024、作りなおし 9025〜9027） |
| チャレンジの ボタン | ドラゴン（fire_child_prince）・ミント（bust_prince） | － | 上の 絵を つかう |

### まだ 共通の 絵の もの
- ドラゴンの たまご・あかちゃん（共通に する きまり）
- そうび 24こ（名前だけ かわる）：starpin, minihat, cape, wand, candy, flower, crystal, necklace, moon ／ m_starfishpin, m_coralcrown, m_pearlcape, m_finanklet, m_pearlanklet, m_seacandy, m_pearl, m_pearlnecklace, m_moonshell, m_dolphin, m_bubblewings ／ p_candy, p_rose, p_kitten, p_angelwings
- ものがたりの たっせい イベントの 場面の 絵（おしろ・ぶとうかい・たたかい・かんせい。SVG）
- 絵が 無い ときに 出る SVG の 主人公（ふだんは 出ない）

### 作りなおした そうび（seed は 9001〜9024 の つづき）
- p_moon_prince（つきの おまもり）seed 9025：くさりの 上の わまで 画像に おさまる ように 上に よはく
- m_shellbag_prince（かいがらの たて）seed 9026：ふちが なめらかに つながった たて
- p_lacesocks_prince（きしの すねあて）seed 9027：左右 1くみ・ひざから 足首・ベルトつき
