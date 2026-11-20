#!/usr/bin/env python3
"""けいさんプリンス(テーマ)の 絵を、Pitch-chat 経由の MOSS-Image で作る(generate.py と 同じ 経路)。

  ドラゴン：{fire, water, light} × {child, adult} → art-raw/dragons/{element}_{stage}_prince.png
  元の 絵と 同じ プロンプト・seed に HEROIC を たして、表情ちがいに する(色・形・ぞくせいの しるしは かえない)。
  そのあと  tools/art/.venv/bin/python tools/art/process.py dragons  で src/art/dragons/*_prince.webp に する。

- 元の 絵の ファイル(art-raw/dragons/{element}_{stage}.png)には さわらない。
- Pitch-chat：POST /api/media/jobs  backend=moss-image  prompt_mode=direct に seed と negative_prompt を わたす。
  URL は 環境変数 PITCH_CHAT_URL(art-raw/_env)。MOSS-Image の 起動・停止は しない。
- HEROIC には "same" が 入る。Pitch-chat は 同じ 会話の 前の 指示を まぜる ことが あるので、1まいごとに 新しい 会話で たのむ。
- 1日の 上限(moss_daily_or_active_limit)に 当たったら そこで 止める。
- プロンプト・seed は art-raw/dragons/_moss.json に のこす(キーは {element}_{stage}_prince)。
- 使い方:
    python3 tools/art/moss_prince.py dragons                 # 6 枚(すでに ある 絵は とばす)
    python3 tools/art/moss_prince.py dragons fire_adult      # その 1 枚だけ 作りなおす
    python3 tools/art/moss_prince.py dragons --soft          # かわいさが へりすぎた とき：表情の 指定を slightly で よわめる

  主人公：{witch, mermaid, princess} × {idle, happy, oops} → art-raw/chars/{id}_{mood}_prince.png
  王子は 新しい キャラ。元の 絵の せつめい(髪・服の 色・もちもの)を 男の子に おきかえ、HEROIC を たす。
  idle は MOSS-Image(seed は きめた 値)、happy・oops は idle を もとに flux-klein で 表情だけ かえる(今の 主人公と 同じ やり方)。
  そのあと  tools/art/.venv/bin/python tools/art/process.py chars
    python3 tools/art/moss_prince.py chars                   # 9 枚(ある 絵は とばす)
    python3 tools/art/moss_prince.py chars witch_idle        # その 1 枚だけ 作りなおす(idle を かえたら happy・oops も)

  妖精：{mint, ramune, poppy, peta} → art-raw/fairy/fairy-{id}_prince.png(1024px)
  元の 絵(~/moss-mcp/outputs/20261120_001〜004)の さいごの プロンプトと seed に HEROIC と マントか たてを 1つ たす(顔は 同じ)。
  そのあと 背景を ぬいて 上半身・顔を 切りだし、src/assets/fairy/fairy-{id}{,-bust,-face}_prince.webp に する
    python3 tools/art/moss_prince.py fairy                   # 4 枚(ある 絵は とばす)
"""
import json
import os
import sys
import time

import moss_dragons as D
import io

from PIL import Image

import generate as G
from generate import Api, DailyLimit

HEROIC = ("determined eyes, sharp eyebrows, confident smile, heroic pose, chest out, slightly cool and brave expression, "
          "same character design, same colors, cute, chibi")
HEROIC_SOFT = ("slightly determined eyes, slightly sharp eyebrows, confident smile, slightly heroic pose, chest out, "
               "slightly cool and brave expression, same character design, same colors, cute, chibi")
DRAGON_STAGES = ["child", "adult"]          # たまご・あかちゃんは 共通


def render(api, out, prompt, seed, negative, raw_dir, log_path):
    t0 = time.time()
    # 1まいごとに 新しい 会話（前の 指示が まざらない）
    cid = api.call("POST", "/api/images/conversations")["conversation_id"]
    job = api.call("POST", "/api/media/jobs", body={
        "prompt": prompt, "negative_prompt": negative, "seed": seed, "kind": "image", "backend": "moss-image",
        "aspect_ratio": "1:1", "prompt_mode": "direct", "preview_only": False, "conversation_id": cid})
    png = api.result_png(job["job_id"])
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / f"{out}.png").write_bytes(png)
    log = json.loads(log_path.read_text()) if log_path.exists() else {}
    log.setdefault(out, []).append({"seed": seed, "prompt": prompt, "negative": negative, "via": "pitch-chat", "job": job["job_id"],
                                    "sec": round(time.time() - t0, 1), "at": time.strftime("%Y-%m-%d %H:%M:%S")})
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=1))
    print(f"ok   {out} seed={seed} {time.time() - t0:.0f}s", flush=True)


