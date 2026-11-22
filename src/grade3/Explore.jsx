/* =====================================================================
   3年生：図で うごかして わかる（もんだいの まえ）
   1つの「やってみよう」は 1画面で おわる：上から
     問題文（1〜2行）→ 操作（クッキーを くばる／ジュースを そそぐ／ケーキを ぬる）→ こたえる らん
   - わり算は 数字キーが いつも 出ている。くばっても くばらなくても その場で こたえられる
   - 操作が こたえに なる もの（ぬる・そそぐ）は、操作が おわったら こたえあわせ
   - せいかい したら、わかった ことを 1文で 声かけして、じどうで つぎの「やってみよう」へ
   - まちがえても 止めない。さいごが おわったら onFinish（＝もんだいへ）
   ===================================================================== */
import React, { useEffect, useState } from "react";
import "../fairy/fairy.css";
import { PourScene } from "../fairy/PourScene.jsx";
import { isExact, TYPES } from "../fairy/juice.js";
import { CookieDeal, FracShape, Frac } from "./Figures.jsx";
import { fmtDec } from "./g3.js";


/* 単元の 名前と すすみの 点（見出しと 1行に まとめて、たての 場所を あける） */
function Steps({ n, at, label }) {
  return (
    <div className="g3-steps-row">
      {label && <b className="g3-steps-label">{label}</b>}
      <div className="g3-steps" aria-label={`やってみよう ${at + 1}/${n}`}>{Array.from({ length: n }, (_, i) => <i key={i} className={i < at ? "on" : i === at ? "now" : ""} />)}</div>
    </div>
  );
}
/* 1画面：問題文 → せいかいの 声かけと「つぎへ →」（せいかい したら）→ 操作・こたえる（children） */
function Task({ step, steps, line, ok, onNext, nextLabel = "つぎへ →", label, children }) {
  // つぎの 課題に なったら いちばん上へ（下の 数字キーまで スクロール して いても、問題文から 見える ように）
  useEffect(() => { if (typeof window !== "undefined") window.scrollTo(0, 0); }, [step, line]);
  return (
    <div className="g3-explore">
      <Steps n={steps} at={step} label={label} />
      <div className="g3-line">{line}</div>
      {ok && (
        <div className="g3-ok" role="status">
          <b>せいかい！</b>{ok}
          <button className="kk-big-btn g3-next-btn" onClick={onNext}>{nextLabel}</button>
        </div>
      )}
      {children}
    </div>
  );
}
/* せいかい → 声かけと「つぎへ →」を 出す。じどうでは すすまない（読んで いる とちゅうで かわらない ように） */
function useNext(sfx, onNext, last) {
  const [ok, setOk] = useState(null);
  const next = () => { sfx.tap(); setOk(null); onNext(); };
  return [ok, (msg) => setOk(msg), next, last ? "もんだいに すすむ →" : "つぎへ →"];
}

