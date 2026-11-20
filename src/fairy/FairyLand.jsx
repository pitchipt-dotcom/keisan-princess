/* =====================================================================
   妖精の国 たんけん — 地図 → エリア → だんかい
   App から React.lazy で 読みこむ（Three.js は ここから 先だけ。ほかの モードの 起動は おそく ならない）
   エリアごとに 案内役の 妖精が いる（つみきの森＝ミント、ジュースの泉＝ラムネ、ますめの花畑＝ポピー、はこの工房＝ペタ）。なかよし度は 妖精ごと
   ごほうびは「妖精と なかよしに なる」（ドラゴンの そだちポイント・星のかけらとは 別）
   あそびかた（チュートリアル）：エリアに はじめて 入った とき 自動で 出す（セーブの fairy.tutorials）。
     エリアの 画面と あそぶ 画面の「あそびかた」ボタンで いつでも 見なおせる（あそんで いる とちゅうでも 上に かさねて 出す）
   ===================================================================== */
import React, { useState } from "react";
import { TsumikiForest, FairyGuide, STAGES } from "./TsumikiForest.jsx";
import { JuiceSpring, JSTAGES, JUICE_FAIRY } from "./JuiceSpring.jsx";
import { MasumeGarden, MSTAGES, MASUME_FAIRY } from "./MasumeGarden.jsx";
import { HakoWorkshop, HSTAGES, HAKO_FAIRY, NetDex } from "./HakoWorkshop.jsx";
import { AREAS, FAIRIES, GUIDE_FAIRY, normalizeFairy, addFriendship, markCleared, friendHearts, FRIEND_LEVEL, clearKey, cuboidOpen, addHakoDex, hakoCuboidOpen, markTutorial } from "./fairy.js";
import { AreaTutorial, TUTORIAL_AREAS } from "./AreaTutorials.jsx";
import { KINDS } from "./tsumiki.js";
import { PoseIcon } from "./TopGrid.jsx";
import { fairyArt } from "../assets/fairy/index.js";
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
  const [tut, setTut] = useState(null);          // 見せて いる あそびかた（エリアの id）
  const closeTut = () => { const a = tut; setTut(null); if (a) onFairy((cur) => markTutorial(cur, a, todayStr())); };
  const shell = (el) => <>{el}{tut && <AreaTutorial key={tut} area={tut} sfx={sfx} onClose={closeTut} />}</>;
  const HowBtn = () => (TUTORIAL_AREAS.includes(area) ? <button className="fl-how" onClick={() => { sfx.tap(); setTut(area); }}>❓ あそびかた</button> : null);
  const enterArea = (id) => { setStage(null); setArea(id); if (TUTORIAL_AREAS.includes(id) && !f.tutorials[id]) setTut(id); };

  const gain = (n) => onFairy((cur) => addFriendship(cur, GUIDE_FAIRY, n));
  const gainJuice = (n) => onFairy((cur) => addFriendship(cur, JUICE_FAIRY, n));
  const clearJuice = (no) => onFairy((cur) => markCleared(cur, "juice", no, todayStr()));

  const [hkind, setHkind] = useState("cube");    // はこの工房：cube（立方体）／ cuboid（直方体）
  const [showDex, setShowDex] = useState(false);
  const hkKey = (no) => (hkind === "cuboid" ? "hako-cuboid" : "hako") + ":" + no;
  const gainHako = (n) => onFairy((cur) => addFriendship(cur, HAKO_FAIRY, n));
  const clearHako = (no) => onFairy((cur) => markCleared(cur, hkind === "cuboid" ? "hako-cuboid" : "hako", no, todayStr()));
  const hkCuboid = hakoCuboidOpen(f);

  if (area === "hako" && stage) {
    return shell(
      <div className="fl-wrap">
        <HakoWorkshop key={playKey} stage={stage} kind={hkind} sfx={sfx} onGain={gainHako} onClearStage={clearHako}
          dex={f.hakoDex} onDex={(id) => onFairy((cur) => addHakoDex(cur, id))} />
        <HowBtn />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "hako") {
    return shell(
      <div className="fl-wrap">
        <h2 className="kk-h2">📦 はこの工房</h2>
        <HowBtn />
        <FairyGuide full fairy={HAKO_FAIRY} text={hkCuboid ? "直方体の はこも つくれるように なったよ！ 長い 面と みじかい 面が あるね" : "わたしは ペタ！ はこを きって ひらいたり、おって くみたてたり しよう！"} />
        <Friendship n={f.friendship[HAKO_FAIRY] || 0} fairy={HAKO_FAIRY} />
        <div className="fl-kinds" role="radiogroup" aria-label="はこを えらぶ">
          {["cube", "cuboid"].map((k) => {
            const locked = k === "cuboid" && !hkCuboid;
            return (
              <button key={k} role="radio" aria-checked={hkind === k} disabled={locked}
                className={"fl-kind" + (hkind === k ? " fl-kind-on" : "") + (locked ? " fl-kind-lock" : "")}
                onClick={() => { sfx.tap(); setHkind(k); }}>
                <span className="fl-kind-icon">{locked ? "🔒" : k === "cube" ? "🎲" : "📦"}</span>
                <b>{k === "cube" ? "立方体の はこ" : "直方体の はこ"}</b><small>{locked ? "「4. どの 面と むかいあう？」を クリアすると でてくるよ" : k === "cube" ? "ぜんぶ 正方形の 面" : "長方形の 面も ある"}</small>
              </button>
            );
          })}
        </div>
        <div className="fl-stages">
          {HSTAGES.map((st) => (
            <button key={st.no} className="fl-stage hk-fl-stage" onClick={() => { sfx.tap(); setPlayKey((k) => k + 1); setStage(st.no); }}>
              <span className="fl-stage-icon">{st.icon}</span>
              <span className="fl-stage-text"><b>{st.no}. {st.name}</b><small>{st.desc}</small></span>
              {f.cleared[hkKey(st.no)] && <span className="fl-stage-ok" aria-label="クリア">✓</span>}
            </button>
          ))}
        </div>
        <button className="ts-act hk-dex-btn" onClick={() => { sfx.tap(); setShowDex(!showDex); }}>📖 てんかいず ずかん {f.hakoDex.length} / 11</button>
        {showDex && <NetDex have={f.hakoDex} />}
        <button className="kk-text-btn" onClick={() => { sfx.tap(); setArea(null); setShowDex(false); }}>ちずに もどる</button>
      </div>
    );
  }
  const gainMasume = (n) => onFairy((cur) => addFriendship(cur, MASUME_FAIRY, n));
  const clearMasume = (no) => onFairy((cur) => markCleared(cur, "masume", no, todayStr()));

  if (area === "masume" && stage) {
    return shell(
      <div className="fl-wrap">
        <MasumeGarden key={playKey} stage={stage} sfx={sfx} onGain={gainMasume} onClearStage={clearMasume} />
        <HowBtn />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "masume") {
    return shell(
      <div className="fl-wrap">
        <h2 className="kk-h2">🌷 ますめの花畑</h2>
        <HowBtn />
        <FairyGuide full fairy={MASUME_FAIRY} text="わたしは ポピー！ 花だんの 広さを、切ったり うごかしたり して「何ます分」か しらべよう！" />
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
    return shell(
      <div className="fl-wrap">
        <JuiceSpring key={playKey} stage={stage} sfx={sfx} onGain={gainJuice} onClearStage={clearJuice} />
        <HowBtn />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "juice") {
    return shell(
      <div className="fl-wrap">
        <h2 className="kk-h2">🧃 ジュースの泉</h2>
        <HowBtn />
        <FairyGuide full fairy={JUICE_FAIRY} text="わたしは ラムネ！ ジュースを そそいで、L・dL・mL の かさを はかってみよう！" />
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
    return shell(
      <div className="fl-wrap">
        <TsumikiForest key={playKey} stage={stage} kind={kind} sfx={sfx} onGain={gain} onClearStage={clearStage} />
        <HowBtn />
        <button className="kk-text-btn fl-back" onClick={() => { sfx.tap(); setStage(null); }}>だんかいを えらびなおす</button>
      </div>
    );
  }
  if (area === "tsumiki") {
    return shell(
      <div className="fl-wrap">
        <h2 className="kk-h2">🧊 つみきの森</h2>
        <HowBtn />
        <FairyGuide full text={canCuboid ? "2こ つなげた つみきも ころがせるように なったよ！ たったり ねたり するよ" : "つみきを ころがすと、紙に ついた マスに 色が つくよ。いっしょに やってみよう！"} />
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
  return shell(
    <div className="fl-wrap">
      <h2 className="kk-h2">🧚 ようせいの くに たんけん</h2>
      <FairyGuide full text="ようこそ！ わたしは ミント。ようせいの くにを いっしょに たんけん しよう！" />
      <div className="fl-friends">
        {AREAS.filter((a) => a.ready).map((a) => <Friendship key={a.fairy} n={f.friendship[a.fairy] || 0} fairy={a.fairy} />)}
      </div>
      <div className="fl-map">
        {AREAS.map((a) => {
          const open = a.ready && f.map.includes(a.id);
          return (
            <button key={a.id} className={"fl-area" + (open ? "" : " fl-area-lock")} disabled={!open} onClick={() => { sfx.tap(); enterArea(a.id); }}>
              <span className="fl-area-icon">{!open ? "🔒" : fairyArt("fairy-" + a.fairy + "-face") ? <img className="fl-area-face" src={fairyArt("fairy-" + a.fairy + "-face")} alt={FAIRIES[a.fairy].name} /> : a.icon}</span>
              <b>{a.name}</b><small>{a.desc}</small>
            </button>
          );
        })}
      </div>
      <button className="kk-text-btn" onClick={onExit}>モードえらびに もどる</button>
    </div>
  );
}