def api_from_env():
    base = os.environ.get("PITCH_CHAT_URL")
    if not base:
        sys.exit("PITCH_CHAT_URL に Pitch-chat の URL を 入れてください(art-raw/_env)")
    return Api(base)


def dragons(args):
    soft = "--soft" in args
    named = [a for a in args if not a.startswith("--")]
    keys = named or [f"{e}_{s}" for e in D.ELEMENTS for s in DRAGON_STAGES]
    api = api_from_env()
    for key in keys:
        e, s = key.split("_")
        assert e in D.ELEMENTS and s in DRAGON_STAGES, key
        out = f"{key}_prince"
        if not named and (D.RAW / f"{out}.png").exists():
            print(f"skip {out} (ある)")
            continue
        prompt = D.prompt_for(e, s) + ", " + (HEROIC_SOFT if soft else HEROIC)
        try:
            render(api, out, prompt, D.ELEMENTS[e]["seed"], D.NEGATIVE, D.RAW, D.LOG)
        except DailyLimit as err:
            sys.exit(f"上限に 当たったので 止めます({out} の まえ): {err}")


# ---------------- 主人公 ----------------
CHARS = {
    "witch": {
        "seed": 8101,
        "subject": ("A cute chibi little wizard boy with short fluffy lavender purple hair, wearing a tall dark navy-purple pointed wizard hat "
                    "with a gold star and a dark indigo robe with a short cape, holding a small magic staff with a gold star. "
                    "Big round plum-colored eyes, pink cheeks. Full body, standing, facing front"),
        "keep": "lavender hair, wizard hat, robe, cape and staff",
    },
    "mermaid": {
        "seed": 8202,
        "subject": ("A cute chibi little merman boy with short wavy aqua blue hair and a small seashell badge on his chest, wearing a turquoise vest, "
                    "with a turquoise mint fish tail. Big round plum-colored eyes, pink cheeks. Full body including the whole tail, facing front"),
        "keep": "aqua hair, seashell badge, turquoise vest and turquoise mint tail",
    },
    "princess": {
        "seed": 8303,
        "subject": ("A cute chibi little prince boy with short golden blonde curly hair and a small gold crown, wearing a white prince jacket "
                    "with gold buttons and a short pale pink cape, white trousers and brown boots. Big round plum-colored eyes, pink cheeks. "
                    "Full body, standing, facing front"),
        "keep": "blonde hair, gold crown, white prince jacket and pink cape",
    },
}
HAPPY = ("Keep the character, {keep}, pose, outline style and background exactly unchanged. Change only the facial expression: "
         "make both eyes into happy closed upturned arcs (like ^ ^), and make the mouth a wide open smile. "
         "No sweat drops, no tears, no water drops anywhere. Keep the pink cheeks.")
OOPS = ("Keep the character, {keep}, pose, outline style and background exactly unchanged. Change only the facial expression to a mild "
        "\"oops, almost!\" look: eyebrows tilted slightly down in the middle, round open eyes looking a little uncertain, and a small closed "
        "wobbly mouth. Add exactly one small light-blue sweat drop high on the forehead near the hairline, on the face, not on the hair "
        "accessory or hat. Dry clean cheeks. Keep the pink cheeks.")


def char_prompt(cid, soft=False):
    spec = json.loads((G.HERE / "assets.json").read_text())
    background = spec["background"].replace("{noun}", "character")
    return C_join(CHARS[cid]["subject"] + ", " + spec["style"], background, HEROIC_SOFT if soft else HEROIC)


def C_join(*parts):
    return " ".join(p.strip() for p in parts)


def log_char(out, entry):
    path = G.RAW / "chars" / "_prince.json"
    log = json.loads(path.read_text()) if path.exists() else {}
    log.setdefault(out, []).append(entry | {"at": time.strftime("%Y-%m-%d %H:%M:%S")})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(log, ensure_ascii=False, indent=1))


def char_idle(api, cid, soft):
    t0, out, prompt, seed = time.time(), f"{cid}_idle_prince", char_prompt(cid, soft), CHARS[cid]["seed"]
    conv = api.call("POST", "/api/images/conversations")["conversation_id"]
    job = api.call("POST", "/api/media/jobs", body={
        "prompt": prompt, "negative_prompt": "", "seed": seed, "kind": "image", "backend": "moss-image", "aspect_ratio": "1:1",
        "prompt_mode": "direct", "preview_only": False, "conversation_id": conv})
    G.save_raw(f"chars/{out}", api.result_png(job["job_id"]), 640)
    log_char(out, {"mode": "generate", "seed": seed, "prompt": prompt, "job": job["job_id"], "sec": round(time.time() - t0, 1)})
    print(f"ok   {out} seed={seed} {time.time() - t0:.0f}s", flush=True)


