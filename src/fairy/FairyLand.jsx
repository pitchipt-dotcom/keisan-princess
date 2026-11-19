/* =====================================================================
   妖精の国 たんけん — 地図 → エリア → だんかい
   App から React.lazy で 読みこむ（Three.js は ここから 先だけ。ほかの モードの 起動は おそく ならない）
   エリアごとに 案内役の 妖精が いる（つみきの森＝ミント、ジュースの泉＝ラムネ、ますめの花畑＝ポピー）。なかよし度は 妖精ごと
   ごほうびは「妖精と なかよしに なる」（ドラゴンの そだちポイント・星のかけらとは 別）
   ===================================================================== */
import React, { useState } from "react";
import { TsumikiForest, FairyGuide, STAGES } from "./TsumikiForest.jsx";
import { JuiceSpring, JSTAGES, JUICE_FAIRY } from "./JuiceSpring.jsx";
import { MasumeGarden, MSTAGES, MASUME_FAIRY } from "./MasumeGarden.jsx";
import { AREAS, FAIRIES, GUIDE_FAIRY, normalizeFairy, addFriendship, markCleared, friendHearts, FRIEND_LEVEL, clearKey, cuboidOpen } from "./fairy.js";
import { KINDS } from "./tsumiki.js";
import { PoseIcon } from "./TopGrid.jsx";
import "./fairy.css";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

