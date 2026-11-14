/* =====================================================================
   ペンで かく モード
   - おはなし もんだい（ルナ・マリン・ロゼの ぶんしょうだい ＋ かんたんな 絵）
       しき（□ ○ □ ＝ □）と こたえ（□）を ペンで かく
   - かきこみ ひっさん（2けた・3けたの たしざん ひきざん、2けた×1けた）
       こたえの マスに 1けたずつ ペンで かく
   ===================================================================== */
import React, { useEffect, useRef, useState } from "react";
import WriteBox from "./handwriting/WriteBox.jsx";
import "./writeModes.css";

const rnd = (lo, hi) => lo + ((Math.random() * (hi - lo + 1)) | 0);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function weightedPick(keys, mastery, lastWrongKey, prefix) {
  const ws = keys.map((k) => {
    const m = Math.max(0, mastery[prefix + k] || 0);
    let w = 1 / (1 + m);
    if (prefix + k === lastWrongKey) w *= 2.5;
    return w;
  });
  const total = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) return keys[i]; }
  return keys[keys.length - 1];
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* 「{何|なん}」→ ふりがな つきの もじ */
function Ruby({ text }) {
  const out = [];
  const re = /\{([^|}]+)\|([^}]+)\}/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<ruby key={i++}>{m[1]}<rt>{m[2]}</rt></ruby>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/* ============================ おはなし もんだい ========================= */
// kind: mul（1つ分 × いくつ分）/ add（あわせて）/ sub（のこり）/ diff（ちがい）
const STORY_TEMPLATES = {
  mul: [
    { speaker: "princess", item: "cookie", unit: "こ",
      text: (a, b) => `ロゼの おしろで おちゃかいを します。{1人|ひとり}に ${a}こずつ クッキーを くばります。${b}{人|にん}に くばると、クッキーは ぜんぶで {何|なん}こ いるでしょう。`,
      chips: (a, b) => [`1人に ${a}こずつ`, `${b}人分`] },
    { speaker: "witch", item: "star", unit: "こ",
      text: (a, b) => `ルナは まほうで ほしを {出|だ}します。1かいの まほうで、ほしが ${a}こ {出|で}ます。${b}かい まほうを つかうと、ほしは ぜんぶで {何|なん}こに なるでしょう。`,
      chips: (a, b) => [`1かいで ${a}こずつ`, `${b}かい分`] },
    { speaker: "mermaid", item: "flower", unit: "本",
      text: (a, b) => `マリンは {花|はな}たばを ${b}つ {作|つく}ります。1つの {花|はな}たばに、{花|はな}を ${a}本ずつ つかいます。{花|はな}は ぜんぶで {何|なん}本 いるでしょう。`,
      chips: (a, b) => [`1たばに ${a}本ずつ`, `${b}たば分`] },
    { speaker: "princess", item: "candy", unit: "こ",
      text: (a, b) => `ロゼは おともだちに あめを プレゼントします。1ふくろに あめを ${a}こずつ {入|い}れて、${b}ふくろ {作|つく}ります。あめは ぜんぶで {何|なん}こ いるでしょう。`,
      chips: (a, b) => [`1ふくろに ${a}こずつ`, `${b}ふくろ分`] },
  ],
  add: [
    { speaker: "witch", item: "star", unit: "こ",
      text: (a, b) => `ルナは ほしの かけらを ${a}こ もっています。マリンから ${b}こ もらいました。ほしの かけらは ぜんぶで {何|なん}こに なったでしょう。`,
      chips: (a, b) => [`はじめ ${a}こ`, `もらった ${b}こ`] },
    { speaker: "princess", item: "flower", unit: "本",
      text: (a, b) => `おしろの にわに {花|はな}が ${a}本 さいています。ロゼが あたらしく ${b}本 うえました。{花|はな}は ぜんぶで {何|なん}本に なったでしょう。`,
      chips: (a, b) => [`はじめ ${a}本`, `うえた ${b}本`] },
    { speaker: "mermaid", item: "cookie", unit: "こ",
      text: (a, b) => `マリンは クッキーを ${a}こ やきました。ロゼが ${b}こ もってきて くれました。クッキーは あわせて {何|なん}こ でしょう。`,
      chips: (a, b) => [`マリン ${a}こ`, `ロゼ ${b}こ`] },
  ],
  sub: [
    { speaker: "princess", item: "cookie", unit: "こ",
      text: (a, b) => `ロゼは クッキーを ${a}こ やきました。おちゃかいで ${b}こ たべました。のこりは {何|なん}こ でしょう。`,
      chips: (a, b) => [`はじめ ${a}こ`, `たべた ${b}こ`] },
    { speaker: "mermaid", item: "candy", unit: "こ",
      text: (a, b) => `マリンは あめを ${a}こ もっています。ルナに ${b}こ あげました。のこりは {何|なん}こ でしょう。`,
      chips: (a, b) => [`はじめ ${a}こ`, `あげた ${b}こ`] },
  ],
  diff: [
    { speaker: "witch", item: "star", unit: "こ", names: ["ルナ", "ロゼ"],
      text: (a, b) => `ほしあつめ きょうそう！ ルナは ほしを ${a}こ、ロゼは ほしを ${b}こ あつめました。ルナの ほうが {何|なん}こ {多|おお}いでしょう。`,
      chips: (a, b) => [`ルナ ${a}こ`, `ロゼ ${b}こ`] },
    { speaker: "mermaid", item: "flower", unit: "本", names: ["マリン", "ルナ"],
      text: (a, b) => `マリンは {花|はな}を ${a}本、ルナは {花|はな}を ${b}本 つみました。マリンの ほうが {何|なん}本 {多|おお}いでしょう。`,
      chips: (a, b) => [`マリン ${a}本`, `ルナ ${b}本`] },
  ],
};
const STORY_KINDS = ["mul", "mul", "add", "sub", "diff"]; // かけざんを すこし おおめに