def char_edit(api, cid, mood):
    t0, out = time.time(), f"{cid}_{mood}_prince"
    prompt = (HAPPY if mood == "happy" else OOPS).format(keep=CHARS[cid]["keep"])
    source = G.ORIG / "chars" / f"{cid}_idle_prince.png"
    conv = api.call("POST", "/api/images/conversations")["conversation_id"]
    buf = io.BytesIO(); Image.open(source).convert("RGB").save(buf, "PNG")
    image = api.call("POST", f"/api/images/attachments?conversation_id={conv}", body=buf.getvalue(), content_type="image/png")
    job = api.call("POST", "/api/media/jobs", body={
        "prompt": prompt, "kind": "image", "backend": "flux-klein", "prompt_mode": "direct",
        "conversation_id": conv, "reference_image_id": image["id"], "preview_only": False})
    G.save_raw(f"chars/{out}", api.result_png(job["job_id"]), 640)
    log_char(out, {"mode": "edit", "source": f"{cid}_idle_prince", "prompt": prompt, "job": job["job_id"], "sec": round(time.time() - t0, 1)})
    print(f"ok   {out} {time.time() - t0:.0f}s", flush=True)


def chars(args):
    soft = "--soft" in args
    named = [a for a in args if not a.startswith("--")]
    api = api_from_env()
    todo = []
    if named:
        for n in named:
            cid, mood = n.split("_")
            todo += [(cid, "idle"), (cid, "happy"), (cid, "oops")] if mood == "idle" else [(cid, mood)]
    else:
        todo = [(c, "idle") for c in CHARS] + [(c, m) for m in ("happy", "oops") for c in CHARS]   # idle → 表情（MOSS と Klein の 入れかえ 1かい）
    for cid, mood in todo:
        assert cid in CHARS and mood in ("idle", "happy", "oops"), (cid, mood)
        out = f"{cid}_{mood}_prince"
        if not named and (G.RAW / "chars" / f"{out}.png").exists():
            print(f"skip {out} (ある)")
            continue
        try:
            char_idle(api, cid, soft) if mood == "idle" else char_edit(api, cid, mood)
        except DailyLimit as err:
            sys.exit(f"上限に 当たったので 止めます({out} の まえ): {err}")


# ---------------- 妖精 ----------------
FAIRY = {   # 元の 絵の 記録(moss-mcp/outputs/index.jsonl)の positive_prompt と seed
    "mint": {"seed": 549347313414442215, "add": "wearing a small leaf-green cape",
             "prompt": "A cute chibi fairy girl with mint green hair, sparkling eyes, and translucent green butterfly wings, wearing a light green petal dress and holding a magic wand, standing happily on a plain white background in a modern kawaii mobile game illustration style."},
    "ramune": {"seed": 7947923956517659597, "add": "with a small round orange shield on her arm",
               "prompt": "A cute chibi fairy girl with peach-orange twin-tail hair, big sparkling eyes, and translucent aqua-orange butterfly wings, holding a small glass pitcher of orange juice in a cheerful pose against a plain white background."},
    "poppy": {"seed": 5593322227778051604, "add": "wearing a small soft pink cape",
              "prompt": "Cute chibi fairy girl character for a children's learning game app, full body, cheerful pose holding a bouquet of small flowers. Soft pink wavy long hair with a flower crown, big sparkling eyes, rosy cheeks, happy smile. Translucent pink and lavender petal-shaped wings with sparkles. Pink tulip petal dress with a skirt patterned like a checkered flower garden grid, white frills, flower shoes. Soft pastel colors, clean thick outline, modern kawaii mobile game illustration style, smooth cel shading, soft glow. Plain white background, centered, no text."},
    "peta": {"seed": 4574136625641206052, "add": "with a small round lilac shield on her arm",
             "prompt": "A cute chibi fairy girl with lavender purple hair, big sparkling eyes, and translucent lilac and pale yellow butterfly wings, holding a small gift box in a cheerful pose against a plain white background."},
}


def fairy(args):
    soft = "--soft" in args
    named = [a for a in args if not a.startswith("--")]
    api = api_from_env()
    raw = G.RAW / "fairy"
    for fid in named or list(FAIRY):
        out = f"fairy-{fid}_prince"
        if not named and (raw / f"{out}.png").exists():
            print(f"skip {out} (ある)")
            continue
        f = FAIRY[fid]
        prompt = f["prompt"].rstrip(".") + ", " + f["add"] + ", " + (HEROIC_SOFT if soft else HEROIC) + ", no text"
        try:
            render(api, out, prompt, f["seed"], "", raw, raw / "_prince.json")
        except DailyLimit as err:
            sys.exit(f"上限に 当たったので 止めます({out} の まえ): {err}")


if __name__ == "__main__":
    cmds = {"dragons": dragons, "chars": chars, "fairy": fairy}
    if len(sys.argv) < 2 or sys.argv[1] not in cmds:
        print(__doc__)
        sys.exit(1)
    cmds[sys.argv[1]](sys.argv[2:])
