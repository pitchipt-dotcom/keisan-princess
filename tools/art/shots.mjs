// 画面の確認用。3 キャラの タイトル・図かん・コーデ・遊ぶ画面(idle / oops / happy)を撮る。
//   npm run build && npx vite preview --port 4179 &
//   node tools/art/shots.mjs http://localhost:4179/ art-raw/_shots
// Chrome(/usr/bin/google-chrome)を 別プロファイルの headless で起動する。Node 22 以上。
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const [base, out] = process.argv.slice(2);
if (!base || !out) { console.error("usage: node shots.mjs <baseUrl> <outDir>"); process.exit(2); }
mkdirSync(out, { recursive: true });
const port = 9377;
const profile = mkdtempSync(tmpdir() + "/kp-chrome-");
const chrome = spawn("/usr/bin/google-chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--window-size=420,900", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 40 && !target; i++) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
  if (!target) await sleep(250);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, "base64"));
};
const click = (text) => evalJs(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b)return 'missing: '+${JSON.stringify(text)};b.click();return 'ok'})()`);
const open = async () => { await send("Page.navigate", { url: base }); await sleep(1800); };
const startPlay = async () => {
  await open();
  await click("あそぶ"); await sleep(800);
  await evalJs("document.querySelector('.kk-gametype-card').click()"); await sleep(1200);
};
const stage = () => evalJs("(()=>{const e=document.querySelector('.kk-witch-stage');if(!e)return 'no-stage';const i=e.querySelector('img');return i?i.src.split('/').pop():'svg'})()");
const counts = () => evalJs("JSON.stringify({img:document.querySelectorAll('img').length,broken:[...document.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).length})");

await send("Emulation.setDeviceMetricsOverride", { width: 420, height: 900, deviceScaleFactor: 2, mobile: true });

const ITEMS = {
  witch: ["ribbon", "starpin", "minihat", "tiara", "dress", "cape", "socks", "boots", "wand", "candy", "flower", "crystal", "necklace", "moon", "cat", "wings"],
  mermaid: ["m_shellclip", "m_pearlband", "m_starfishpin", "m_coralcrown", "m_scaledress", "m_pearlcape", "m_finanklet", "m_pearlanklet", "m_trident", "m_seacandy", "m_pearl", "m_shellbag", "m_pearlnecklace", "m_moonshell", "m_dolphin", "m_bubblewings"],
  princess: ["p_hairribbon", "p_pearlpin", "p_flowercrown", "p_tiara", "p_balldress", "p_cape", "p_lacesocks", "p_glassshoes", "p_wand", "p_candy", "p_rose", "p_mirror", "p_necklace", "p_moon", "p_kitten", "p_angelwings"],
};
const EQUIP = {
  witch: { head: "tiara", outfit: "dress", feet: "boots", hold: "wand", acc: "cat" },
  mermaid: { head: "m_coralcrown", outfit: "m_scaledress", feet: "m_finanklet", hold: "m_trident", acc: "m_dolphin" },
  princess: { head: "p_tiara", outfit: "p_balldress", feet: "p_glassshoes", hold: "p_wand", acc: "p_kitten" },
};
const chars = Object.keys(ITEMS);

for (const ch of chars) {
  // 図かんは 14 点だけ持っている状態にして、シルエットも見る
  const collection = Object.fromEntries(chars.map((c) => [c, Object.fromEntries(ITEMS[c].slice(0, 13).concat(Object.values(EQUIP[c])).map((i) => [i, 1]))]));
  const save = { stardust: 10, collection, mastery: {}, stats: { correct: 0, total: 0, best: 0, shines: 0 }, sound: false,
    equipped: EQUIP, character: ch, seenMilestones: Object.fromEntries(chars.map((c) => [c, ["castle", "ball", "villain", "complete"]])) };
  await open();
  await evalJs(`localStorage.setItem("kukumajo:save:v1", ${JSON.stringify(JSON.stringify(save))})`);
  await open();
  await shot(`${ch}-1-title`);
  console.log(ch, "図かん", await click("コレクションを 見る")); await sleep(1000);
  await shot(`${ch}-2-zukan`);
  console.log(ch, "コーデ", await click("コーデを する")); await sleep(1200);
  await shot(`${ch}-3-code`);
  console.log(ch, "imgs", await counts());

  // 遊ぶ画面: こたえを順に押して、idle → oops / happy の切りかわりを見る
  await startPlay();
  console.log(ch, "play idle", await stage());
  await shot(`${ch}-4-play-idle`);
  const seen = new Set();
  for (let n = 0; n < 8 && seen.size < 2; n++) {
    const count = await evalJs("document.querySelectorAll('.kk-opt').length");
    if (!count) { await startPlay(); continue; }
    await evalJs(`document.querySelectorAll('.kk-opt')[${n % count}].click()`); await sleep(900);
    const now = await stage();
    const mood = /happy/.test(now) ? "happy" : /oops/.test(now) ? "oops" : "other:" + now;
    if (!seen.has(mood)) { seen.add(mood); console.log(ch, "play", mood, now); await shot(`${ch}-5-play-${mood.split(":")[0]}`); }
    if (mood === "happy") await startPlay();
    else { await click("もう いちど"); await sleep(700); }
  }
}
ws.close();
chrome.kill();