export function makeStoryQuestion(mastery = {}, lastWrongKey = null) {
  const kind = weightedPick(STORY_KINDS, mastery, lastWrongKey, "st:");
  const t = pick(STORY_TEMPLATES[kind]);
  let a, b, op, ans;
  if (kind === "mul") { a = rnd(2, 9); b = rnd(2, 9); op = "×"; ans = a * b; }
  else if (kind === "add") { a = rnd(12, 68); b = rnd(6, Math.min(31, 99 - a)); op = "+"; ans = a + b; }
  else { a = rnd(21, 95); b = rnd(6, a - 5); op = "-"; ans = a - b; }
  return { id: newId(), gameType: "story", kind, a, b, op, ans, key: "st:" + kind, tpl: t, unit: t.unit };
}

/* ---- 絵：10の たば ＋ ばら ---- */
function TensOnes({ n, item, MiniItem, max = 99 }) {
  const v = Math.min(n, max);
  const tens = Math.floor(v / 10), ones = v % 10;
  return (
    <div className="wm-tens">
      {Array.from({ length: tens }).map((_, i) => (
        <div key={"t" + i} className="wm-ten" title="10">
          {Array.from({ length: 10 }).map((__, k) => <MiniItem key={k} type={item} size={9} />)}
        </div>
      ))}
      {ones > 0 && (
        <div className="wm-ones">
          {Array.from({ length: ones }).map((_, i) => <MiniItem key={i} type={item} size={14} />)}
        </div>
      )}
    </div>
  );
}

