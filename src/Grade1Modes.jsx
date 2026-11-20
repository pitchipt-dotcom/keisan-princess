/* =====================================================================
   1ねんせい の あたらしい モードの 画面の 部品（問題づくりは grade1.js）
   - KazuPlay   … かずと すうじ（段階 1〜4）の もんだい部分。こたえは onAnswer(せいかいか) で App の judge へ
   - OhajikiHint … たしざん・ひきざん（10まで）の ヒント（おはじき）。たしざんは あわせる、ひきざんは とって へらす
   星・せいかい／まちがいの 画面・つぎへ は App の あそぶ 画面（ほかの モードと 同じ）
   ===================================================================== */
import React, { useEffect, useState } from "react";
import "./grade1.css";

/* ---- もの の 絵 ---- */
export function ItemIcon({ id, size = 30 }) {
  const s = size;
  const body = {
    strawberry: <><path d="M12 6 C5 6 3 11 5 15 C7 19 10 22 12 22 C14 22 17 19 19 15 C21 11 19 6 12 6Z" fill="#FF5C7A" stroke="#C2385A" strokeWidth="1" />
      <path d="M8 5 L12 7 L16 5 L14 3 L12 5 L10 3Z" fill="#5FC79A" stroke="#2F8F68" strokeWidth=".8" />
      {[[9, 11], [15, 11], [12, 14], [9, 17], [15, 17]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" fill="#FFE07A" />)}</>,
    star: <path d="M12 2.5l2.8 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.8 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill="#FFD84D" stroke="#E2A21B" strokeWidth="1.2" strokeLinejoin="round" />,
    ribbon: <><path d="M12 12 L3 6 L3 18 Z" fill="#FF8FC4" stroke="#D9488F" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 12 L21 6 L21 18 Z" fill="#FF8FC4" stroke="#D9488F" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="#E85FA3" stroke="#D9488F" /></>,
    apple: <><circle cx="12" cy="14" r="7.5" fill="#FF6B6B" stroke="#C94545" strokeWidth="1" />
      <path d="M12 6.5 Q12 4 14 3" stroke="#7A4E22" strokeWidth="1.4" fill="none" /><path d="M13 5 Q17 3 18 6 Q15 7 13 5Z" fill="#5FC79A" /></>,
    flower: <>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="12" cy="7" rx="3.4" ry="4.6" fill="#FFB3D6" stroke="#E85FA3" strokeWidth=".7" transform={`rotate(${a} 12 12)`} />)}
      <circle cx="12" cy="12" r="2.8" fill="#FFD84D" stroke="#E2A21B" strokeWidth=".7" /></>,
  }[id];
  return <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true">{body}</svg>;
}

/* ---- タップすると 1, 2, 3… と 番号が つく ならび ---- */
function useTapCount() {
  const [taps, setTaps] = useState([]);
  const tap = (k) => setTaps((t) => (t.includes(k) ? t.slice(0, t.indexOf(k)) : [...t, k]));   // もういちど → そこから あとを けす
  return [taps, tap, () => setTaps([])];
}
function TapField({ pos, item, sfx, size = 34, h = 170, prefix = "", taps, tap, offset = 0, scale = 1 }) {
  return (
    <div className="g1-field" style={{ height: h }}>
      {pos.map((p, i) => {
        const k = prefix + i, no = taps.indexOf(k);
        const x = 50 + (p.x - 0.5) * 100 * scale, y = 50 + (p.y - 0.5) * 100 * scale;
        return (
          <button key={k} className={"g1-thing" + (no >= 0 ? " g1-thing-on" : "")} style={{ left: `${x}%`, top: `${y}%`, width: size + 8, height: size + 8 }}
            onClick={(e) => { e.stopPropagation(); sfx.tap(); tap(k); }} aria-label={`${i + 1}こめ`}>
            <ItemIcon id={item} size={size} />
            {no >= 0 && <span className="g1-no">{no + 1 + offset}</span>}
          </button>
        );
      })}
    </div>
  );
}
const Count = ({ n, onClear }) => (
  <div className="g1-count"><span>タップした かず：<b>{n}</b></span>{n > 0 && <button className="g1-clear" onClick={onClear}>けす</button>}</div>
);

