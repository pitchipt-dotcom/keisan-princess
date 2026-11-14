# MNIST(npm mnist パッケージ同梱の1万枚) -> 20x20 正規化データ (npz)
import json, sys, numpy as np
from scipy import ndimage
src = sys.argv[1]
X, Y = [], []
for d in range(10):
    v = np.array(json.load(open(f"{src}/{d}.json"))["data"], dtype=np.float32).reshape(-1, 28, 28)
    X.append(v); Y.append(np.full(len(v), d))
X = np.concatenate(X); Y = np.concatenate(Y)
np.savez_compressed("mnist_raw.npz", X=X, Y=Y)
print(X.shape, np.bincount(Y), "nonbinary frac", np.mean((X > 0) & (X < 1)))
