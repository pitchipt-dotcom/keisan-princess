/* =====================================================================
   つみきの森 — マス目を ななめ上から 見た 3D（Three.js）
   この ファイルは 妖精の国に 入った ときだけ 読みこまれる（App から React.lazy）
   - block が かわった とき roll（{ id, dir }）が あたらしければ、へりを じくに 90° ころがす
     roll が 同じ（リセットなど）なら その ばしょへ すぐ おく
   - stamps：[{ no, cells:[[x,y]] }] … 紙に ついた マス（ばんごうと 色は 2Dと 同じ）
   - pattern：[key] … だんかい3の「できあがった もよう」（うすい 色で 見せる）
   - スワイプで ころがす むきを えらべる（上＝おく）
   ===================================================================== */
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { footprint, stampColor, NUM, unkey } from "./tsumiki.js";

const ROLL_MS = 300;
const INK = "#3A2A6B";

function canvasTex(draw, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

const texCache = new Map();
function stampTex(no) {
  const k = "s" + no;
  if (!texCache.has(k)) texCache.set(k, canvasTex((g, s) => {
    g.fillStyle = stampColor(no); roundRect(g, 4, 4, s - 8, s - 8, 18); g.fill();
    g.fillStyle = INK; g.font = "900 78px 'Zen Maru Gothic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(NUM(no), s / 2, s / 2 + 4);
  }));
  return texCache.get(k);
}
function patternTex() {
  if (!texCache.has("p")) texCache.set("p", canvasTex((g, s) => {
    g.fillStyle = "rgba(201,168,240,.45)"; roundRect(g, 6, 6, s - 12, s - 12, 16); g.fill();
    g.setLineDash([12, 9]); g.lineWidth = 6; g.strokeStyle = "#9B7BD0"; roundRect(g, 8, 8, s - 16, s - 16, 16); g.stroke();
  }));
  return texCache.get("p");
}
function faceTex(star) {
  return canvasTex((g, s) => {
    g.fillStyle = "#FFF1D2"; g.fillRect(0, 0, s, s);
    g.strokeStyle = "#E5C38A"; g.lineWidth = 8; roundRect(g, 8, 8, s - 16, s - 16, 14); g.stroke();
    if (star) {
      g.fillStyle = "#FF8FC4"; g.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 40, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(s / 2 + r * Math.cos(a), s / 2 + r * Math.sin(a)); }
      g.closePath(); g.fill();
    }
  });
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function Tsumiki3D({ n, block, roll, stamps, pattern, onRollEnd, onSwipe, onFail, label }) {
  const wrapRef = useRef(null);
  const S = useRef(null);                 // three の もの（scene, camera, renderer, cube…）
  const lastRoll = useRef(roll ? roll.id : null);
  const cb = useRef({});
  cb.current = { onRollEnd, onSwipe };

  const cellPos = (x, y) => [x - n / 2 + 0.5, y - n / 2 + 0.5];

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
    camera.position.set(0, n * 1.5, n * 1.36);
    camera.lookAt(0, 0, 0.22);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2.5, 6, 4); scene.add(sun);

    // 台と マス目
    const base = new THREE.Mesh(new THREE.BoxGeometry(n + 0.3, 0.24, n + 0.3), new THREE.MeshLambertMaterial({ color: 0xe9ddf7 }));
    base.position.y = -0.12; scene.add(base);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(n, n), new THREE.MeshLambertMaterial({ color: 0xfffdf7 }));
    paper.rotation.x = -Math.PI / 2; paper.position.y = 0.002; scene.add(paper);
    const pts = [];
    for (let i = 0; i <= n; i++) { const v = i - n / 2; pts.push(v, 0.01, -n / 2, v, 0.01, n / 2, -n / 2, 0.01, v, n / 2, 0.01, v); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xc9b3e6 })));

    const marks = new THREE.Group(); scene.add(marks);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: 0x3a2a6b, transparent: true, opacity: 0.16, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; scene.add(shadow);

    const faces = [faceTex(false), faceTex(false), faceTex(true), faceTex(false), faceTex(false), faceTex(false)];
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.94), faces.map((t) => new THREE.MeshLambertMaterial({ map: t })));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0xc89a5a }));
    cube.add(edges);
    scene.add(cube);

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      // せまい ときも 盤が ぜんぶ 入るように 少し はなれる
      const k = Math.max(1, 1.1 / camera.aspect);
      camera.position.set(0, n * 1.5 * k, n * 1.36 * k); camera.lookAt(0, 0, 0.22);
      camera.updateProjectionMatrix(); render();
    };
    const ro = new ResizeObserver(resize); ro.observe(wrap);
    S.current = { renderer, scene, camera, cube, shadow, marks, render, anim: null };
    resize();
    return () => {
      ro.disconnect();
      if (S.current && S.current.anim) cancelAnimationFrame(S.current.anim);
      renderer.dispose();
      faces.forEach((t) => t.dispose());
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      S.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  /* ---- 紙に ついた マス・もよう ---- */
  useEffect(() => {
    const s = S.current; if (!s) return;
    for (const m of [...s.marks.children]) { s.marks.remove(m); m.geometry.dispose(); m.material.dispose(); }
    const add = (x, y, tex, lift) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      const [wx, wz] = cellPos(x, y); m.rotation.x = -Math.PI / 2; m.position.set(wx, 0.006 + lift, wz); s.marks.add(m);
    };
    for (const k of pattern || []) { const [x, y] = unkey(k); add(x, y, patternTex(), 0); }
    (stamps || []).forEach((st, i) => st.cells.forEach(([x, y]) => add(x, y, stampTex(st.no), 0.001 + i * 0.0004)));
    s.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamps, pattern]);

  /* ---- つみきを おく／ころがす ---- */
  useEffect(() => {
    const s = S.current; if (!s) return;
    const [[x, y]] = footprint(block);
    const [wx, wz] = cellPos(x, y);
    const place = () => { s.cube.position.set(wx, 0.47, wz); s.shadow.position.set(wx, 0.02, wz); s.render(); };
    if (!roll || roll.id === lastRoll.current) {
      if (!roll) s.cube.quaternion.identity();
      if (s.anim) { cancelAnimationFrame(s.anim); s.anim = null; }
      place(); lastRoll.current = roll ? roll.id : null; return;
    }
    lastRoll.current = roll.id;
    if (s.anim) cancelAnimationFrame(s.anim);
    const dx = roll.dir === "migi" ? 1 : roll.dir === "hidari" ? -1 : 0;
    const dz = roll.dir === "temae" ? 1 : roll.dir === "oku" ? -1 : 0;
    const fx = wx - dx, fz = wz - dz;                        // ころがる まえの ばしょ
    s.cube.position.set(fx, 0.47, fz);
    const pivot = new THREE.Object3D(); pivot.position.set(fx + dx * 0.47, 0, fz + dz * 0.47); s.scene.add(pivot);
    pivot.attach(s.cube);
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ROLL_MS), e = ease(t);
      if (dx) pivot.rotation.z = -dx * e * Math.PI / 2; else pivot.rotation.x = dz * e * Math.PI / 2;
      s.shadow.position.set(fx + dx * e, 0.02, fz + dz * e);
      s.render();
      if (t < 1) { s.anim = requestAnimationFrame(step); return; }
      s.scene.attach(s.cube); s.scene.remove(pivot);
      // 小さな ずれを なくす（向きは 90° きざみ）
      const m = new THREE.Matrix4().makeRotationFromQuaternion(s.cube.quaternion);
      m.elements = m.elements.map((v) => Math.round(v));
      s.cube.quaternion.setFromRotationMatrix(m);
      s.anim = null; place();
      cb.current.onRollEnd && cb.current.onRollEnd();
    };
    s.anim = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, roll && roll.id]);

  /* ---- スワイプ ---- */
  const down = useRef(null);
  const onDown = (e) => { down.current = [e.clientX, e.clientY]; };
  const onUp = (e) => {
    if (!down.current || !cb.current.onSwipe) return;
    const ddx = e.clientX - down.current[0], ddy = e.clientY - down.current[1];
    down.current = null;
    if (Math.max(Math.abs(ddx), Math.abs(ddy)) < 24) return;
    cb.current.onSwipe(Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? "migi" : "hidari") : (ddy > 0 ? "temae" : "oku"));
  };

  return (
    <div className="ts-3d" ref={wrapRef} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { down.current = null; }}
      role="img" aria-label={label || "つみきと マス目（ななめ上から）"} />
  );
}
