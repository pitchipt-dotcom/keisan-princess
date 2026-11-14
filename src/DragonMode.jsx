/* =====================================================================
   ドラゴンそだて — 見た目と 画面（ドラゴン画面・たまご えらび・そだった えんしゅつ）
   ===================================================================== */
import React, { useEffect, useState } from "react";
import {
  ELEMENTS, STAGES, nextStageInfo, selectableElements, isMaster, todayStr, addDays, currentStreak,
} from "./dragon.js";
import "./dragonMode.css";

/* ---- src/art/dragons/{element}_{stage}.webp（無い／よめない ときは 絵文字に もどる） ---- */
const DRAGON_ART = Object.fromEntries(
  Object.entries(import.meta.glob("./art/dragons/*.webp", { eager: true, query: "?url", import: "default" }))
    .map(([path, url]) => [path.replace(/^.*\//, "").replace(/\.webp$/, ""), url])
);

const STAGE_EMOJI = { egg: "🥚", baby: "🐣", child: "🦎", adult: "🐉" };
const STAGE_NAME = { egg: "たまご", baby: "あかちゃん", child: "こども", adult: "おとな" };
const ELEMENT_INFO = {
  fire:  { name: "ほのお", icon: "🔥", color: "#FFB38A", desc: "あったかくて げんき いっぱい！" },
  water: { name: "みず",   icon: "💧", color: "#8FD3FF", desc: "やさしくて おちついた こ。" },
  light: { name: "ひかり", icon: "✨", color: "#FFE58A", desc: "きらきら かがやく ふしぎな こ。" },
};

// ぞくせい × だんかい の 見た目
export const DRAGONS = Object.fromEntries(ELEMENTS.map((el) => [el, {
  ...ELEMENT_INFO[el],
  stages: Object.fromEntries(STAGES.map((st) => [st, {
    emoji: STAGE_EMOJI[st],
    name: st === "egg" ? `${ELEMENT_INFO[el].name}の たまご` : `${ELEMENT_INFO[el].name}ドラゴン（${STAGE_NAME[st]}）`,
    art: DRAGON_ART[`${el}_${st}`] || null,
  }])),
}]));

const LINES = {
  egg:   ["…コトコト", "…ゆらゆら", "なかで なにか うごいてる…？", "あったかい…"],
  baby:  ["ぴぃ！", "ぴぃぴぃ♪", "おなか すいた〜", "いっしょに あそぼ！"],
  child: ["きょうも けいさん がんばろ！", "とべるように なりたいな！", "ひっさん って かっこいい！", "あしたも あおうね！"],
  adult: ["いっしょに つよく なったね！", "せなかに のる？", "きみの おかげだよ！", "ずっと ともだちだよ！"],
};

/* ---- ドラゴンの 絵（silhouette：ずかんで まだの もの） ---- */
export function DragonArt({ element, stage, size = 120, silhouette = false, className = "" }) {
  const d = DRAGONS[element] && DRAGONS[element].stages[stage];
  const [broken, setBroken] = useState(false);
  if (!d) return null;
  const sil = silhouette ? " dr-sil" : "";
  if (d.art && !broken) {
    return <img src={d.art} alt={d.name} draggable={false} onError={() => setBroken(true)}
      className={"dr-art" + sil + " " + className} style={{ width: size, height: size }} />;
  }
  return (
    <div role="img" aria-label={d.name} className={"dr-emoji" + sil + " " + className}
      style={{ width: size, height: size, fontSize: size * 0.55, background: DRAGONS[element].color }}>
      {d.emoji}
    </div>
  );
}

/* ---- たまご えらび ---- */
export function EggPicker({ dex = [], onPick, sfx, title }) {
  const choices = selectableElements(dex);
  return (
    <div className="dr-picker">
      <div className="dr-picker-title">{title || "たまごを 1つ えらんでね"}</div>
      <div className="dr-eggs">
        {ELEMENTS.map((el) => {
          const ok = choices.includes(el);
          return (
            <button key={el} className="dr-egg-btn" disabled={!ok}
              style={{ borderColor: DRAGONS[el].color }}
              onClick={() => { sfx && sfx.tap(); onPick(el); }}>
              <DragonArt element={el} stage="egg" size={72} />
              <b>{DRAGONS[el].icon} {DRAGONS[el].name}</b>
              <small>{ok ? DRAGONS[el].desc : "もう そだてたよ"}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- そだった！の えんしゅつ（結果画面） ---- */
export function StageUpCelebration({ element, from, to }) {
  const [sparks] = useState(() => Array.from({ length: 16 }, (_, i) => ({
    id: i, left: 5 + Math.random() * 90, delay: Math.random() * 0.8, dur: 1.4 + Math.random() * 1.2, size: 14 + Math.random() * 16,
  })));
  return (
    <div className="dr-celebrate">
      <div className="dr-celebrate-title">{from === "egg" ? "たまごが われた！" : "おおきく なった！"}</div>
      <div className="dr-celebrate-pop"><DragonArt element={element} stage={to} size={150} /></div>
      <div className="dr-celebrate-name">{DRAGONS[element].stages[to].name}</div>
      {sparks.map((s) => (
        <span key={s.id} className="dr-spark" style={{ left: s.left + "%", animationDelay: s.delay + "s", animationDuration: s.dur + "s", fontSize: s.size + "px" }}>✦</span>
      ))}
    </div>
  );
}

/* ---- まいにち けいさん intro に出す 小さな ドラゴン ---- */
export function DragonMini({ daily }) {
  const d = daily.dragon;
  if (!d) return null;
  const nx = nextStageInfo(d);
  return (
    <div className="dr-mini">
      <DragonArt element={d.element} stage={d.stage} size={52} />
      <div className="dr-mini-text">
        <div>{nx ? <>あと <b>{nx.left}ポイント</b>で そだつよ</> : <>おとなに なったよ！</>}</div>
        <small>🔥 れんぞく {currentStreak(daily)}日</small>
      </div>
    </div>
  );
}

/* ---- ドラゴン画面 ---- */
export function DragonScreen({ daily, onPickEgg, onExit, sfx }) {
  const d = daily.dragon;
  const dex = daily.dragonDex || [];
  const [line, setLine] = useState(null);
  const [hop, setHop] = useState(0);
  useEffect(() => { setLine(null); }, [d && d.element, d && d.stage]);

  const tap = () => {
    if (!d) return;
    sfx && sfx.tap();
    const ls = LINES[d.stage];
    setLine((cur) => { let n; do { n = ls[(Math.random() * ls.length) | 0]; } while (ls.length > 1 && n === cur); return n; });
    setHop((h) => h + 1);
  };

  const today = todayStr();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const nx = d ? nextStageInfo(d) : null;
  const master = isMaster(dex);
  const showPicker = !d || d.stage === "adult";

  return (
    <div className="dr-wrap">
      <h2 className="kk-h2">ドラゴン</h2>
      {master && <div className="dr-title-badge">👑 ドラゴンマスター</div>}

      {d && (
        <div className="dr-card">
          <button className="dr-main" onClick={tap} aria-label="ドラゴンを タップ">
            <div key={hop} className={hop ? "dr-hop" : ""}><DragonArt element={d.element} stage={d.stage} size={180} /></div>
          </button>
          <div className={"dr-bubble" + (line ? "" : " dr-bubble-hint")}>{line || "タップしてみてね"}</div>
          <div className="dr-name">{DRAGONS[d.element].stages[d.stage].name}</div>
          {nx ? (
            <>
              <div className="dr-next">つぎの すがたまで あと <b>{nx.left}ポイント</b></div>
              <div className="dr-gauge"><div className="dr-gauge-fill" style={{ width: nx.ratio * 100 + "%", background: DRAGONS[d.element].color }} /></div>
            </>
          ) : <div className="dr-next">おとなに なって ずかんに のったよ！</div>}
          <div className="dr-howto">まいにち けいさん で そだつよ：やりきる +1／ヒントなし ぜんもん せいかい +1／3日・7日 れんぞく ボーナス</div>
        </div>
      )}

      {showPicker && (
        <div className="dr-card">
          <EggPicker dex={dex} onPick={onPickEgg} sfx={sfx}
            title={!d ? "さいしょの たまごを えらんでね" : master ? "すきな たまごを もう いちど そだてよう" : "つぎの たまごを えらんでね"} />
        </div>
      )}

      <div className="dr-card">
        <div className="dr-sec-title">さいきんの 14日</div>
        <div className="dr-cal">
          {days.map((ds) => {
            const v = (daily.calendar || {})[ds];
            return (
              <div key={ds} className={"dr-cal-day" + (ds === today ? " dr-cal-today" : "")}>
                <small>{Number(ds.slice(8))}</small>
                <span>{v === "done" ? "★" : v === "ticket" ? "🌙" : "・"}</span>
              </div>
            );
          })}
        </div>
        <div className="dr-cal-legend">★ やった日　🌙 おやすみチケット　／　ぜんぶで {daily.totalDays || 0}日</div>
      </div>

      <div className="dr-card">
        <div className="dr-sec-title">ドラゴンずかん（{dex.length}/{ELEMENTS.length}）</div>
        <div className="dr-dex">
          {ELEMENTS.map((el) => {
            const got = dex.includes(el);
            return (
              <div key={el} className="dr-dex-cell">
                <DragonArt element={el} stage="adult" size={80} silhouette={!got} />
                <small>{got ? `${DRAGONS[el].name}ドラゴン` : "？？？"}</small>
              </div>
            );
          })}
        </div>
      </div>

      <button className="kk-big-btn" onClick={onExit}>もどる</button>
    </div>
  );
}
