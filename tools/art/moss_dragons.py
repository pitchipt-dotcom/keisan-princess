#!/usr/bin/env python3
"""ドラゴンそだて の 絵 12 枚を、ローカルの MOSS-Image(ComfyUI API)で作る。

  {fire, water, light} × {egg, baby, child, adult} → art-raw/dragons/{element}_{stage}.png (1024px)
  そのあと  tools/art/.venv/bin/python tools/art/process.py dragons  で 背景を抜いて
  src/art/dragons/*.webp (512px) にする。

- MOSS-Image は /home/zuwa/AI/moss-image の ./start.sh で起動しておく(ポートは run/server.json)。
  おわったら /free と ./stop.sh で止める。このスクリプトは 起動・停止は しない。
- 同じ ぞくせいの 4 枚は、seed と 色の指定を そろえる(同じ ドラゴンに 見えるように)。
- 作った絵の プロンプト・seed は art-raw/dragons/_moss.json に のこす。
- 使い方:
    python3 tools/art/moss_dragons.py                 # 12 枚(すでに ある絵は とばす)
    python3 tools/art/moss_dragons.py fire_adult      # その 1 枚だけ 作りなおす
    python3 tools/art/moss_dragons.py fire_adult --seed 7111   # seed を かえて 作りなおす
    python3 tools/art/moss_dragons.py --sheet         # 一覧画像(art-raw/_dragons_sheet.png)だけ 作る
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
RAW = ROOT / "art-raw" / "dragons"
OUT = ROOT / "src" / "art" / "dragons"
MOSS = Path("/home/zuwa/AI/moss-image")
LOG = RAW / "_moss.json"

COMMON = ("cute chibi fantasy creature for a children's learning game app, kawaii, soft pastel colors, "
          "big sparkling eyes, rounded shapes, clean thick outlines, soft cel shading, full body, centered, "
          "single character, plain white background, no text, no watermark")
# たまご用：共通指定から「いきもの」を思わせる 3 語(cute chibi fantasy creature / big sparkling eyes /
# single character)を「もの」の言い方に かえる。negative だけでは 2 回とも たまごに 顔が 出たため。
COMMON_EGG = ("cute kawaii fantasy object for a children's learning game app, soft pastel colors, "
              "rounded shapes, clean thick outlines, soft cel shading, full view, centered, "
              "single object, plain white background, no text, no watermark")
NEGATIVE = "scary, realistic, dark, blood, sharp teeth, multiple characters, text, cropped"
NEGATIVE_EGG = NEGATIVE + ", face, eyes, mouth, smile, creature peeking out, hatching, cracked shell"

ELEMENTS = {
    "fire": {
        "seed": 7101,
        "color": "warm coral red and orange",
        "traits": "dragon with warm coral red and orange scales, small flame-shaped tail tip, tiny golden horns",
    },
    "water": {
        "seed": 7202,
        "color": "aqua and sky blue",
        "traits": "dragon with aqua and sky blue scales, fin-like ears, small bubbles around, pearl on forehead",
    },
    "light": {
        "seed": 7303,
        "color": "cream white and pale gold",
        "traits": "dragon with cream white and pale gold scales, small feathered wings, little star mark on chest, soft glow",
    },
}
STAGES = {
    # たまごは 共通指定の big sparkling eyes に ひっぱられて 顔が 出たので、顔なしを はっきり 書く(1回目は 3枚とも 顔つき)
    "egg": "a single dragon egg with {color} patterns, sitting on a tiny nest, no creature visible, "
           "an unhatched smooth egg shell with no face, no eyes and no mouth",
    "baby": "a newborn tiny {traits}, a piece of eggshell on its head, sitting",
    "child": "a small young {traits}, standing, small wings opened, cheerful",
    "adult": "a graceful grown {traits}, wings spread, still cute and friendly, not scary",
}


def prompt_for(element, stage):
    e = ELEMENTS[element]
    return STAGES[stage].format(color=e["color"], traits=e["traits"]) + ", " + (COMMON_EGG if stage == "egg" else COMMON)


def graph(prompt, seed, prefix, negative=NEGATIVE):
    # /home/zuwa/AI/moss-image/workflows/test_A_api.json と 同じ 通常設定(25 steps, CFG 2.5, er_sde/simple)
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "moss_image_sft_int8_convrot.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3.5_9b_int8_convrot.safetensors", "type": "moss_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux2-vae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["2", 0]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["2", 0]}},
        "6": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "7": {"class_type": "KSampler", "inputs": {"seed": seed, "steps": 25, "cfg": 2.5, "sampler_name": "er_sde", "scheduler": "simple",
                                                   "denoise": 1.0, "model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["6", 0]}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": prefix, "images": ["8", 0]}},
    }


def base_url():
    info = json.loads((MOSS / "run" / "server.json").read_text())
    port = info.get("port", 8190)
    return f"http://127.0.0.1:{port}"


def call(base, path, body=None, raw=False, timeout=60):
    req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"} if body is not None else {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if raw else json.loads(data)


def render(base, key, seed):
    element, stage = key.split("_")
    prompt = prompt_for(element, stage)
    negative = NEGATIVE_EGG if stage == "egg" else NEGATIVE
    t0 = time.time()
    pid = call(base, "/prompt", {"prompt": graph(prompt, seed, f"keisan_dragons/{key}_s{seed}", negative)})["prompt_id"]
    while True:
        time.sleep(3)
        h = call(base, f"/history/{pid}")
        if pid not in h:
            if time.time() - t0 > 900:
                raise SystemExit(f"{key}: 15分たっても おわらない")
            continue
        st = h[pid].get("status", {})
        if st.get("status_str") == "error":
            raise SystemExit(f"{key}: 生成エラー {json.dumps(st)[:600]}")
        if st.get("status_str") == "success" or st.get("completed"):
            imgs = [i for o in h[pid]["outputs"].values() for i in o.get("images", [])]
            img = imgs[0]
            q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
            png = call(base, f"/view?{q}", raw=True, timeout=120)
            RAW.mkdir(parents=True, exist_ok=True)
            (RAW / f"{key}.png").write_bytes(png)
            log = json.loads(LOG.read_text()) if LOG.exists() else {}
            log.setdefault(key, []).append({"seed": seed, "prompt": prompt, "negative": negative, "sec": round(time.time() - t0, 1),
                                            "at": time.strftime("%Y-%m-%d %H:%M:%S")})
            LOG.write_text(json.dumps(log, ensure_ascii=False, indent=1))
            print(f"ok   {key} seed={seed} {time.time() - t0:.0f}s", flush=True)
            return


def sheet():
    """4 列(だんかい)× 3 行(ぞくせい)の 一覧。左半分 白・右半分 こい紫 の上に置いて 抜けを 見る。"""
    from PIL import Image, ImageDraw, ImageFont
    cell, pad, label = 256, 8, 26
    stages, elements = list(STAGES), list(ELEMENTS)
    W, H = len(stages) * cell, len(elements) * (cell + label) + label
    im = Image.new("RGB", (W, H), "#FFF6FB")
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    except OSError:
        font = ImageFont.load_default()
    for c, st in enumerate(stages):
        d.text((c * cell + 8, 5), st, fill="#4A2D6B", font=font)
    for r, el in enumerate(elements):
        for c, st in enumerate(stages):
            x, y = c * cell, label + r * (cell + label)
            d.rectangle([x, y, x + cell // 2, y + cell], fill="#FFFFFF")
            d.rectangle([x + cell // 2, y, x + cell, y + cell], fill="#4A2D6B")
            f = OUT / f"{el}_{st}.webp"
            if f.exists():
                t = Image.open(f).convert("RGBA").resize((cell - 2 * pad, cell - 2 * pad), Image.Resampling.LANCZOS)
                im.paste(t, (x + pad, y + pad), t)
            d.text((x + 6, y + cell + 4), f"{el}_{st}", fill="#4A2D6B", font=font)
    path = ROOT / "art-raw" / "_dragons_sheet.png"
    im.save(path)
    print(f"一覧 → {path}")


def main():
    args = sys.argv[1:]
    if "--sheet" in args:
        sheet()
        return
    seed_override = None
    if "--seed" in args:
        i = args.index("--seed")
        seed_override = int(args[i + 1])
        del args[i:i + 2]
    keys = args or [f"{e}_{s}" for e in ELEMENTS for s in STAGES]
    base = base_url()
    call(base, "/system_stats")
    for key in keys:
        e, s = key.split("_")
        assert e in ELEMENTS and s in STAGES, key
        if not args and (RAW / f"{key}.png").exists():
            print(f"skip {key} (ある)")
            continue
        render(base, key, seed_override if seed_override is not None else ELEMENTS[e]["seed"])


if __name__ == "__main__":
    main()
