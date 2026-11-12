#!/usr/bin/env bash
# 絵の生成の自動再開(cron から呼ぶ)。MOSS-Image の上限(24 時間で 40 回)が戻ったら続きから作る。
#   1. 足りない絵を作る(generate.py)        → 変換・build・push
#   2. 切れている絵などを作り直す(--redo)     → 変換・build・push
#   3. 全部そろったら、自分の cron の行を消す(目で見る確認は、このスクリプトではしない)
# 設定は art-raw/_env(PITCH_CHAT_URL=...、NOT_BEFORE=<epoch 秒>)。記録は art-raw/_auto.log。
set -u
cd "$(dirname "$0")/../.." || exit 1
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
[ -f art-raw/_env ] || exit 0
. art-raw/_env
export PITCH_CHAT_URL
PY=tools/art/.venv/bin/python
log() { echo "$(date '+%F %T') $*" >> art-raw/_auto.log; }
unschedule() { crontab -l 2>/dev/null | grep -v 'tools/art/auto.sh' | crontab -; log "cron の行を消した"; }

[ "$(date +%s)" -ge "${NOT_BEFORE:-0}" ] || exit 0
exec 9> art-raw/_auto.lock
flock -n 9 || exit 0
if [ -f art-raw/_auto.done ]; then unschedule; exit 0; fi
if [ "$(date +%s)" -ge "${NOT_AFTER:-9999999999}" ]; then log "期限切れ。未完了のまま止める"; unschedule; exit 0; fi
if [ "$(git branch --show-current)" != art-refresh ]; then log "ブランチが art-refresh でないので何もしない"; exit 0; fi

publish() {
  $PY tools/art/process.py >> art-raw/_auto.log 2>&1 || { log "process.py 失敗"; return 1; }
  npm run build >> art-raw/_auto.log 2>&1 || { log "build 失敗。push しない"; return 1; }
  git add -A src/art
  if ! git diff --cached --quiet; then
    git commit -q -m "art: 絵を追加・作り直し($(ls src/art/items src/art/chars | grep -c webp) 点)

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" && git push -q origin art-refresh >> art-raw/_auto.log 2>&1 && log "push した"
  fi
}

log "開始"
$PY tools/art/generate.py >> art-raw/_auto.log 2>&1; rc=$?
publish
if [ $rc -eq 2 ]; then log "上限。次の回に続きから"; exit 0; fi
if [ $rc -ne 0 ]; then log "生成に失敗あり。次の回にもう一度"; exit 0; fi

# 57 点そろった。process.py が見つけた問題(切れている・背景が残る)を作り直す。
for _ in 1 2 3; do
  $PY -c "import json,sys; sys.exit(0 if json.load(open('art-raw/_redo.json'))['redo'] else 1)" || break
  $PY tools/art/generate.py --redo >> art-raw/_auto.log 2>&1; rc=$?
  publish
  if [ $rc -eq 2 ]; then log "作り直し中に上限。次の回に続きから"; exit 0; fi
done

# ここまでで自動の分はおわり。目で見る確認(顔が付いた・合体した・表情)は、人か Claude Code の
# 会話で行う(art-raw/_review_prompt.md に手順)。
log "57 点そろった。自動の作り直しもおわり。目で見る確認が残っている"
touch art-raw/_auto.done
unschedule
exit 0
