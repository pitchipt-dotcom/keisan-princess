# けいさんプリンセス

まじょ・にんぎょ・プリンセスと あそぶ さんすうゲーム。
九九・くりあがりのたしざん・くりさがりのひきざん・10づくりを、
おしゃれコレクション＆コーデで たのしく れんしゅう。

## ローカルで動かす

```bash
npm install
npm run dev
```

`http://localhost:5173` で開きます。

## 本番ビルド

```bash
npm run build
npm run preview   # ビルド結果をローカルで確認
```

## GitHub → Vercel デプロイ

1. このフォルダの内容を GitHub リポジトリに push
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
2. [vercel.com](https://vercel.com) で「Add New Project」→ そのリポジトリを Import
3. Framework Preset は **Vite** が自動検出されるはず（Build Command: `vite build` / Output Directory: `dist`）
4. Deploy するだけで公開されます

## ⚠️ セーブデータについて（重要）

Claude の Artifacts（プレビュー）上では `window.storage` という専用の保存先を
使っていましたが、このスタンドアロン版では一般的なブラウザの
**`localStorage`** を使うように書き換えています。

そのため：

- Artifacts 上でこれまで遊んでいたセーブデータは、**自動では** この
  デプロイ版に引っ越しません。
- Artifacts 版で「おうちのひとメニュー」→「バックアップコードを 出す」で
  コードをコピーし、デプロイ版の同じ画面の「もとに戻す」欄に貼り付ければ、
  進捗をそのまま引っ越せます。
- `localStorage` は **同じブラウザ・同じ端末** に保存されます。ブラウザの
  「閲覧データを削除」をすると消えてしまうので、時々バックアップコードを
  取っておくことを強くおすすめします。