function StoryPicture({ q, MiniItem }) {
  const { kind, a, b, tpl } = q;
  if (kind === "mul") {
    return (
      <div className="wm-plates">
        {Array.from({ length: b }).map((_, gi) => (
          <div key={gi} className="wm-plate">
            {Array.from({ length: a }).map((__, i) => <MiniItem key={i} type={tpl.item} size={13} />)}
          </div>
        ))}
      </div>
    );
  }
  if (kind === "add") {
    return (
      <div className="wm-pic-row">
        <div className="wm-pic-box"><TensOnes n={a} item={tpl.item} MiniItem={MiniItem} /></div>
        <div className="wm-pic-op">＋</div>
        <div className="wm-pic-box"><TensOnes n={b} item={tpl.item} MiniItem={MiniItem} /></div>
      </div>
    );
  }
  if (kind === "sub") {
    return (
      <div className="wm-pic-col">
        <div className="wm-pic-box"><TensOnes n={a} item={tpl.item} MiniItem={MiniItem} /></div>
        <div className="wm-pic-cap">この中から {b}{q.unit} へったよ</div>
      </div>
    );
  }
  const [n1, n2] = tpl.names || ["", ""];
  return (
    <div className="wm-pic-col">
      <div className="wm-pic-line"><span className="wm-pic-name">{n1}</span><div className="wm-pic-box"><TensOnes n={a} item={tpl.item} MiniItem={MiniItem} /></div></div>
      <div className="wm-pic-line"><span className="wm-pic-name">{n2}</span><div className="wm-pic-box"><TensOnes n={b} item={tpl.item} MiniItem={MiniItem} /></div></div>
    </div>
  );
}

const OP_LABEL = { "+": "＋", "-": "−", "×": "×" };
const storyHint = (q) => {
  if (q.kind === "mul") return `「${q.a}${q.unit}ずつ」が「${q.b}つ分」だから、かけざん。1つ分の かず × いくつ分 で ${q.a} × ${q.b} だよ`;
  if (q.kind === "add") return "もらったり ふえたり すると「ぜんぶ」は たしざんだよ";
  if (q.kind === "sub") return "へった あとの「のこり」は ひきざんだよ";
  return "「ちがい」は ひきざん。おおきい かず − ちいさい かず だよ";
};

function useAttempts() {
  const [res, setRes] = useState({});
  const [marks, setMarks] = useState({});
  const [resets, setResets] = useState({});
  const [tries, setTries] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [msg, setMsg] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const setOne = (k) => (r) => {
    setRes((p) => ({ ...p, [k]: r }));
    setMarks((p) => (p[k] === "wrong" || p[k] === "close" ? { ...p, [k]: null } : p));
  };
  // 正しい ところは ○で のこし、ちがう ところは 少し まって けす
  const applyMarks = (m) => {
    setMarks(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const bad = Object.keys(m).filter((k) => m[k] !== "right");
      setRes((p) => { const n = { ...p }; bad.forEach((k) => { n[k] = null; }); return n; });
      setResets((p) => { const n = { ...p }; bad.forEach((k) => { n[k] = (n[k] || 0) + 1; }); return n; });
    }, 1100);
  };
  return { res, setOne, marks, applyMarks, resets, tries, setTries, reveal, setReveal, msg, setMsg, timer };
}

