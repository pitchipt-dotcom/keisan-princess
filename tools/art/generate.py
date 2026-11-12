#!/usr/bin/env python3
"""assets.json の絵を、自宅PCの Pitch-chat と同じ経路で 1 枚ずつ作る。

  新規生成 (idle・アイテム): POST /api/media/jobs  backend=moss-image  prompt_mode=direct
  画像編集 (happy・oops)   : 元画像を /api/images/attachments に上げて、
                             POST /api/media/jobs  backend=flux-klein  reference_image_id=...
  (Pitch-chat の画像編集は FLUX.2 Klein。MOSS-Image は元画像つきの依頼を受けつけない)

使い方:
  PITCH_CHAT_URL=https://<Pitch-chat の Tailscale Serve の URL> python3 tools/art/generate.py
  ... generate.py --only items/ribbon chars/witch_happy   # 指定した絵だけ
  ... generate.py --redo      # art-raw/_redo.json の絵を消して作り直す(1 枚につき 2 回まで)
  ... generate.py --dry-run   # プロンプトを表示するだけ

- すでにある art-raw/<key>.png はとばす(自分で用意した絵を先に置いてもよい)。
- 失敗しても止めず、最後にまとめて報告する。
- MOSS-Image は 1 日あたりの回数に上限がある。上限に当たったら、残りの新規生成は
  とばして報告する(次の日にもう一度実行すれば続きから作る)。
- MOSS の本人確認は Tailscale Serve がつけるので、URL は Serve のものを使う。
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RAW = ROOT / "art-raw"
ORIG = RAW / "_orig"          # 生成されたままの大きさ(編集の元画像に使う)
STATE = RAW / "_state.json"   # 会話 ID と作り直し回数
REDO = RAW / "_redo.json"
MAX_REDO = 2
POLL_SECONDS = 3
JOB_TIMEOUT = 30 * 60


class DailyLimit(Exception):
    pass


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")

    def call(self, method, path, *, body=None, content_type=None, raw=False, timeout=120):
        data = body
        headers = {}
        if body is not None and content_type is None:
            data = json.dumps(body).encode()
            content_type = "application/json"
        if content_type:
            headers["Content-Type"] = content_type
        request = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = response.read()
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:300]
            if error.code == 429 and "moss_daily_or_active_limit" in detail:
                raise DailyLimit(detail) from None
            raise RuntimeError(f"HTTP {error.code} {path}: {detail}") from None
        return payload if raw else json.loads(payload)

    def wait(self, job_id):
        start = time.time()
        while True:
            job = self.call("GET", f"/api/jobs/{job_id}")
            if job["status"] not in {"QUEUED", "RUNNING"}:
                return job
            if time.time() - start > JOB_TIMEOUT:
                raise RuntimeError(f"timeout job {job_id}")
            time.sleep(POLL_SECONDS)

    def result_png(self, job_id):
        job = self.wait(job_id)
        if job["status"] != "SUCCESS":
            raise RuntimeError(f"job {job_id} {job['status']}: {job.get('error')}")
        result = self.call("GET", f"/api/jobs/{job_id}/result")
        artifacts = result["tool_result"]["artifacts"]
        if not artifacts:
            raise RuntimeError(f"job {job_id}: no artifact")
        return self.call("GET", artifacts[0]["path"], raw=True)


def load_json(path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return default


def build_prompt(spec, entry):
    """subject + 絵柄 + (着るもの) + (顔なし) + 背景。"""
    if entry["mode"] == "edit":
        prompt = entry["prompt"]
    else:
        is_char = entry["key"].startswith("chars/")
        noun = "character" if is_char else "animal" if entry.get("creature") else "object"
        background = spec["background"].replace("{noun}", noun)
        if entry.get("lilac"):  # 白いアイテムは、うす紫の背景にして抜きやすくする
            background = background.replace("plain flat white background", spec["lilac_background"])
        parts = [entry["subject"].rstrip(".,") + ", " + spec["style"]]
        if entry.get("wearable"):
            parts.append(spec["wearable"])
        if not is_char and not entry.get("creature"):
            parts.append(spec["no_face"])
        parts.append(background)
        prompt = " ".join(parts)
    if "icon" in prompt.lower():
        raise ValueError(f"{entry['key']}: 'icon' は使わない(角丸タイルが付く)")
    return prompt


def save_raw(key, png, size):
    image = Image.open(io.BytesIO(png)).convert("RGB")
    original = ORIG / f"{key}.png"
    original.parent.mkdir(parents=True, exist_ok=True)
    image.save(original)
    target = RAW / f"{key}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".part")  # 書いている途中の絵を process.py が読まないように
    image.resize((size, size), Image.Resampling.LANCZOS).save(partial, "PNG")
    partial.replace(target)


def conversation(api, state):
    if not state.get("conversation_id"):
        state["conversation_id"] = api.call("POST", "/api/images/conversations")["conversation_id"]
        state["attachments"] = 0
    return state["conversation_id"]


def generate(api, state, prompt):
    job = api.call("POST", "/api/media/jobs", body={
        "prompt": prompt, "kind": "image", "backend": "moss-image", "aspect_ratio": "1:1",
        "prompt_mode": "direct", "preview_only": False, "conversation_id": conversation(api, state)})
    return api.result_png(job["job_id"])


def edit(api, state, prompt, source_key):
    source = ORIG / f"{source_key}.png"
    if not source.exists() or source.stat().st_mtime < (RAW / f"{source_key}.png").stat().st_mtime - 5:
        source = RAW / f"{source_key}.png"  # 自分で置いた絵は art-raw のものを元にする
    # 1 つの会話に置ける画像は 100 枚まで。多くなったら新しい会話にする。
    if state.get("attachments", 0) >= 80:
        state.pop("conversation_id", None)
    cid = conversation(api, state)
    buffer = io.BytesIO()
    Image.open(source).convert("RGB").save(buffer, "PNG")
    image = api.call("POST", f"/api/images/attachments?conversation_id={cid}",
                     body=buffer.getvalue(), content_type="image/png")
    state["attachments"] = state.get("attachments", 0) + 2  # 元画像と、できた画像
    job = api.call("POST", "/api/media/jobs", body={
        "prompt": prompt, "kind": "image", "backend": "flux-klein", "prompt_mode": "direct",
        "conversation_id": cid, "reference_image_id": image["id"], "preview_only": False})
    return api.result_png(job["job_id"])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--only", nargs="*", default=None, help="この key だけ作る")
    parser.add_argument("--redo", action="store_true", help="_redo.json の絵を消して作り直す")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    spec = json.loads((HERE / "assets.json").read_text())
    # idle → アイテム → 表情の順。MOSS と Klein の入れかえが 1 回ですむ。
    entries = ([e for e in spec["chars"] if e["mode"] == "generate"] + spec["items"]
               + [e for e in spec["chars"] if e["mode"] == "edit"])
    by_key = {e["key"]: e for e in entries}
    if args.dry_run:
        for entry in entries:
            if args.only is None or entry["key"] in args.only:
                print(f"[{entry['key']}] ({entry['mode']})\n  {build_prompt(spec, entry)}\n")
        return 0

    base = os.environ.get("PITCH_CHAT_URL")
    if not base:
        sys.exit("PITCH_CHAT_URL に Pitch-chat の URL (Tailscale Serve) を入れてください。")
    api = Api(base)
    RAW.mkdir(exist_ok=True)
    state = load_json(STATE, {})
    attempts = state.setdefault("redo_attempts", {})

    gave_up = []
    if args.redo:
        for key in load_json(REDO, {}).get("redo", {}):
            if key not in by_key:
                continue
            if attempts.get(key, 0) >= MAX_REDO:
                gave_up.append(key)
                continue
            attempts[key] = attempts.get(key, 0) + 1
            doomed = [key]
            if key.endswith("_idle"):  # idle を作り直したら、表情も作り直す
                doomed += [e["key"] for e in entries if e.get("source") == key]
            for name in doomed:
                for folder in (RAW, ORIG):
                    (folder / f"{name}.png").unlink(missing_ok=True)
        STATE.write_text(json.dumps(state, indent=1))

    made, skipped, failed, limited = [], [], [], []
    moss_closed = False
    for entry in entries:
        key = entry["key"]
        if args.only is not None and key not in args.only:
            continue
        if (RAW / f"{key}.png").exists():
            skipped.append(key)
            continue
        size = spec["sizes"]["chars" if key.startswith("chars/") else "items"]
        started = time.time()
        try:
            prompt = build_prompt(spec, entry)
            if entry["mode"] == "edit":
                if not (RAW / f"{entry['source']}.png").exists():
                    raise RuntimeError(f"元画像 {entry['source']} がない")
                png = edit(api, state, prompt, entry["source"])
            else:
                if moss_closed:
                    limited.append(key)
                    continue
                png = generate(api, state, prompt)
            save_raw(key, png, size)
            made.append(key)
            print(f"ok    {key}  {time.time() - started:.0f}s", flush=True)
        except DailyLimit:
            moss_closed = True
            limited.append(key)
            print(f"limit {key}  MOSS-Image の 1 日の上限", flush=True)
        except Exception as error:  # 1 枚の失敗で止めない
            failed.append((key, str(error)[:300]))
            print(f"FAIL  {key}  {error}", flush=True)
        finally:
            STATE.write_text(json.dumps(state, indent=1))

    print(f"\n作成 {len(made)} / とばした(すでにある) {len(skipped)} / 失敗 {len(failed)} / 上限で未作成 {len(limited)}")
    for key, error in failed:
        print(f"  失敗: {key}: {error}")
    if limited:
        print("  上限で未作成: " + " ".join(limited))
    if gave_up:
        print(f"  作り直しは {MAX_REDO} 回まで。残した絵: " + " ".join(gave_up))
    return 1 if failed or limited else 0


if __name__ == "__main__":
    sys.exit(main())
