/* =====================================================================
   妖精の国 たんけん — 地図 → エリア → だんかい
   App から React.lazy で 読みこむ（Three.js は ここから 先だけ。ほかの モードの 起動は おそく ならない）
   ごほうびは「妖精と なかよしに なる」（ドラゴンの そだちポイント・星のかけらとは 別）
   ===================================================================== */
import React, { useState } from "react";
import { TsumikiForest, FairyGuide, STAGES } from "./TsumikiForest.jsx";
import { AREAS, FAIRIES, GUIDE_FAIRY, normalizeFairy, addFriendship, markCleared, friendHearts, FRIEND_LEVEL } from "./fairy.js";
import "./fairy.css";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function Friendship({ n }) {
  const hearts = friendHearts(n), rest = n % FRIEND_LEVEL;
  return (
    <div className="fl-friend" aria-label={`なかよし度 ${n}`}>
      <span>💗 {FAIRIES[GUIDE_FAIRY].name}と なかよし度 <b>{n}</b></span>
      <span className="fl-friend-bar" title={`あと ${FRIEND_LEVEL - rest}で ハートが ふえるよ`}>
        {Array.from({ length: FRIEND_LEVEL }, (_, i) => <i key={i} className={i < rest ? "on" : ""} />)}
      </span>
      {hearts > 0 && <span className="fl-hearts">{"💖".repeat(Math.min(hearts, 5))}{hearts > 5 ? `×${hearts}` : ""}</span>}
    </div>
  );
}

export default function FairyLand({ fairy, sfx, onFairy, onExit }) {
  const f = normalizeFairy(fairy);
  const [area, setArea] = useState(null);        // null = 地図
  const [stage, setStage] = useState(null);      // null = だんかい えらび
  const [playKey, setPlayKey] = useState(0);

  const gain = (n) => onFairy((cur) => addFriendship(cur, GUIDE_FAIRY, n));
  const clearStage = (no) => onFairy((cur) => markCleared(cur, "tsumiki", no, todayStr()));

  if (area === "tsumiki" && stage) {
    return (
      <div className="fl-wrap">
        <TsumikiForest key={playKey} stage={stage} sfx={sfx} onGain={gain} onClearStage={clearStage} onExit={() => { sfx.tap(); setStage(null); }} />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "tsumiki") {
    return (
      <div className="fl-wrap">
        <h2 className="kk-h2">🧊 つみきの森</h2>
        <FairyGuide text="つみきを ころがすと、紙に ついた マスに 色が つくよ。いっしょに やってみよう！" />
        <Friendship n={f.friendship[GUIDE_FAIRY] || 0} />
        <div className="fl-stages">
          {STAGES.map((st) => (
            <button key={st.no} className="fl-stage" onClick={() => { sfx.tap(); setPlayKey((k) => k + 1); setStage(st.no); }}>
              <span className="fl-stage-icon">{st.icon}</span>
              <span className="fl-stage-text"><b>{st.no}. {st.name}</b><small>{st.desc}</small></span>
              {f.cleared[`tsumiki:${st.no}`] && <span className="fl-stage-ok" aria-label="クリア">✓</span>}
            </button>
          ))}
        </div>
        <button className="kk-text-btn" onClick={() => { sfx.tap(); setArea(null); }}>ちずに もどる</button>
      </div>
    );
  }
  return (
    <div className="fl-wrap">
      <h2 className="kk-h2">🧚 ようせいの くに たんけん</h2>
      <FairyGuide text="ようこそ！ わたしは ミント。ようせいの くにを いっしょに たんけん しよう！" />
      <Friendship n={f.friendship[GUIDE_FAIRY] || 0} />
      <div className="fl-map">
        {AREAS.map((a) => {
          const open = a.ready && f.map.includes(a.id);
          return (
            <button key={a.id} className={"fl-area" + (open ? "" : " fl-area-lock")} disabled={!open} onClick={() => { sfx.tap(); setArea(a.id); }}>
              <span className="fl-area-icon">{open ? a.icon : "🔒"}</span>
              <b>{a.name}</b><small>{a.desc}</small>
            </button>
          );
        })}
      </div>
      <button className="kk-text-btn" onClick={onExit}>モードえらびに もどる</button>
    </div>
  );
}