export function StoryPlay({ q, characters, MiniItem, onRight, onMiss, onSkip, onTap }) {
  const st = useAttempts();
  const [op, setOp] = useState(null);
  const [opMark, setOpMark] = useState(null);
  const done = useRef(false);
  const ch = characters.find((c) => c.id === q.tpl.speaker) || characters[0];
  const Face = ch.Comp;
  const [chip1, chip2] = q.tpl.chips(q.a, q.b);
  const val = (k) => (st.res[k] && st.res[k].text) || "";
  const ready = ["a", "b", "c", "ans"].every((k) => val(k)) && op;

  const check = () => {
    if (!ready || done.current) return;
    onTap && onTap();
    const A = val("a"), B = val("b"), Cc = val("c"), An = val("ans");
    const sa = String(q.a), sb = String(q.b), sc = String(q.ans);
    const m = {};
    let close = false;
    if (A === sa && B === sb) { m.a = "right"; m.b = "right"; }
    else if (A === sb && B === sa) {
      if (q.op === "+") { m.a = "right"; m.b = "right"; }        // たしざんは いれかえても OK
      else { m.a = "close"; m.b = "close"; close = true; }        // かけざん・ひきざんは じゅんばんが だいじ
    } else { m.a = A === sa ? "right" : "wrong"; m.b = B === sb ? "right" : "wrong"; }
    m.c = Cc === sc ? "right" : "wrong";
    m.ans = An === sc ? "right" : "wrong";
    const opOk = op === q.op;
    setOpMark(opOk ? "right" : "wrong");
    const allRight = opOk && Object.values(m).every((v) => v === "right");
    st.applyMarks(m);
    if (allRight) {
      done.current = true;
      st.setMsg("");
      st.timer.current = setTimeout(() => onRight(), 900);
      return;
    }
    if (!opOk) setTimeout(() => setOp(null), 1100);
    st.setTries((t) => t + 1);
    st.setMsg(close
      ? (q.op === "×" ? "おしい！ かける じゅんばんに 気をつけよう。「1つ分の かず × いくつ分」だよ" : "おしい！ ひく じゅんばんに 気をつけよう。おおきい かずから ひくよ")
      : "○が ついていない ところを、もういちど かいてみよう♪");
    onMiss();
  };

  const showAnswer = () => { onTap && onTap(); st.setReveal(true); done.current = true; };
  const box = (k, label) => (
    <WriteBox key={k} label={label} result={st.res[k]} onInk={st.setOne(k)} mark={st.marks[k] || null}
      locked={st.marks[k] === "right" || st.reveal} resetKey={st.resets[k] || 0}
      reveal={st.reveal ? String(k === "a" ? q.a : k === "b" ? q.b : q.ans) : null} />
  );

  return (
    <div className="wm-card">
      <div className="wm-story-head">
        <div className="wm-face"><Face mood="happy" size={62} /></div>
        <div className="wm-story-text"><Ruby text={q.tpl.text(q.a, q.b)} /></div>
      </div>
      <div className="wm-chips">
        <span className="wm-chip wm-chip-y">{chip1}</span>
        <span className="wm-chip wm-chip-p">{chip2}</span>
      </div>
      <StoryPicture q={q} MiniItem={MiniItem} />

      <div className="wm-row-label"><span className="wm-tag">しき</span></div>
      <div className="wm-eq">
        <div className="wm-slot">{box("a", "しきの 1つめの かず")}</div>
        <div className="wm-ops">
          {["+", "-", "×"].map((o) => (
            <button key={o} type="button" disabled={st.reveal || opMark === "right"}
              className={"wm-op" + (op === o ? " wm-op-on" : "") + (op === o && opMark === "right" ? " wm-op-right" : "") + (op === o && opMark === "wrong" ? " wm-op-wrong" : "")}
              onClick={() => { onTap && onTap(); setOp(o); setOpMark(null); }}>{OP_LABEL[o]}</button>
          ))}
        </div>
        <div className="wm-slot">{box("b", "しきの 2つめの かず")}</div>
        <div className="wm-sign">＝</div>
        <div className="wm-slot">{box("c", "しきの こたえ")}</div>
      </div>
      {st.reveal && <div className="wm-reveal-eq">{q.a} {OP_LABEL[q.op]} {q.b} ＝ {q.ans}</div>}

      <div className="wm-row-label"><span className="wm-tag">こたえ</span></div>
      <div className="wm-ans">
        <div className="wm-slot wm-slot-ans">{box("ans", "こたえ")}</div>
        <div className="wm-unit">{q.unit}</div>
      </div>

      {st.msg && !st.reveal && <div className="wm-msg">{st.msg}</div>}
      {st.tries >= 1 && !st.reveal && <div className="wm-hint">💡 {storyHint(q)}</div>}

      {!st.reveal ? (
        <>
          <button type="button" className="wm-check" disabled={!ready} onClick={check}>こたえあわせ ✓</button>
          {!ready && <div className="wm-tip">マスに 数字を かいて、まんなかの ＋ − × から えらんでね</div>}
          {st.tries >= 3 && <button type="button" className="wm-giveup" onClick={showAnswer}>こたえを 見る</button>}
        </>
      ) : (
        <>
          <div className="wm-msg">こたえは {q.ans}{q.unit} だよ。つぎは できるよ！</div>
          <button type="button" className="wm-check" onClick={onSkip}>つぎの もんだいへ →</button>
        </>
      )}
    </div>
  );
}

