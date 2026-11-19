/* =====================================================================
   つみきの森 — 盤を ななめ上から 見た 3D（Three.js）
   この ファイルは 妖精の国に 入った ときだけ 読みこまれる（App から React.lazy）
   - board：{ w, h, cells } … 盤の 形（L字・T字・すき間の ある 形も）。盤の マスだけ 台を おく
   - block が かわった とき roll（{ id, dir }）が あたらしければ、from から へりを じくに 90° ころがす
     roll が 同じ（リセットなど）なら その ばしょへ すぐ おく
   - 立方体（さいころ）と 直方体（2こ つなげた つみき。たっている／ねている）
   - stamps：[{ no, cells:[[x,y]] }] … 紙に ついた マス（ばんごうと 色は 2Dと 同じ）
   - pattern：[key] … だんかい3の「ぬる マス」（点線）
   - startTag：つみきの 上に「スタート」の ふだを 出す
   ===================================================================== */
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { footprint, stampColor, NUM, unkey } from "./tsumiki.js";

const ROLL_MS = 300;
const INK = "#3A2A6B";
const S1 = 0.94;              // つみき 1こ ぶんの 大きさ（すこし すきまを あける）

function canvasTex(draw, w = 128, h = w) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

const texCache = new Map();
const cached = (k, make) => { if (!texCache.has(k)) texCache.set(k, make()); return texCache.get(k); };
const stampTex = (no) => cached("s" + no, () => canvasTex((g, s) => {
  g.fillStyle = stampColor(no); roundRect(g, 4, 4, s - 8, s - 8, 18); g.fill();
  g.fillStyle = INK; g.font = "900 78px 'Zen Maru Gothic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(NUM(no), s / 2, s / 2 + 4);
}));
const patternTex = () => cached("p", () => canvasTex((g, s) => {
  g.fillStyle = "rgba(201,168,240,.45)"; roundRect(g, 6, 6, s - 12, s - 12, 16); g.fill();
  g.setLineDash([12, 9]); g.lineWidth = 6; g.strokeStyle = "#9B7BD0"; roundRect(g, 8, 8, s - 16, s - 16, 16); g.stroke();
}));
const shadowTex = () => cached("sh", () => canvasTex((g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, "rgba(58,42,107,.24)"); gr.addColorStop(0.75, "rgba(58,42,107,.16)"); gr.addColorStop(1, "rgba(58,42,107,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
}));
const startTex = () => cached("st", () => canvasTex((g, w, h) => {
  g.fillStyle = "#E85FA3"; roundRect(g, 4, 4, w - 8, h - 8, 34); g.fill();
  g.fillStyle = "#fff"; g.font = "900 56px 'Zen Maru Gothic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("スタート", w / 2, h / 2 + 3);
}, 256, 96));
// つみきの 面（tall：2こ つなげた ながい 面。まん中に つなぎめの 線）
function faceTex(star, tall) {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#FFF1D2"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#E5C38A"; g.lineWidth = 8;
    if (tall) { roundRect(g, 8, 8, w - 16, h / 2 - 12, 14); g.stroke(); roundRect(g, 8, h / 2 + 4, w - 16, h / 2 - 12, 14); g.stroke(); }
    else { roundRect(g, 8, 8, w - 16, h - 16, 14); g.stroke(); }
    if (star) {
      g.fillStyle = "#FF8FC4"; g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 40, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(w / 2 + r * Math.cos(a), h / 2 + r * Math.sin(a)); }
      g.closePath(); g.fill();
    }
  }, 128, tall ? 256 : 128);
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* つみきの むき（ころがして いない ときの きほん）：たっている＝そのまま、ねている＝よこに たおす */
function poseQuat(b) {
  const q = new THREE.Quaternion();
  if (b.kind === "cuboid" && b.pose === "lieX") q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
  if (b.kind === "cuboid" && b.pose === "lieY") q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  return q;
}