/* ---- 10こ入りの ケース（2だん × 5） ---- */
function Case({ item, sfx, taps, tap }) {
  return (
    <div className="g1-case" aria-label="10こ入りの ケース">
      <div className="g1-case-grid">
        {Array.from({ length: 10 }, (_, i) => {
          const k = "c" + i, no = taps.indexOf(k);
          return (
            <button key={k} className={"g1-cell" + (no >= 0 ? " g1-thing-on" : "")} onClick={() => { sfx.tap(); tap(k); }} aria-label={`ケースの ${i + 1}こめ`}>
              <ItemIcon id={item} size={24} />{no >= 0 && <span className="g1-no">{no + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="g1-case-label">10こ入り</div>
    </div>
  );
}

const Options = ({ options, onPick }) => (
  <div className="kk-opts g1-opts">
    {options.map((o) => <button key={o} className="kk-opt" onClick={() => onPick(o)}>{o}</button>)}
  </div>
);

/* ---------------- かずと すうじ ---------------- */
export function KazuPlay({ q, sfx, onAnswer }) {
  const [taps, tap, clear] = useTapCount();
  const [plate, setPlate] = useState([]);                 // 段階2：お皿に のせた もの（pool の 番号）
  const clearAll = () => { sfx.tap(); clear(); };

  if (q.stage === 1) {
    return (
      <div className="kk-scene g1-scene">
        <div className="kk-scene-text">{q.itemName}が あるよ。<br /><b>いくつ あるかな？</b></div>
        <TapField pos={q.pos} item={q.item} sfx={sfx} taps={taps} tap={tap} />
        <Count n={taps.length} onClear={clearAll} />
        <div className="g1-tip">ゆびで タップすると 1, 2, 3… と かぞえられるよ</div>
        <Options options={q.options} onPick={(o) => onAnswer(o === q.ans)} />
      </div>
    );
  }
  if (q.stage === 2) {
    const toggle = (i) => { sfx.tap(); setPlate((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i])); };
    return (
      <div className="kk-scene g1-scene">
        <div className="kk-scene-text"><span className="g1-big-num">{q.n}</span>こ お皿に のせよう</div>
        <div className="g1-plate" aria-label="お皿">
          {plate.length === 0 && <span className="g1-plate-empty">ここに のるよ</span>}
          {plate.map((i, k) => (
            <button key={i} className="g1-thing g1-on-plate" onClick={() => toggle(i)} aria-label="お皿から もどす">
              <ItemIcon id={q.item} size={28} /><span className="g1-no">{k + 1}</span>
            </button>
          ))}
        </div>
        <div className="g1-pool" aria-label="のせる もの">
          {Array.from({ length: q.pool }, (_, i) => (
            <button key={i} className={"g1-thing g1-in-pool" + (plate.includes(i) ? " g1-used" : "")} disabled={plate.includes(i)} onClick={() => toggle(i)} aria-label={`${q.itemName}を のせる`}>
              <ItemIcon id={q.item} size={28} />
            </button>
          ))}
        </div>
        <div className="g1-count"><span>お皿の {q.itemName}：<b>{plate.length}</b>こ</span>{plate.length > 0 && <button className="g1-clear" onClick={() => { sfx.tap(); setPlate([]); }}>ぜんぶ もどす</button>}</div>
        <button className="kk-big-btn g1-done" disabled={!plate.length} onClick={() => onAnswer(plate.length === q.n)}>できた！</button>
      </div>
    );
  }
  if (q.stage === 3) {
    return (
      <div className="kk-scene g1-scene">
        <div className="kk-scene-text">{q.itemName}の まとまりが 2つ あるよ。<br /><b>どっちが おおい？</b></div>
        <div className="g1-compare">
          {q.groups.map((g, gi) => (
            <div key={gi} className="g1-side">
              <TapField pos={g.pos} item={q.item} sfx={sfx} taps={taps} tap={tap} prefix={gi ? "R" : "L"} size={24} h={150} scale={g.scale} />
              <div className="g1-side-count">{taps.filter((k) => k.startsWith(gi ? "R" : "L")).length > 0 ? `タップ ${taps.filter((k) => k.startsWith(gi ? "R" : "L")).length}` : " "}</div>
              <button className="kk-opt g1-pick-side" onClick={() => onAnswer((gi ? "R" : "L") === q.ans)}>{gi ? "みぎ" : "ひだり"} が おおい</button>
            </div>
          ))}
        </div>
        <div className="g1-tip">ならび方や ひろがりに だまされないで、かぞえて くらべよう</div>
      </div>
    );
  }
  // 段階4：10こ入りの ケース と ばら
  return (
    <div className="kk-scene g1-scene">
      <div className="kk-scene-text">{q.itemName}が あるよ。<br /><b>ぜんぶで いくつ？</b></div>
      <div className="g1-twenty">
        <Case item={q.item} sfx={sfx} taps={taps} tap={tap} />
        <span className="g1-plus">と</span>
        <div className="g1-ones"><TapField pos={q.pos} item={q.item} sfx={sfx} taps={taps} tap={tap} prefix="o" size={26} h={130} /><div className="g1-case-label">ばら</div></div>
      </div>
      <Count n={taps.length} onClear={clearAll} />
      <div className="g1-tip">10と いくつ かな？ ケースは 10こ だよ</div>
      <Options options={q.options} onPick={(o) => onAnswer(o === q.ans)} />
    </div>
  );
}

/* ---------------- おはじきの ヒント ---------------- */
export function OhajikiHint({ q }) {
  const [go, setGo] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => { setGo(false); const t = setTimeout(() => setGo(true), 450); return () => clearTimeout(t); }, [run]);
  const add = q.op === "+";
  const dots = add
    ? [...Array.from({ length: q.a }, (_, i) => ({ c: "a", i })), ...Array.from({ length: q.b }, (_, i) => ({ c: "b", i }))]
    : Array.from({ length: q.a }, (_, i) => ({ c: i >= q.a - q.b ? "take" : "a", i }));
  return (
    <div className={"g1-ohajiki" + (go ? " g1-go" : "")} aria-label={add ? "あわせる おはじき" : "とって へらす おはじき"}>
      <div className={"g1-oh-row" + (add ? " g1-oh-add" : "")}>
        {dots.map((d, k) => (
          <span key={k} className={"g1-oh g1-oh-" + d.c + (add && d.c === "b" && d.i === 0 ? " g1-oh-gapl" : "")} style={{ transitionDelay: d.c === "take" ? `${(d.i - (q.a - q.b)) * 80}ms` : undefined }} />
        ))}
        {q.a === 0 && add && <span className="g1-oh-zero">（はじめは 0こ）</span>}
      </div>
      <div className="g1-oh-cap">
        {add ? `${q.a}こ と ${q.b}こ を あわせると…` : q.b === 0 ? `${q.a}こ から 0こ とる（へらない）と…` : `${q.a}こ から ${q.b}こ とって へらすと…`}
        <button className="g1-oh-again" onClick={() => setRun((r) => r + 1)}>もういちど</button>
      </div>
    </div>
  );
}