/* 数字で こたえる らん（すうじキーつき） */
function NumAnswer({ fields, sfx, onSubmit, disabled }) {
  const [val, setVal] = useState(() => Object.fromEntries(fields.map((f) => [f.k, ""])));
  const [act, setAct] = useState(fields[0].k);
  const press = (d) => {
    sfx.tap();
    setVal((v) => {
      const cur = v[act];
      const nx = d === "けす" ? cur.slice(0, -1) : cur.length >= 2 ? cur : cur === "0" ? d : cur + d;
      return { ...v, [act]: nx };
    });
    // らんが 2つ（1さら □こ、あまり □こ）の ときは、こたえが 1けた なので 数字を 入れたら じどうで つぎの らんへ
    const i = fields.findIndex((f) => f.k === act);
    if (d !== "けす" && fields.length > 1 && i < fields.length - 1) setAct(fields[i + 1].k);
  };
  const empty = fields.some((f) => val[f.k] === "");
  return (
    <div className="g3-numans">
      <div className="g3-numans-row">
        {fields.map((f) => (
          <span key={f.k} className="g3-numans-field">{f.pre}
            <button className={"g3-box" + (act === f.k && !disabled ? " g3-box-on" : " g3-box-off") + (val[f.k] ? "" : " g3-box-empty")} disabled={disabled} onClick={() => { sfx.tap(); setAct(f.k); }}
              aria-label={(f.pre || "") + "の らん"} aria-pressed={act === f.k}>
              {val[f.k] || (act === f.k && !disabled ? "" : "？")}{act === f.k && !disabled && <span className="g3-caret" aria-hidden="true" />}
            </button>
            {f.post}</span>
        ))}
      </div>
      {!disabled && (
        <div className="dm-keys g3-keys g3-numans-keys">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", "けす", "0", "こたえる"].map((k) => (
            <button key={k} className={"dm-key" + (k === "こたえる" ? " dm-key-ok" : k === "けす" ? " dm-key-del" : "")} disabled={k === "こたえる" && empty}
              onClick={() => {
                if (k === "こたえる") { onSubmit(Object.fromEntries(fields.map((f) => [f.k, Number(val[f.k])])), () => { setVal(Object.fromEntries(fields.map((f) => [f.k, ""]))); setAct(fields[0].k); }); return; }
                press(k);
              }}>{k}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= わり算 =================
   問題文 → クッキー（くばるのは わからない ときの 手つだい）→ 数字キー。どちらが さきでも いい */
const DIV_TASKS = [
  { mode: "share", total: 12, plates: 3, line: "12こを 3さらに 同じ数ずつ。1さら 何こ？", fields: [{ k: "each", pre: "1さら", post: "こ" }] },
  { mode: "group", total: 12, per: 4, line: "12こを 1さらに 4こずつ。おさらは 何まい？", fields: [{ k: "groups", pre: "", post: "まい" }] },
  { mode: "share", total: 14, plates: 4, line: "14こを 4さらに 同じ数ずつ。あまりは？", fields: [{ k: "each", pre: "1さら", post: "こ" }, { k: "rest", pre: "あまり", post: "こ" }] },
];
const divAnswer = (t) => (t.mode === "group" ? { groups: Math.floor(t.total / t.per), rest: t.total % t.per } : { each: Math.floor(t.total / t.plates), rest: t.total % t.plates });
const divOkText = (t, r) => (t.mode === "group" ? <>{t.total} ÷ {t.per} ＝ {r.groups}。4こずつで {r.groups}さら分 だね。</>
  : r.rest ? <>{t.total} ÷ {t.plates} ＝ {r.each} あまり {r.rest}。あまりは わる数より 小さいよ。</> : <>{t.total} ÷ {t.plates} ＝ {r.each}。{t.plates} × {r.each} ＝ {t.total} で たしかめられるね。</>);

export function DivExplore({ sfx, onFinish, label }) {
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState(null);
  const t = DIV_TASKS[step], last = step === DIV_TASKS.length - 1, n = DIV_TASKS.length;
  const [ok, succeed, next, nextLabel] = useNext(sfx, () => { if (last) onFinish(); else { setStep((s) => s + 1); setMsg(null); } }, last);
  const want = divAnswer(t);
  const submit = (v, clear) => {
    if (t.fields.every((f) => v[f.k] === want[f.k])) { sfx.correct(); setMsg(null); succeed(divOkText(t, want)); return; }
    sfx.wrong(); clear(); setMsg("おしい！ クッキーを くばって たしかめよう");
  };
  return (
    <Task label={label} onNext={next} nextLabel={nextLabel} step={step} steps={n} line={t.line} ok={ok}>
      <CookieDeal key={"c" + step} total={t.total} plates={t.plates} per={t.per} mode={t.mode} sfx={sfx} frozen={!!ok} />
      {msg && !ok && <div className="g3-fig-msg g3-fig-msg-ng">{msg}</div>}
      <NumAnswer key={step} fields={t.fields} sfx={sfx} onSubmit={submit} disabled={!!ok} />
    </Task>
  );
}

/* ================= 小数（ジュースの泉の そそぐ 操作） =================
   問題文 → そそぐ（さいしょは お手本の 手が うごく）→ そそぎ おわったら こたえあわせ（何L？ は 3つから） */
const V = (id, type, amount, x, label) => ({ id, type, amount, x, label });
const DEC_TASKS = [
  { line: <>0.1Lますで くんで、右の ますを <b>0.3L</b>に しよう</>, into: "t", target: 300, demo: { id: "s", to: "c" },
    vessels: () => [V("s", "Ld", 1000, 58), V("c", "dld", 0, 172), V("t", "Ld", 0, 290)], pours: { s: ["c"], c: ["t", "s"], t: ["c"] },
    okText: <>0.1Lが 3こで 0.3L。0.1が 10こで 1L だよ。</> },
  { line: <>あ と い を まん中へ。あわせて 何L？</>, into: "t", all: ["a", "b"], demo: { id: "a", to: "t" },
    vessels: () => [V("a", "Ld", 400, 56, "あ"), V("t", "Ld", 0, 180), V("b", "Ld", 300, 304, "い")], pours: { a: ["t"], b: ["t"] },
    choices: ["0.6L", "0.7L", "0.8L"], ans: "0.7L", okText: <>0.4 ＋ 0.3 ＝ 0.7。0.1が 4こと 3こで 7こ だね。</> },
  { line: <>0.8Lから <b>0.3L</b> うつそう。のこりは 何L？</>, into: "t", target: 300, demo: { id: "s", to: "t" },
    vessels: () => [V("s", "Ld", 800, 100), V("t", "Ld", 0, 262)], pours: { s: ["t"], t: ["s"] },
    choices: ["0.4L", "0.5L", "0.6L"], ans: "0.5L", okText: <>0.8 − 0.3 ＝ 0.5。0.1が 8こから 3こ へって 5こ だね。</> },
];
const fmtL = (ml) => `${fmtDec(Math.round(ml / 100))}L`;
export function DecExplore({ sfx, onFinish, label }) {
  const [step, setStep] = useState(0);
  const t = DEC_TASKS[step], last = step === DEC_TASKS.length - 1, n = DEC_TASKS.length;
  const [vs, setVs] = useState(t.vessels);
  const [touched, setTouched] = useState(false);       // いちど さわったら お手本を けす
  const [poured, setPoured] = useState(false);         // そそぎ おわった（3つから えらぶ ばんに なる）
  const [over, setOver] = useState(false);
  const [tried, setTried] = useState([]);
  const [ok, succeed, next, nextLabel] = useNext(sfx, () => {
    if (last) { onFinish(); return; }
    const k = step + 1;
    setStep(k); setVs(DEC_TASKS[k].vessels()); setPoured(false); setOver(false); setTried([]); setTouched(false);
  }, last);
  const reset = () => { setVs(t.vessels()); setOver(false); setPoured(false); setTried([]); };
  const onPourEnd = (before, after0, from, to) => {
    // はなしたら 0.1L（100mL）に そろえる：そそいだ がわ・うけた がわ の 2つで ぜんたいの りょうは かえない
    const after = after0.map((v) => ({ ...v }));
    const tv = after.find((v) => v.id === to), fv = after.find((v) => v.id === from);
    const pair = Math.round(tv.amount + fv.amount);
    tv.amount = Math.min(TYPES[tv.type].cap, Math.round(tv.amount / 100) * 100);
    fv.amount = pair - tv.amount;
    if (fv.amount > TYPES[fv.type].cap || fv.amount < 0) { fv.amount = Math.max(0, Math.min(TYPES[fv.type].cap, Math.round(fv.amount / 100) * 100)); tv.amount = pair - fv.amount; }
    setVs(after);
    const tg = after.find((v) => v.id === t.into);
    let done = false;
    if (t.target != null) { done = isExact(tg.amount, t.target); setOver(!done && tg.amount > t.target + 0.5); }
    else done = t.all.every((id) => after.find((v) => v.id === id).amount < 0.5);
    if (!done) return;
    if (t.choices) { sfx.tap(); setPoured(true); }            // つぎは 何L？ を えらぶ
    else { sfx.correct(); succeed(t.okText); }
  };
  return (
    <Task label={label} onNext={next} nextLabel={nextLabel} step={step} steps={n} line={t.line} ok={ok}>
      <div className="g3-pour">
        <PourScene vessels={vs} pours={t.pours} interactive={!poured && !ok} onChange={setVs} onPourEnd={onPourEnd} onGrab={() => setTouched(true)} demo={touched ? null : t.demo} />
        {/* 何L？ を えらぶ ときは かさの 数を 出さない（こたえが 見えて しまうので。ますの 目もりで よむ） */}
        {!(t.choices && poured) && <div className="g3-pour-amounts">{vs.map((v) => <span key={v.id}>{v.label ? v.label + "：" : ""}<b>{fmtL(v.amount)}</b></span>)}</div>}
      </div>
      {over && <div className="g3-fig-msg g3-fig-msg-ng">多すぎたら、ぎゃくに そそいで もどそう</div>}
      {t.choices && poured && !ok && (
        <div className="g3-choices">
          {t.choices.map((c) => (
            <button key={c} className={"g3-choice" + (tried.includes(c) ? " g3-choice-tried" : "")} disabled={tried.includes(c)}
              onClick={() => { if (c === t.ans) { sfx.correct(); succeed(t.okText); } else { sfx.wrong(); setTried([...tried, c]); } }}>{c}</button>
          ))}
        </div>
      )}
      {!poured && !ok && <div className="g3-fig-acts"><button className="ts-act" onClick={() => { sfx.tap(); reset(); }}>さいしょから</button></div>}
    </Task>
  );
}

/* ================= 分数（ケーキ・ピザ） =================
   ケーキ・ピザには はじめから 切れめが ある。言われた 分数に なるように ぬったら こたえあわせ
   せいかいの 声かけで「4つに 分けた うちの 3つぶん」と いみを かえす
   大きさくらべ：1/2 と 1/4（ちがう）、2/4 と 1/2（おなじ） */
const FRAC_TASKS = [
  { kind: "cake", d: 4, n: 3 },
  { kind: "pizza", d: 3, n: 2 },
  { kind: "cake", d: 4, n: 2 },
  { compare: [[1, 2], [1, 4]], ans: 0 },
  { compare: [[2, 4], [1, 2]], ans: "same" },
  { kind: "pizza", d: 5, n: 2, add: 1 },
];
const range = (k) => new Set(Array.from({ length: k }, (_, i) => i));
export function FracExplore({ sfx, onFinish, label }) {
  const [step, setStep] = useState(0);
  const [painted, setPainted] = useState(new Set());
  const [part2, setPart2] = useState(false);           // たしざん：「あと 1まい」
  const [picked, setPicked] = useState(null);
  const t = FRAC_TASKS[step], last = step === FRAC_TASKS.length - 1, n = FRAC_TASKS.length;
  const [ok, succeed, next, nextLabel] = useNext(sfx, () => { if (last) { onFinish(); return; } setStep((s) => s + 1); setPainted(new Set()); setPart2(false); setPicked(null); }, last);
  const [mid, setMid] = useState(false);               // たしざん：2/5 が できた（「つぎへ →」で「あと 1まい」へ）

  if (t.compare) {
    const [[n0, d0], [n1, d1]] = t.compare;
    const pick = (v) => {
      if (ok) return;
      setPicked(v);
      if (v !== t.ans) { sfx.wrong(); return; }
      sfx.correct();
      succeed(t.ans === "same" ? <><Frac n={n0} d={d0} /> と <Frac n={n1} d={d1} /> は おなじ 大きさ だね。</> : <>分ける 数が 多いほど、1つ分は 小さく なるね。</>);
    };
    return (
      <Task label={label} onNext={next} nextLabel={nextLabel} step={step} steps={n} ok={ok} line={<><Frac n={n0} d={d0} /> と <Frac n={n1} d={d1} />、大きいのは どっち？</>}>
        <div className="g3-compare">
          {t.compare.map(([nn, d], i) => (
            <button key={i} className={"g3-compare-btn" + (picked === i ? (i === t.ans ? " g3-ok" : " g3-ng") : "")} onClick={() => pick(i)}>
              <FracShape d={d} painted={range(nn)} size={120} />
              <Frac n={nn} d={d} big />
            </button>
          ))}
        </div>
        <button className={"g3-same-btn" + (picked === "same" ? (t.ans === "same" ? " g3-ok" : " g3-ng") : "")} onClick={() => pick("same")}>おなじ 大きさ</button>
        {picked != null && picked !== t.ans && <div className="g3-fig-msg g3-fig-msg-ng">ぬった ところの 広さを くらべてみよう</div>}
      </Task>
    );
  }

  const need = part2 ? t.n + t.add : t.n;
  const tapSlice = (i) => {
    if (ok || mid) return;
    if (part2 && i < t.n) return;                          // さいしょに ぬった ところは そのまま
    sfx.tap();
    const p = new Set(painted);
    if (p.has(i)) p.delete(i); else p.add(i);
    setPainted(p);
    if (p.size !== need) return;
    sfx.correct();
    if (t.add && !part2) { setMid(true); return; }   // 2/5 できた →「つぎへ →」で「あと 1まい」
    succeed(t.add ? <><Frac n={t.n} d={t.d} /> ＋ <Frac n={t.add} d={t.d} /> ＝ <Frac n={need} d={t.d} />。分母は かわらないよ。</>
      : <>{t.d}つに 分けた うちの {t.n}つぶん だね。</>);
  };
  const first = part2 ? new Set([...painted].filter((i) => i < t.n)) : painted;
  const extra = part2 ? new Set([...painted].filter((i) => i >= t.n)) : new Set();
  const line = part2 ? <>あと <Frac n={t.add} d={t.d} /> ぬると、どう なる？</> : <><Frac n={t.n} d={t.d} /> に なるように ぬろう</>;
  const midOk = mid && !part2 ? <>{t.d}つに 分けた うちの {t.n}つぶん だね。</> : null;
  return (
    <Task label={label} step={step} steps={n} line={line} ok={ok || midOk}
      onNext={midOk ? () => { sfx.tap(); setMid(false); setPart2(true); } : next} nextLabel={midOk ? "つぎへ →" : nextLabel}>
      <div className="g3-frac-stage">
        <FracShape d={t.d} kind={t.kind} painted={first} extra={extra} onTap={tapSlice} size={230} />
        <div className="g3-count">ぬった 数 <b>{painted.size}</b> / {t.d}</div>
        {painted.size > need && <div className="g3-fig-msg g3-fig-msg-ng">ぬりすぎたら、もういちど タップで けせるよ</div>}
      </div>
    </Task>
  );
}