function Friendship({ n, fairy = GUIDE_FAIRY }) {
  const hearts = friendHearts(n), rest = n % FRIEND_LEVEL;
  return (
    <div className="fl-friend" aria-label={`${FAIRIES[fairy].name}と なかよし度 ${n}`}>
      <span>💗 {FAIRIES[fairy].name}と なかよし度 <b>{n}</b></span>
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
  const [kind, setKind] = useState("cube");      // cube（さいころ）／ cuboid（2こ つなげた）
  const canCuboid = cuboidOpen(f);

  const gain = (n) => onFairy((cur) => addFriendship(cur, GUIDE_FAIRY, n));
  const gainJuice = (n) => onFairy((cur) => addFriendship(cur, JUICE_FAIRY, n));
  const clearJuice = (no) => onFairy((cur) => markCleared(cur, "juice", no, todayStr()));

  const gainMasume = (n) => onFairy((cur) => addFriendship(cur, MASUME_FAIRY, n));
  const clearMasume = (no) => onFairy((cur) => markCleared(cur, "masume", no, todayStr()));

  if (area === "masume" && stage) {
    return (
      <div className="fl-wrap">
        <MasumeGarden key={playKey} stage={stage} sfx={sfx} onGain={gainMasume} onClearStage={clearMasume} />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "masume") {
    return (
      <div className="fl-wrap">
        <h2 className="kk-h2">🌷 ますめの花畑</h2>
        <FairyGuide fairy={MASUME_FAIRY} text="わたしは ポピー！ 花だんの 広さを、切ったり うごかしたり して「何ます分」か しらべよう！" />
        <Friendship n={f.friendship[MASUME_FAIRY] || 0} fairy={MASUME_FAIRY} />
        <div className="fl-stages">
          {MSTAGES.map((st) => (
            <button key={st.no} className="fl-stage ms-fl-stage" onClick={() => { sfx.tap(); setPlayKey((k) => k + 1); setStage(st.no); }}>
              <span className="fl-stage-icon">{st.icon}</span>
              <span className="fl-stage-text"><b>{st.no}. {st.name}</b><small>{st.desc}</small></span>
              {f.cleared[`masume:${st.no}`] && <span className="fl-stage-ok" aria-label="クリア">✓</span>}
            </button>
          ))}
        </div>
        <button className="kk-text-btn" onClick={() => { sfx.tap(); setArea(null); }}>ちずに もどる</button>
      </div>
    );
  }
  if (area === "juice" && stage) {
    return (
      <div className="fl-wrap">
        <JuiceSpring key={playKey} stage={stage} sfx={sfx} onGain={gainJuice} onClearStage={clearJuice} />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "juice") {
    return (
      <div className="fl-wrap">
        <h2 className="kk-h2">🧃 ジュースの泉</h2>
        <FairyGuide fairy={JUICE_FAIRY} text="わたしは ラムネ！ ジュースを そそいで、L・dL・mL の かさを はかってみよう！" />
        <Friendship n={f.friendship[JUICE_FAIRY] || 0} fairy={JUICE_FAIRY} />
        <div className="fl-stages">
          {JSTAGES.map((st) => (
            <button key={st.no} className="fl-stage jc-fl-stage" onClick={() => { sfx.tap(); setPlayKey((k) => k + 1); setStage(st.no); }}>
              <span className="fl-stage-icon">{st.icon}</span>
              <span className="fl-stage-text"><b>{st.no}. {st.name}</b><small>{st.desc}</small></span>
              {f.cleared[`juice:${st.no}`] && <span className="fl-stage-ok" aria-label="クリア">✓</span>}
            </button>
          ))}
        </div>
        <button className="kk-text-btn" onClick={() => { sfx.tap(); setArea(null); }}>ちずに もどる</button>
      </div>
    );
  }
  // クリアの しるし：立方体は tsumiki:N（まえと 同じ）、直方体は tsumiki-cuboid:N
  const clearStage = (no) => onFairy((cur) => markCleared(cur, kind === "cuboid" ? "tsumiki-cuboid" : "tsumiki", no, todayStr()));

  if (area === "tsumiki" && stage) {
    return (
      <div className="fl-wrap">
        <TsumikiForest key={playKey} stage={stage} kind={kind} sfx={sfx} onGain={gain} onClearStage={clearStage} />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "tsumiki") {
    return (
      <div className="fl-wrap">
        <h2 className="kk-h2">🧊 つみきの森</h2>
        <FairyGuide text={canCuboid ? "2こ つなげた つみきも ころがせるように なったよ！ たったり ねたり するよ" : "つみきを ころがすと、紙に ついた マスに 色が つくよ。いっしょに やってみよう！"} />
        <Friendship n={f.friendship[GUIDE_FAIRY] || 0} />
        <div className="fl-kinds" role="radiogroup" aria-label="つみきを えらぶ">
          {["cube", "cuboid"].map((k) => {
            const locked = k === "cuboid" && !canCuboid;
            return (
              <button key={k} role="radio" aria-checked={kind === k} disabled={locked}
                className={"fl-kind" + (kind === k ? " fl-kind-on" : "") + (locked ? " fl-kind-lock" : "")}
                onClick={() => { sfx.tap(); setKind(k); }}>
                <span className="fl-kind-icon">{locked ? "🔒" : k === "cube" ? "🧊" : <PoseIcon pose="stand" size={26} />}</span>
                <b>{KINDS[k].name}</b><small>{locked ? "「3. もようから かんがえる」を クリアすると でてくるよ" : KINDS[k].sub}</small>
              </button>
            );
          })}
        </div>
        <div className="fl-stages">
          {STAGES.map((st) => (
            <button key={st.no} className="fl-stage" onClick={() => { sfx.tap(); setPlayKey((k) => k + 1); setStage(st.no); }}>
              <span className="fl-stage-icon">{st.icon}</span>
              <span className="fl-stage-text"><b>{st.no}. {st.name}</b><small>{st.desc}</small></span>
              {f.cleared[clearKey(kind, st.no)] && <span className="fl-stage-ok" aria-label="クリア">✓</span>}
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
      <div className="fl-friends">
        {AREAS.filter((a) => a.ready).map((a) => <Friendship key={a.fairy} n={f.friendship[a.fairy] || 0} fairy={a.fairy} />)}
      </div>
      <div className="fl-map">
        {AREAS.map((a) => {
          const open = a.ready && f.map.includes(a.id);
          return (
            <button key={a.id} className={"fl-area" + (open ? "" : " fl-area-lock")} disabled={!open} onClick={() => { sfx.tap(); setStage(null); setArea(a.id); }}>
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