export default function Tsumiki3D({ board, block, from, roll, stamps, pattern, startTag, onRollEnd, onFail, label }) {
  const wrapRef = useRef(null);
  const S = useRef(null);                 // three の もの（scene, camera, renderer, block…）
  const lastRoll = useRef(roll ? roll.id : null);
  const cb = useRef({});
  cb.current = { onRollEnd };
  const boardKey = `${board.w}x${board.h}:${board.cells.join(";")}`;

  /* 盤の マス → せかいの ざひょう（盤の まん中が 0） */
  const cellPos = (x, y) => [x - board.w / 2 + 0.5, y - board.h / 2 + 0.5];
  const center = (b) => {
    const fp = footprint(b), xs = fp.map((c) => c[0]), ys = fp.map((c) => c[1]);
    const [wx, wz] = cellPos((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
    return { x: wx, y: b.kind === "cuboid" && b.pose === "stand" ? 0.97 : 0.47, z: wz, ex: Math.max(...xs) - Math.min(...xs) + 1, ez: Math.max(...ys) - Math.min(...ys) + 1 };
  };

  /* ---- はじめに 1かいだけ：シーンを つくる ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) { onFail && onFail(); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2.5, 6, 4); scene.add(sun);
    const boardG = new THREE.Group(); scene.add(boardG);
    const marks = new THREE.Group(); scene.add(marks);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: startTex(), depthTest: false }));
    tag.scale.set(1.25, 0.47, 1); tag.renderOrder = 10; tag.visible = false; scene.add(tag);

    const render = () => renderer.render(scene, camera);
    const s = { renderer, scene, camera, boardG, marks, shadow, tag, render, anim: null, mesh: null, meshKind: null, dims: { w: 5, h: 5 } };
    s.fit = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      // 盤の 大きい ほうに あわせる。せまい ときも 盤が ぜんぶ 入るように 少し はなれる
      // （小さい 盤でも 近づきすぎない。おくの 列に たった 直方体も 入るように たてに すこし よゆう）
      const tall = s.meshKind === "cuboid";
      const n = Math.max(s.dims.w, s.dims.h + (tall ? 1 : 0.6), 4.4);
      const k = Math.max(1, 1.1 / camera.aspect);
      // 直方体は たつと 2マスぶん 高いので、見る 中心を すこし おくへ（上に よゆう）
      const lz = tall ? -0.25 : 0.1;
      camera.position.set(0, n * 1.5 * k, n * 1.36 * k + lz); camera.lookAt(0, 0, lz);
      camera.updateProjectionMatrix(); render();
    };
    const ro = new ResizeObserver(() => s.fit()); ro.observe(wrap);
    S.current = s;
    return () => {
      ro.disconnect();
      if (s.anim) cancelAnimationFrame(s.anim);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map && ![...texCache.values()].includes(m.map)) m.map.dispose(); m.dispose(); }); });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      S.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- 盤（形が かわった とき） ---- */
  useEffect(() => {
    const s = S.current; if (!s) return;
    for (const m of [...s.boardG.children]) { s.boardG.remove(m); m.geometry.dispose(); m.material.dispose(); }
    s.dims = { w: board.w, h: board.h };
    const baseGeo = new THREE.BoxGeometry(1, 0.24, 1), baseMat = new THREE.MeshLambertMaterial({ color: 0xe9ddf7 });
    const paperGeo = new THREE.PlaneGeometry(0.97, 0.97), paperMat = new THREE.MeshLambertMaterial({ color: 0xfffdf7 });
    const pts = [];
    for (const k of board.cells) {
      const [x, y] = unkey(k), [wx, wz] = cellPos(x, y);
      const base = new THREE.Mesh(baseGeo, baseMat); base.position.set(wx, -0.12, wz); s.boardG.add(base);
      const paper = new THREE.Mesh(paperGeo, paperMat); paper.rotation.x = -Math.PI / 2; paper.position.set(wx, 0.002, wz); s.boardG.add(paper);
      const a = wx - 0.5, b = wx + 0.5, c = wz - 0.5, d = wz + 0.5, yy = 0.01;
      pts.push(a, yy, c, b, yy, c, b, yy, c, b, yy, d, b, yy, d, a, yy, d, a, yy, d, a, yy, c);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    s.boardG.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xc9b3e6 })));
    s.fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);

  /* ---- つみきの 形（立方体 ／ 直方体） ---- */
  useEffect(() => {
    const s = S.current; if (!s || s.meshKind === block.kind) return;
    if (s.mesh) { s.scene.remove(s.mesh); s.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }); }
    const tall = block.kind === "cuboid";
    const geo = new THREE.BoxGeometry(S1, tall ? S1 * 2 + 0.06 : S1, S1);
    // 面の じゅん：+x, −x, +y（★）, −y, +z, −z
    const faces = [faceTex(false, tall), faceTex(false, tall), faceTex(true, false), faceTex(false, false), faceTex(false, tall), faceTex(false, tall)];
    const mesh = new THREE.Mesh(geo, faces.map((t) => new THREE.MeshLambertMaterial({ map: t })));
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xc89a5a })));
    mesh.quaternion.copy(poseQuat(block));
    s.scene.add(mesh); s.mesh = mesh; s.meshKind = block.kind; s.fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.kind]);

  /* ---- 紙に ついた マス・ぬる マス・スタートの ふだ ---- */
  useEffect(() => {
    const s = S.current; if (!s) return;
    for (const m of [...s.marks.children]) { s.marks.remove(m); m.geometry.dispose(); m.material.dispose(); }
    const add = (x, y, tex, lift) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      const [wx, wz] = cellPos(x, y); m.rotation.x = -Math.PI / 2; m.position.set(wx, 0.006 + lift, wz); s.marks.add(m);
    };
    for (const k of pattern || []) { const [x, y] = unkey(k); add(x, y, patternTex(), 0); }
    (stamps || []).forEach((st, i) => st.cells.forEach(([x, y]) => add(x, y, stampTex(st.no), 0.001 + i * 0.0004)));
    if (startTag) { const c = center(startTag); s.tag.position.set(c.x, c.y * 2 + 0.3, c.z); s.tag.visible = true; } else s.tag.visible = false;
    s.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamps, pattern, startTag, boardKey]);

  /* ---- つみきを おく／ころがす ---- */
  useEffect(() => {
    const s = S.current; if (!s || !s.mesh) return;
    const to = center(block);
    const place = () => {
      s.mesh.position.set(to.x, to.y, to.z);
      s.shadow.position.set(to.x, 0.02, to.z); s.shadow.scale.set(to.ex * 1.25, to.ez * 1.25, 1);
      s.render();
    };
    if (!roll || roll.id === lastRoll.current || !from) {
      if (s.anim) { cancelAnimationFrame(s.anim); s.anim = null; }
      if (!roll || roll.id !== lastRoll.current) s.mesh.quaternion.copy(poseQuat(block));
      place(); lastRoll.current = roll ? roll.id : null; return;
    }
    lastRoll.current = roll.id;
    if (s.anim) cancelAnimationFrame(s.anim);
    const dx = roll.dir === "migi" ? 1 : roll.dir === "hidari" ? -1 : 0;
    const dz = roll.dir === "temae" ? 1 : roll.dir === "oku" ? -1 : 0;
    const fc = center(from);                                  // ころがる まえの ばしょ
    s.mesh.position.set(fc.x, fc.y, fc.z);
    // じく：ころがる むきの へり（ゆかの 高さ）
    const half = (dx ? fc.ex : fc.ez) * 0.5 - 0.03;
    const pivot = new THREE.Object3D(); pivot.position.set(fc.x + dx * half, 0, fc.z + dz * half); s.scene.add(pivot);
    pivot.attach(s.mesh);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ROLL_MS), e = ease(t);
      if (dx) pivot.rotation.z = -dx * e * Math.PI / 2; else pivot.rotation.x = dz * e * Math.PI / 2;
      s.shadow.position.set(fc.x + (to.x - fc.x) * e, 0.02, fc.z + (to.z - fc.z) * e);
      s.render();
      if (t < 1) { s.anim = requestAnimationFrame(step); return; }
      s.scene.attach(s.mesh); s.scene.remove(pivot);
      // 小さな ずれを なくす（向きは 90° きざみ）
      const m = new THREE.Matrix4().makeRotationFromQuaternion(s.mesh.quaternion);
      m.elements = m.elements.map((v) => Math.round(v));
      s.mesh.quaternion.setFromRotationMatrix(m);
      s.anim = null; place();
      cb.current.onRollEnd && cb.current.onRollEnd();
    };
    s.anim = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, roll && roll.id, boardKey]);

  return <div className="ts-3d" ref={wrapRef} role="img" aria-label={label || "つみきと 盤（ななめ上から）"} />;
}
