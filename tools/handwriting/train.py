import numpy as np, json, base64, time
from scipy import ndimage
rng = np.random.default_rng(0)
d = np.load("mnist_raw.npz"); X, Y = d["X"], d["Y"]

def normalize(img):
    ys, xs = np.where(img > 0.1)
    if len(ys) == 0: return np.zeros((20, 20), np.float32)
    c = img[ys.min():ys.max()+1, xs.min():xs.max()+1]
    h, w = c.shape; s = 16.0 / max(h, w)
    nh, nw = max(1, round(h*s)), max(1, round(w*s))
    z = ndimage.zoom(c, (nh/h, nw/w), order=1)
    z = np.clip(z, 0, 1)
    out = np.zeros((20, 20), np.float32)
    oy, ox = (20-z.shape[0])//2, (20-z.shape[1])//2
    out[oy:oy+z.shape[0], ox:ox+z.shape[1]] = z
    if out.sum() > 0:
        cy, cx = ndimage.center_of_mass(out)
        out = ndimage.shift(out, (9.5-cy, 9.5-cx), order=1, mode="constant")
    return np.clip(out, 0, 1)

def augment(img):
    a = np.deg2rad(rng.uniform(-14, 14)); sh = rng.uniform(-0.3, 0.3)
    sx, sy = rng.uniform(0.75, 1.25), rng.uniform(0.85, 1.15)
    M = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) @ np.array([[1, sh], [0, 1]]) @ np.diag([sy, sx])
    Mi = np.linalg.inv(M); c = np.array([13.5, 13.5])
    big = np.zeros((40, 40), np.float32); big[6:34, 6:34] = img
    c = np.array([19.5, 19.5])
    out = ndimage.affine_transform(big, Mi, offset=c - Mi @ c, order=1)
    r = rng.random()
    if r < 0.3: out = ndimage.grey_dilation(out, size=(2, 2))
    elif r < 0.45: out = ndimage.grey_erosion(out, size=(2, 2))
    if rng.random() < 0.5: out = ndimage.gaussian_filter(out, rng.uniform(0.3, 0.7)); out = np.clip(out * 1.4, 0, 1)
    return out

idx = rng.permutation(len(X)); te, tr = idx[:1000], idx[1000:]
t = time.time()
Xte = np.stack([normalize(X[i]) for i in te]).reshape(-1, 400)
Xtr_clean = np.stack([normalize(X[i]) for i in tr]).reshape(-1, 400)
AUG = 7
Xa = [Xtr_clean]; Ya = [Y[tr]]
for k in range(AUG):
    Xa.append(np.stack([normalize(augment(X[i])) for i in tr]).reshape(-1, 400)); Ya.append(Y[tr])
Xtr = np.concatenate(Xa); Ytr = np.concatenate(Ya)
Xte_aug = np.stack([normalize(augment(X[i])) for i in te]).reshape(-1, 400)
print("data", Xtr.shape, round(time.time()-t), "s; mean ink", Xtr_clean.sum(1).mean())
np.save("mean_ink.npy", np.array([Xtr_clean[Y[tr]==k].sum(1).mean() for k in range(10)]))

H = 128
W1 = rng.normal(0, np.sqrt(2/400), (400, H)).astype(np.float32); b1 = np.zeros(H, np.float32)
W2 = rng.normal(0, np.sqrt(2/H), (H, 10)).astype(np.float32); b2 = np.zeros(10, np.float32)
P = [W1, b1, W2, b2]; Mo = [np.zeros_like(p) for p in P]; Vo = [np.zeros_like(p) for p in P]
def fwd(x, P):
    h = np.maximum(0, x @ P[0] + P[1]); return h, h @ P[2] + P[3]
step = 0; lr = 2e-3
for ep in range(25):
    perm = rng.permutation(len(Xtr))
    for s in range(0, len(perm), 128):
        b = perm[s:s+128]; x = Xtr[b]; y = Ytr[b]
        x = x * rng.uniform(0.8, 1.0)  # 濃さゆらぎ
        h, z = fwd(x, P)
        z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
        g = p; g[np.arange(len(y)), y] -= 1; g /= len(y)
        gW2 = h.T @ g; gb2 = g.sum(0); gh = g @ P[2].T; gh[h <= 0] = 0
        gW1 = x.T @ gh + 1e-4 * P[0]; gb1 = gh.sum(0)
        step += 1
        for i, gr in enumerate([gW1, gb1, gW2, gb2]):
            Mo[i] = 0.9*Mo[i] + 0.1*gr; Vo[i] = 0.999*Vo[i] + 0.001*gr*gr
            P[i] -= lr * (Mo[i]/(1-0.9**step)) / (np.sqrt(Vo[i]/(1-0.999**step)) + 1e-8)
    if ep in (14, 20): lr *= 0.3
    acc = (fwd(Xte, P)[1].argmax(1) == Y[te]).mean(); acca = (fwd(Xte_aug, P)[1].argmax(1) == Y[te]).mean()
    print(ep, "test", acc, "aug", acca, flush=True)

# int8 量子化
def q(W):
    sc = np.abs(W).max() / 127.0
    return np.round(W / sc).astype(np.int8), float(sc)
q1, s1 = q(P[0]); q2, s2 = q(P[2])
Pq = [q1.astype(np.float32)*s1, P[1], q2.astype(np.float32)*s2, P[3]]
print("quant test", (fwd(Xte, Pq)[1].argmax(1) == Y[te]).mean(), "aug", (fwd(Xte_aug, Pq)[1].argmax(1) == Y[te]).mean())
model = {"in": 400, "hidden": H, "w1": base64.b64encode(q1.tobytes()).decode(), "s1": s1, "b1": [round(float(v), 5) for v in P[1]],
         "w2": base64.b64encode(q2.tobytes()).decode(), "s2": s2, "b2": [round(float(v), 5) for v in P[3]]}
json.dump(model, open("../../src/handwriting/digitModel.json", "w"))
np.savez("testset.npz", X=Xte[:50], Y=Y[te][:50], raw=X[te][:50])
print("saved")
