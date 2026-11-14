#!/usr/bin/env python3
"""art-raw/ の PNG を、背景を透明にした WebP にして src/art/ に出す。

  art-raw/items/*.png (320px) → src/art/items/*.webp
  art-raw/chars/*.png (640px) → src/art/chars/*.webp
  art-raw/scenes/*.png        → src/art/scenes/*.webp (イベントの一枚絵。背景は抜かず、はば 1024・quality 85)

- 背景は、画像のふちから塗りつぶして求める(ふちの中央値の色との距離で判定)。
- 色つき外わく+白い角丸タイルになった絵は、タイルの白も抜く。
- 輪郭ぎわは、背景色のにじみを取りのぞく。
- 余白をそろえて正方形にする。
- art-raw/_contact.png (全部の一覧) と、作り直したほうがよい絵の art-raw/_redo.json を出す。

使い方: tools/art/.venv/bin/python tools/art/process.py   (numpy と Pillow が必要)
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RAW = ROOT / "art-raw"
OUT = ROOT / "src" / "art"
SIZES = {"chars": 640, "items": 320}
BG_NEAR = 26.0      # この距離までは背景とみなす(囲まれた穴は、この半分まで)
EDGE_FULL = 70.0    # ふち 2px で、これ以上はなれた色は完全に不透明
MARGIN = 0.06       # 仕上がりの余白(1 辺あたり)
WEBP_QUALITY = 90
SCENE_WIDTH = 1024
SCENE_QUALITY = 85


def flood_from_border(candidate):
    """candidate のうち、画像のふちからつながっている部分。"""
    seed = np.zeros_like(candidate)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    return fill_touching(candidate, seed)


def grow(mask, n=1):
    """mask を n ピクセル広げる(4 近傍)。"""
    for _ in range(n):
        out = mask.copy()
        out[1:, :] |= mask[:-1, :]
        out[:-1, :] |= mask[1:, :]
        out[:, 1:] |= mask[:, :-1]
        out[:, :-1] |= mask[:, 1:]
        mask = out
    return mask


def fill_touching(candidate, seed):
    """candidate のうち、seed にふれている部分をつなげて取る。"""
    region = candidate & seed
    while True:
        bigger = grow(region) & candidate
        if bigger.sum() == region.sum():
            return region
        region = bigger


def cut_out(rgb, holes=True):
    """(RGBA の配列, 問題の一覧) を返す。"""
    pixels = rgb.astype(np.float32)
    h, w, _ = pixels.shape
    ring = np.concatenate([pixels[:3].reshape(-1, 3), pixels[-3:].reshape(-1, 3),
                           pixels[:, :3].reshape(-1, 3), pixels[:, -3:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)
    distance = np.sqrt(((pixels - bg) ** 2).sum(axis=2))
    background = flood_from_border(distance < BG_NEAR)
    # 絵に囲まれた背景(くさりの輪の中、2 つの物のすきま)も抜く。背景色にごく近く、
    # ある程度の大きさがある面だけ(目のハイライトや小さな白いかざりは残す)。
    # キャラは白いリボンなどが消えてしまうので、アイテムだけで行う(白いアイテムは背景がうす紫)。
    if holes:
        tight = (distance < BG_NEAR / 2) & ~background
        core = ~grow(~tight, max(2, round(min(h, w) * 0.012)))
        background |= fill_touching(tight, core)
    nearest = np.where(background, 0.0, distance)  # 背景でないところの、背景色との距離

    # 色つき外わく+白い角丸タイル: ふちの色が白でなく、残りが画面のほとんどを占めるとき、
    # 外わくに接している大きな白い面も背景として抜く。
    white = np.array([255.0, 255.0, 255.0], np.float32)
    tile = False
    if np.abs(bg - white).max() > 24 and (~background).mean() > 0.72:
        white_distance = np.sqrt(((pixels - white) ** 2).sum(axis=2))
        near_white = (white_distance < BG_NEAR) & ~background
        sheet = fill_touching(near_white, grow(background, 4))
        if sheet.mean() > 0.10:
            tile = True
            background |= sheet
            nearest = np.where(sheet, 0.0, np.minimum(nearest, white_distance))
            bg_map = np.where(grow(sheet, 3)[..., None], white, bg)
        else:
            bg_map = np.broadcast_to(bg, pixels.shape)
    else:
        bg_map = np.broadcast_to(bg, pixels.shape)

    # 輪郭ぎわ(背景から 2px 以内)は、背景色とまざっている分を取りのぞく。
    alpha = np.where(background, 0.0, 1.0).astype(np.float32)
    edge = grow(background, 2) & ~background
    soft = np.clip(nearest / EDGE_FULL, 0.0, 1.0)
    alpha = np.where(edge, soft, alpha)
    safe = np.maximum(alpha, 0.05)[..., None]
    clean = np.where(edge[..., None], bg_map + (pixels - bg_map) / safe, pixels)
    clean = np.clip(clean, 0, 255)

    problems = []
    solid = alpha > 0.5
    border = np.concatenate([solid[:2].ravel(), solid[-2:].ravel(), solid[:, :2].ravel(), solid[:, -2:].ravel()])
    if border.mean() > 0.01:
        problems.append("切れている(絵が画像のふちにかかっている)")
    coverage = solid.mean()
    if coverage > 0.80:
        problems.append("背景が抜けていない")
    elif coverage < 0.03:
        problems.append("絵がほとんど残っていない")
    rgba = np.dstack([clean, alpha * 255]).round().astype(np.uint8)
    return rgba, problems, tile


def square(rgba, size):
    """絵のまわりの余白をそろえて、正方形にする。"""
    image = Image.fromarray(rgba, "RGBA")
    box = Image.fromarray((rgba[..., 3] > 16).astype(np.uint8) * 255).getbbox()
    if box is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    image = image.crop(box)
    inner = round(size * (1 - 2 * MARGIN))
    scale = inner / max(image.size)
    image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(image, ((size - image.width) // 2, (size - image.height) // 2))
    return canvas


def contact_sheet(results, path):
    cell, label, columns = 168, 22, 10
    rows = (len(results) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell, rows * (cell + label)), "#FFF6FB")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except OSError:
        font = ImageFont.load_default()
    for index, (key, image, problems) in enumerate(results):
        x, y = index % columns * cell, index // columns * (cell + label)
        # 半分は白、半分は紫の上に置いて、抜けのこりと白いふちを見やすくする
        draw.rectangle([x, y, x + cell // 2, y + cell], fill="#FFFFFF")
        draw.rectangle([x + cell // 2, y, x + cell, y + cell], fill="#4A2D6B")
        thumb = image.resize((cell - 12, cell - 12), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 6, y + 6), thumb)
        if problems:
            draw.rectangle([x + 1, y + 1, x + cell - 2, y + cell - 2], outline="#FF2D2D", width=4)
        draw.text((x + 4, y + cell + 4), key.split("/", 1)[1], fill="#C01010" if problems else "#4A2D6B", font=font)
    sheet.save(path)


def scenes(svg_only):
    """一枚絵は そのまま(背景を抜かない)はば 1024 の WebP にする。"""
    folder = OUT / "scenes"
    folder.mkdir(parents=True, exist_ok=True)
    done, wanted = [], set()
    for source in sorted((RAW / "scenes").glob("*.png")):
        key = f"scenes/{source.stem}"
        if key in svg_only:
            print(f"svg  {key} (SVG のまま残す)")
            continue
        try:
            image = Image.open(source).convert("RGB")
        except OSError:
            print(f"skip {key} (読めない)")
            continue
        image = image.resize((SCENE_WIDTH, round(image.height * SCENE_WIDTH / image.width)), Image.Resampling.LANCZOS)
        image.save(folder / f"{source.stem}.webp", "WEBP", quality=SCENE_QUALITY, method=6)
        wanted.add(f"{source.stem}.webp")
        done.append((key, image))
        print(f"ok   {key}")
    for stale in folder.glob("*.webp"):
        if stale.name not in wanted:
            stale.unlink()
    if done:  # 一覧(3 れつ)
        cell = 340
        sheet = Image.new("RGB", (3 * cell, ((len(done) + 2) // 3) * (cell + 22)), "#FFF6FB")
        draw = ImageDraw.Draw(sheet)
        for i, (key, image) in enumerate(done):
            x, y = i % 3 * cell, i // 3 * (cell + 22)
            sheet.paste(image.resize((cell - 8, round((cell - 8) * image.height / image.width))), (x + 4, y + 4))
            draw.text((x + 6, y + cell + 2), key.split("/", 1)[1], fill="#4A2D6B")
        sheet.save(RAW / "_contact_scenes.png")
    return len(done)


def main():
    results, redo = [], {}
    try:  # 3 回作り直してもだめだった絵は src/art に出さない(SVG のまま)
        svg_only = set(json.loads((RAW / "_state.json").read_text()).get("svg_only", []))
    except (OSError, ValueError):
        svg_only = set()
    for folder, size in SIZES.items():
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        wanted = set()
        for source in sorted((RAW / folder).glob("*.png")):
            key = f"{folder}/{source.stem}"
            if key in svg_only:
                print(f"svg  {key} (SVG のまま残す)")
                continue
            try:
                rgb = np.asarray(Image.open(source).convert("RGB"))
            except OSError:  # generate.py が書いている途中の絵は、次の回にまわす
                print(f"skip {key} (読めない)")
                continue
            rgba, problems, tile = cut_out(rgb, holes=(folder == "items"))
            image = square(rgba, size)
            image.save(OUT / folder / f"{source.stem}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
            wanted.add(f"{source.stem}.webp")
            results.append((key, image, problems))
            if problems:
                redo[key] = problems
            print(f"{'REDO' if problems else 'ok  '} {key}{' [タイルを抜いた]' if tile else ''}{' : ' + ' / '.join(problems) if problems else ''}")
        for stale in (OUT / folder).glob("*.webp"):  # 元が無くなった絵は消す
            if stale.name not in wanted:
                stale.unlink()
    scene_count = scenes(svg_only) if (RAW / "scenes").is_dir() else 0
    if not results:
        sys.exit("art-raw/ に PNG がありません。先に generate.py を実行してください。")
    contact_sheet(results, RAW / "_contact.png")
    (RAW / "_redo.json").write_text(json.dumps({"redo": redo}, ensure_ascii=False, indent=1))
    print(f"\n{len(results)} 点と 一枚絵 {scene_count} 点を src/art/ に出力。作り直し候補 {len(redo)} 点 → art-raw/_redo.json / 一覧 → art-raw/_contact.png")


if __name__ == "__main__":
    main()