/* ============================ かきこみ ひっさん ========================= */
const WRITE_KINDS = ["add22", "sub22", "add32", "sub32", "mul21"];
export const WRITE_KIND_LABEL = { add22: "2けた＋2けた", sub22: "2けた−2けた", add32: "3けた＋2けた", sub32: "3けた−2けた", mul21: "2けた×1けた" };

export function makeWriteQuestion(mastery = {}, lastWrongKey = null) {
  const kind = weightedPick(WRITE_KINDS, mastery, lastWrongKey, "w:");
  const want = Math.random() < 0.7; // くりあがり・くりさがりを おおめに
  let a, b, op;
  for (let guard = 0; guard < 60; guard++) {
    if (kind === "add22") { a = rnd(10, 89); b = rnd(10, 89); op = "+"; if (!want || (a % 10) + (b % 10) >= 10) break; }
    else if (kind === "sub22") { a = rnd(30, 99); b = rnd(10, a - 10); op = "-"; if (!want || (a % 10) < (b % 10)) break; }
    else if (kind === "add32") { a = rnd(100, 899); b = rnd(10, 99); op = "+"; if (!want || (a % 10) + (b % 10) >= 10) break; }
    else if (kind === "sub32") { a = rnd(110, 999); b = rnd(10, 99); op = "-"; if (!want || (a % 10) < (b % 10)) break; }
    else { a = rnd(11, 49); b = rnd(2, 9); op = "×"; if (!want || (a % 10) * b >= 10) break; }
  }
  const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
  const sa = String(a), sb = String(b);
  const cols = op === "-" ? sa.length : Math.max(sa.length, sb.length) + 1;
  return { id: newId(), gameType: "write", kind, a, b, op, ans, cols, key: "w:" + kind };
}

const PLACE = ["一", "十", "百", "千"];
function columnSteps(q) {
  const da = String(q.a).split("").reverse().map(Number);
  const db = String(q.b).split("").reverse().map(Number);
  const steps = [];
  if (q.op === "+") {
    let carry = 0;
    for (let i = 0; i < Math.max(da.length, db.length); i++) {
      const x = da[i] || 0, y = db[i] || 0, s = x + y + carry;
      const parts = [x, y].concat(carry ? [carry] : []).join(" ＋ ");
      steps.push(`${PLACE[i]}のくらい：${parts} ＝ ${s}` + (s >= 10 ? ` → ${s % 10} を かいて、1 を となりへ` : ""));
      carry = s >= 10 ? 1 : 0;
    }
    if (carry) steps.push(`${PLACE[Math.max(da.length, db.length)]}のくらい：くりあがった 1 を かく`);
  } else if (q.op === "-") {
    let borrow = 0;
    for (let i = 0; i < da.length; i++) {
      let x = da[i] - borrow; const y = db[i] || 0;
      const head = borrow ? `（かしたので ${da[i]} → ${x}）` : "";
      if (x < y) { steps.push(`${PLACE[i]}のくらい：${head}${x} − ${y} は ひけないので、となりから 10 かりて ${x + 10} − ${y} ＝ ${x + 10 - y}`); borrow = 1; }
      else { if (i < db.length || borrow) steps.push(`${PLACE[i]}のくらい：${head}${x} − ${y} ＝ ${x - y}`); else steps.push(`${PLACE[i]}のくらい：${x} を そのまま おろす`); borrow = 0; }
    }
  } else {
    let carry = 0;
    for (let i = 0; i < da.length; i++) {
      const p = da[i] * q.b, s = p + carry;
      steps.push(`${PLACE[i]}のくらい：${da[i]} × ${q.b} ＝ ${p}` + (carry ? `、${p} ＋ ${carry} ＝ ${s}` : "") + (s >= 10 && i < da.length - 1 ? ` → ${s % 10} を かいて、${Math.floor(s / 10)} を となりへ` : ""));
      carry = Math.floor(s / 10);
    }
  }
  return steps;
}

