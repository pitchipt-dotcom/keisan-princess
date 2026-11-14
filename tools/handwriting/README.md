# てがき数字にんしき の 学習

`src/handwriting/digitModel.json` を つくる スクリプトです（アプリを 動かすだけなら 不要）。

- データ: npm の `mnist` パッケージ（MIT, MNIST の 1万枚）
- モデル: 20x20 → 128 → 10 の 小さな ニューラルネット（重みは int8、約70KB）
- 端末の 中だけで 動き、通信は しません

```bash
cd tools/handwriting
npm pack mnist && tar xzf mnist-*.tgz          # package/src/digits/*.json
python3 prep.py package/src/digits            # → mnist_raw.npz
python3 train.py                              # → ../../src/handwriting/digitModel.json
```

必要なもの: Python3 + numpy + scipy。テスト正解率は 約98%（ゆがめた 字で 約96%）。
