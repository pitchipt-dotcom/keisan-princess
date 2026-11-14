/* イベントモードの きまり(問題数・時間・成功の条件・★・最高記録)。
   App.jsx と テスト(tests/)の 両方から使う。 */

export const EVENT_MODES = {
  castle:   { icon: "🏰", title: "おしろへ",         n: 10, limit: 90,  bonus: 30, failBonus: 5, runner: "🎃", goal: "🏰",
              intro: "かぼちゃの ばしゃで おしろへ むかおう！", win: "おしろに ついたよ！", lose: "ばしゃが おくれちゃった…" },
  ball:     { icon: "💃", title: "ぶとうかい",       n: 10, limit: 80,  bonus: 35, failBonus: 5, runner: "💃", goal: "🎶",
              intro: "ぶとうかいで おどろう！ ただしく こたえると ステップが きまるよ。", win: "じょうずに おどれた！", lose: "ころんじゃった…！" },
  villain:  { icon: "⚔️", title: "さいごの たたかい", n: 12, limit: 90,  bonus: 40, failBonus: 8, runner: "🪄", goal: "👻",
              intro: "わるものが あらわれた！ 1もん せいかいするごとに まほうが あたるよ。", win: "わるものを たいじ！", lose: "にげられちゃった…" },
  complete: { icon: "👑", title: "かんせい パレード", n: 15, limit: 120, bonus: 50, failBonus: 10, runner: "🎺", goal: "👑", mix: true,
              intro: "パレードの はじまり！ ぜんぶの けいさんが まざって でるよ。", win: "おうかんを もらったよ！", lose: "もうすこしで おうかん！" },
};
export const eventNeed = (cfg) => Math.ceil(cfg.n * 0.8);
export function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  const fun = m ? `${m}${[2, 5, 7, 9].includes(m) ? "ふん" : "ぷん"}` : "";
  return fun + (s ? `${s}びょう` : "");
}
export const fmtMs = (ms) => fmtTime(Math.round(ms / 1000));

// おわったときの けっか。最後まで こたえて(timeUp でない)、need もん いじょう 1かいで せいかいなら せいこう。
export function eventOutcome(cfg, run, timeUp, now) {
  const need = eventNeed(cfg);
  const success = !timeUp && run.idx >= cfg.n && run.firstTry >= need;
  const elapsed = Math.min(run.limitMs, now - run.startAt);
  return { success, need, elapsed, bonus: success ? cfg.bonus : cfg.failBonus };
}

// キャラ・イベントごとの 最高記録。古い セーブ(記録なし)でも そのまま 使える。
export function nextEventRecord(prev, { success, elapsed, firstTry }) {
  const p = prev || {};
  const newBest = firstTry > (p.best || 0) || (success && (!p.bestMs || elapsed < p.bestMs));
  const record = {
    best: Math.max(p.best || 0, firstTry),
    bestMs: success ? Math.min(p.bestMs || Infinity, elapsed) : (p.bestMs || null),
    clears: (p.clears || 0) + (success ? 1 : 0),
    tries: (p.tries || 0) + 1,
  };
  return { record, newBest };
}