export function WritePlay({ q, onRight, onMiss, onSkip, onTap }) {
  const st = useAttempts();
  const done = useRef(false);
  const ansStr = String(q.ans);
  const expected = Array.from({ length: q.cols }, (_, i) => {
    const k = i - (q.cols - ansStr.length);
    return k >= 0 ? ansStr[k] : "";
  });
  const keys = expected.map((_, i) => "d" + i);
  const val = (k) => (st.res[k] && st.res[k].text) || "";
  // こたえの けたの マスが ぜんぶ かけたら こたえあわせ できる
  const ready = keys.every((k, i) => expected[i] === "" || val(k));
  const rowA = String(q.a).padStart(q.cols, " ").split("");
  const rowB = String(q.b).padStart(q.cols, " ").split("");

  const check = () => {
    if (!ready || done.current) return;
    onTap && onTap();
    const m = {};
    keys.forEach((k, i) => {
      const v = val(k);
      m[k] = expected[i] === "" ? (v === "" || v === "0" ? "right" : "wrong") : (v === expected[i] ? "right" : "wrong");
    });
    // まだ かいていない 上の けた（からっぽで よい マス）は しるしを つけない
    keys.forEach((k, i) => { if (expected[i] === "" && val(k) === "") delete m[k]; });
    const allRight = Object.values(m).every((v) => v === "right");
    st.applyMarks(m);
    if (allRight) {
      done.current = true;
      st.setMsg("");
      st.timer.current = setTimeout(() => onRight(), 900);
      return;
    }
    st.setTries((t) => t + 1);
    st.setMsg("○が ついていない マスを、もういちど かいてみよう♪");
    onMiss();
  };
  const showAnswer = () => { onTap && onTap(); st.setReveal(true); done.current = true; };

  return (
    <div className="wm-card">
      <div className="wm-write-title">ひっさんで けいさんしよう <small>{WRITE_KIND_LABEL[q.kind]}</small></div>
      <div className="wm-hissan" style={{ gridTemplateColumns: `36px repeat(${q.cols}, minmax(0, 72px))` }}>
        <div />
        {rowA.map((c, i) => <div key={"a" + i} className="wm-h-digit">{c.trim()}</div>)}
        <div className="wm-h-op">{OP_LABEL[q.op]}</div>
        {rowB.map((c, i) => <div key={"b" + i} className="wm-h-digit">{c.trim()}</div>)}
        <div className="wm-h-line" style={{ gridColumn: `1 / span ${q.cols + 1}` }} />
        <div />
        {keys.map((k, i) => (
          <div key={k} className="wm-h-cell">
            <WriteBox small label={`${PLACE[q.cols - 1 - i]}のくらい`} result={st.res[k]} onInk={st.setOne(k)}
              mark={st.marks[k] || null} locked={st.marks[k] === "right" || st.reveal} resetKey={st.resets[k] || 0}
              reveal={st.reveal ? expected[i] : null} />
          </div>
        ))}
      </div>

      {st.msg && !st.reveal && <div className="wm-msg">{st.msg}</div>}
      {st.tries >= 1 && !st.reveal && (
        <div className="wm-hint wm-hint-steps">
          <div>💡 {q.op === "×" ? "一のくらいから じゅんばんに かけよう" : "一のくらいから じゅんばんに けいさんしよう"}</div>
          {st.tries >= 2 && columnSteps(q).map((s, i) => <div key={i} className="wm-step">{s}</div>)}
        </div>
      )}

      {!st.reveal ? (
        <>
          <button type="button" className="wm-check" disabled={!ready} onClick={check}>こたえあわせ ✓</button>
          {!ready && <div className="wm-tip">マスに 1つずつ 数字を かいてね。いちばん左の マスは つかわない ことも あるよ</div>}
          {st.tries >= 3 && <button type="button" className="wm-giveup" onClick={showAnswer}>こたえを 見る</button>}
        </>
      ) : (
        <>
          <div className="wm-msg">{q.a} {OP_LABEL[q.op]} {q.b} ＝ {q.ans}。つぎは できるよ！</div>
          <button type="button" className="wm-check" onClick={onSkip}>つぎの もんだいへ →</button>
        </>
      )}
    </div>
  );
}
