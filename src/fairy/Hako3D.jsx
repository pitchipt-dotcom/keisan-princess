/* =====================================================================
   はこの工房 — はこ・展開図の 3D（Three.js。つみきの森と 同じ 見せ方）
   mode="box"：とじた はこ。面・辺・頂点を タップ（色が つく／ひご／ねんど玉）、辺を タップで 切る
   mode="net"：展開図。面ごとに ちょうつがい（親との さかいの 辺）で おれる。angles：{ cellId: 0〜90 }
     面を つまんで うごかすと onFaceDrag（ひらく・おる）、タップで onTap({ type:"cell" })
   どちらも、何も ない ところを ドラッグすると はこが まわる（見る 向きが かわる）
   面の 色と マーク（styles）は はこの 面に ついた まま。ひらいても くみたてても おなじ
   glow：{ type:"face"|"edge"|"vertex", id } … 1つだけ 金色に 光らせる（あそびかた・ことばの 見本）
     onGlowPos({ x, y }) … 光って いる ものの 画面の いち（わくの 中の %）。指の アイコンを あわせる
   onTurn(px) … 何も ない ところを ドラッグして まわした とき（うごいた ながさ）
   ===================================================================== */
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { edges as boxEdges, vertices as boxVertices, faceInfo, hingeOf, FACES } from "./hako.js";

const INK = "#3A2A6B";
const PAPER = "#FFF6E3";
const texCache = new Map();
function faceTex(style, w, h) {
  const k = `${style.color}|${style.mark || ""}|${style.hl || ""}|${w}x${h}`;
  if (texCache.has(k)) return texCache.get(k);
  const S = 128, c = document.createElement("canvas");
  c.width = Math.round(S * w); c.height = Math.round(S * h);
  const g = c.getContext("2d");
  g.fillStyle = style.color || PAPER; g.fillRect(0, 0, c.width, c.height);
  const hl = { pick: "#E85FA3", ok: "#2FAF8E", bad: "#E0443E", mark: "#F2B400" }[style.hl];
  g.lineWidth = hl ? 14 : 6; g.strokeStyle = hl || "#D9B98A"; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, c.width - g.lineWidth, c.height - g.lineWidth);
  if (style.mark) {
    g.fillStyle = style.markColor || INK; g.font = `900 ${Math.round(S * 0.55)}px 'Zen Maru Gothic', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(style.mark, c.width / 2, c.height / 2 + 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(k, t);
  return t;
}
const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);
function stick(a, b, r, color, opts = {}) {      // 2点を むすぶ ぼう（辺・ひご）
  const A = v3(a), B = v3(b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), new THREE.MeshLambertMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 }));
  m.position.copy(A.clone().add(B).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
/* はこの 面の 向き（plane は +z を むく） */
const FACE_ROT = { U: [-Math.PI / 2, 0], D: [Math.PI / 2, 0], E: [0, Math.PI / 2], W: [0, -Math.PI / 2], S: [0, 0], N: [0, Math.PI] };

export default function Hako3D({ mode, dims, layout, angles, styles = {}, wire = false, edgesOn, verticesOn, cuts = [], tappable = {}, onTap, onFaceDrag, spin = 0, openness = null, height = 270, onFail, glow = null, onGlowPos, onTurn }) {
  const wrapRef = useRef(null);
  const S = useRef(null);
  const cb = useRef({}); cb.current = { onTap, onFaceDrag, tappable, onGlowPos, onTurn };

  /* ---- はじめに 1かい：レンダラー ---- */
  useEffect(() => {
    const wrap = wrapRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { onFail && onFail(); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(2.5, 6, 4); scene.add(sun);
    const table = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshLambertMaterial({ color: 0xf3ead8 }));
    table.rotation.x = -Math.PI / 2;
    const pivot = new THREE.Group(); scene.add(pivot); pivot.add(table);      // 台は 展開図の 下に ついて うごく
    const s = { renderer, scene, camera, pivot, table, content: null, nodes: {}, yaw: -0.55, pitch: 0.0, fitSize: 2, spinUntil: 0, raf: 0 };
    s.render = () => {
      pivot.rotation.set(s.pitch, s.yaw, 0, "YXZ"); renderer.render(scene, camera);
      // 光って いる ものの 画面の いち（かわった ときだけ しらせる）
      if (s.glowObj && cb.current.onGlowPos) {
        scene.updateMatrixWorld(true);
        const wp = new THREE.Vector3(); s.glowObj.getWorldPosition(wp); const sp = wp.project(camera);
        const pos = { x: Math.round((sp.x + 1) * 50), y: Math.round((1 - sp.y) * 50) }, k = pos.x + "," + pos.y;
        if (k !== s.glowPosKey) { s.glowPosKey = k; cb.current.onGlowPos(pos); }
      }
    };
    s.fit = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
      camera.aspect = w / h;
      const k = Math.max(1, 1.15 / camera.aspect) * s.fitSize;
      camera.position.set(0, 1.55 * k, 2.15 * k); camera.lookAt(0, 0.15 * s.fitSize, 0);
      camera.updateProjectionMatrix(); s.render();
    };
    const ro = new ResizeObserver(() => s.fit()); ro.observe(wrap);
    S.current = s; s.fit();
    return () => {
      ro.disconnect(); cancelAnimationFrame(s.raf);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
      renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      S.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- 中身を つくる ---- */
  const styleKey = JSON.stringify(styles);
  const layoutKey = layout ? layout.cells.map((c) => c.id + c.face + c.rect.join(",")).join("|") : "";
  const glowKey = glow ? glow.type + ":" + glow.id : "";
  const onKey = [glowKey, wire, edgesOn ? [...edgesOn].sort().join() : "", verticesOn ? [...verticesOn].sort().join() : "", cuts.slice().sort().join(), JSON.stringify(tappable)].join("/");
  useEffect(() => {
    const s = S.current; if (!s) return;
    if (s.content) { s.pivot.remove(s.content); s.content.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); }); }
    const content = new THREE.Group(); s.content = content; s.nodes = {}; s.pivot.add(content);
    const hits = [];
    s.glowObj = null;
    if (mode === "box") {
      const faces = new THREE.Group(); content.add(faces);
      for (const f of FACES) {
        const fi = faceInfo(dims, f), st = styles[f] || {};
        const [rw, rh] = f === "U" || f === "D" ? [dims.w, dims.d] : f === "E" || f === "W" ? [dims.d, dims.h] : [dims.w, dims.h];
        const mat = wire ? new THREE.MeshLambertMaterial({ color: st.color || 0xffffff, transparent: true, opacity: st.color ? 0.45 : 0.16, side: THREE.DoubleSide, depthWrite: false })
          : new THREE.MeshLambertMaterial({ map: faceTex(st, rw, rh), side: THREE.DoubleSide });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(rw, rh), mat);
        m.position.set(fi.center.x, fi.center.y, fi.center.z); m.rotation.set(FACE_ROT[f][0], FACE_ROT[f][1], 0, "YXZ");
        m.userData = { type: "face", id: f }; faces.add(m); hits.push(m);
      }
      for (const e of boxEdges(dims)) {
        const cut = cuts.includes(e.id), on = edgesOn && edgesOn.has(e.id);
        if (wire) { if (on) content.add(stick(e.p0, e.p1, 0.05, 0xb07a3c)); else content.add(stick(e.p0, e.p1, 0.012, 0xb9a6d6, { opacity: 0.6 })); }
        else content.add(stick(e.p0, e.p1, cut ? 0.032 : 0.014, cut ? 0xe0443e : 0x8a6a3a));
        if (cut) { const sc = stick(e.p0, e.p1, 0.05, 0xffffff, { opacity: 0.35 }); content.add(sc); }
        const hit = stick(e.p0, e.p1, 0.13, 0xffffff, { opacity: 0 }); hit.material.visible = false; hit.userData = { type: "edge", id: e.id }; content.add(hit); hits.push(hit);
      }
      for (const v of boxVertices(dims)) {
        if (verticesOn && verticesOn.has(v.id)) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshLambertMaterial({ color: 0x8fd0ff })); ball.position.copy(v3(v.p)); content.add(ball); }
        const hit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(v3(v.p)); hit.userData = { type: "vertex", id: v.id }; content.add(hit); hits.push(hit);
      }
      // 光らせる 1つ（金色）
      s.glowObj = null; s.glowPosKey = "";
      let glw = glow;
      if (glw) {
        const GOLD = 0xffc21a;
        // id:"auto" … いま いちばん てまえに 見えて いる ものを えらぶ（まわした あとでも 見える ものが 光る）
        if (glw.id === "auto") {
          s.pivot.rotation.set(s.pitch, s.yaw, 0, "YXZ"); s.pivot.updateMatrixWorld(true);
          const cand = glw.type === "face" ? FACES.map((f) => ({ id: f, p: faceInfo(dims, f).center }))
            : glw.type === "edge" ? boxEdges(dims).map((e) => ({ id: e.id, p: { x: (e.p0.x + e.p1.x) / 2, y: (e.p0.y + e.p1.y) / 2, z: (e.p0.z + e.p1.z) / 2 } }))
              : boxVertices(dims).map((v) => ({ id: v.id, p: v.p }));
          let best = cand[0], bd = Infinity;
          for (const c of cand) { const d = v3(c.p).add(new THREE.Vector3(0, -dims.h / 2, 0)).applyMatrix4(s.pivot.matrixWorld).distanceTo(s.camera.position); if (d < bd) { bd = d; best = c; } }
          glw = { type: glw.type, id: best.id };
        }
        if (glw.type === "face") {
          const fi = faceInfo(dims, glw.id), n = { x: 0, y: 0, z: 0 }; n[{ D: "y", U: "y", W: "x", E: "x", N: "z", S: "z" }[glw.id]] = { D: -1, U: 1, W: -1, E: 1, N: -1, S: 1 }[glw.id] * 0.012;
          const [rw, rh] = glw.id === "U" || glw.id === "D" ? [dims.w, dims.d] : glw.id === "E" || glw.id === "W" ? [dims.d, dims.h] : [dims.w, dims.h];
          const g = new THREE.Mesh(new THREE.PlaneGeometry(rw * 0.94, rh * 0.94), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
          g.position.set(fi.center.x + n.x, fi.center.y + n.y, fi.center.z + n.z); g.rotation.set(FACE_ROT[glw.id][0], FACE_ROT[glw.id][1], 0, "YXZ");
          content.add(g); s.glowObj = g;
        } else if (glw.type === "edge") {
          const e = boxEdges(dims).find((x) => x.id === glw.id);
          if (e) { const g = stick(e.p0, e.p1, 0.06, GOLD); content.add(g); s.glowObj = g; }
        } else if (glw.type === "vertex") {
          const v = boxVertices(dims).find((x) => x.id === glw.id);
          if (v) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), new THREE.MeshBasicMaterial({ color: GOLD })); g.position.copy(v3(v.p)); content.add(g); s.glowObj = g; }
        }
      }
      content.position.set(0, -dims.h / 2, 0);
      s.table.visible = false;                     // とじた はこは うかせて、うらがわ（下の 面）まで まわせる
      s.fitSize = Math.max(dims.w, dims.h, dims.d) * 1.25 + 0.4;
    } else if (layout) {
      // 展開図：面ごとに ちょうつがいの ノード
      const xs = layout.cells.flatMap((c) => [c.rect[0], c.rect[2]]), zs = layout.cells.flatMap((c) => [c.rect[1], c.rect[3]]);
      s.netCenter = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
      s.netSize = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
      const origin = {};
      for (const c of [...layout.cells].sort((a, b) => a.depth - b.depth)) {
        const node = new THREE.Object3D();
        let o = [0, 0];
        if (c.parent) { const h = hingeOf(layout, c); o = h.axis === "z" ? [h.at[0], origin[c.parent][1]] : [origin[c.parent][0], h.at[1]]; node.position.set(o[0] - origin[c.parent][0], 0, o[1] - origin[c.parent][1]); node.userData.hinge = h; s.nodes[c.parent].add(node); }
        else content.add(node);
        origin[c.id] = o; s.nodes[c.id] = node;
        const w = c.rect[2] - c.rect[0], d = c.rect[3] - c.rect[1], st = styles[c.id] || {};
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: faceTex(st, w, d), side: THREE.DoubleSide }));
        // ほんの すこし うかせる（ふかい 面ほど 上。かさなった ときも ちらつかない）
        m.rotation.x = -Math.PI / 2; m.position.set((c.rect[0] + c.rect[2]) / 2 - o[0], 0.004 + 0.003 * c.depth, (c.rect[1] + c.rect[3]) / 2 - o[1]);
        m.userData = { type: "cell", id: c.id }; node.add(m); hits.push(m);
        const ln = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x8a6a3a })); ln.rotation.copy(m.rotation); ln.position.copy(m.position); node.add(ln);
      }
      s.boxFit = Math.max(dims.w, dims.h, dims.d) * 1.25 + 0.4;
      s.table.visible = true;
    }
    s.hits = hits;
    applyPose(); s.fit();
    if (import.meta.env.DEV) {        // ブラウザ テスト用（本番には 入らない）：タップ できる ものの 画面の いちと 見えて いるか
      window.__hako3d = {
        targets: (type) => {
          const r = wrapRef.current.getBoundingClientRect(), out = [];
          s.render(); s.scene.updateMatrixWorld(true);
          for (const h of s.hits) {
            if (h.userData.type !== type) continue;
            const wp = new THREE.Vector3(); h.getWorldPosition(wp);
            const sp = wp.clone().project(s.camera), x = r.left + (sp.x + 1) / 2 * r.width, y = r.top + (1 - sp.y) / 2 * r.height;
            const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(sp.x, sp.y), s.camera);
            const first = ray.intersectObjects(s.hits, false).find((q) => q.object.userData.type === type || q.object.userData.type === "face" || q.object.userData.type === "cell");
            out.push({ id: h.userData.id, x, y, visible: !!first && first.object === h && x > r.left + 4 && x < r.right - 4 && y > r.top + 4 && y < r.bottom - 4 });
          }
          return out;
        },
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dims.w, dims.h, dims.d, layoutKey, styleKey, onKey]);

  /* ---- おる 角度・ひらき ぐあい ---- */
  function applyPose() {
    const s = S.current; if (!s || !s.content) return;
    if (mode === "net" && layout) {
      let sum = 0;
      for (const c of layout.cells) {
        if (!c.parent) continue;
        const node = s.nodes[c.id], h = node.userData.hinge, a = ((angles && angles[c.id]) ?? 90) * Math.PI / 180 * h.sign;
        if (h.axis === "z") node.rotation.set(0, 0, a); else node.rotation.set(a, 0, 0);
        sum += (angles && angles[c.id]) ?? 90;
      }
      // とじて いる ほど はこの 大きさ、ひらく ほど 展開図の 大きさに あわせて 見る
      const open = openness != null ? openness : 1 - sum / (90 * (layout.cells.length - 1));
      const [cx, cz] = s.netCenter;
      s.content.position.set(-cx * open, -(dims.h / 2) * (1 - open), -cz * open);
      s.table.position.set(0, s.content.position.y - 0.02, 0);
      s.fitSize = s.boxFit * (1 - open) + (s.netSize * 0.62 + 0.5) * open;
    }
    s.fit();
  }
  const angKey = angles ? JSON.stringify(angles) : "";
  useEffect(() => { applyPose(); /* eslint-disable-next-line */ }, [angKey, openness]);

  /* ---- くるっと まわして 見せる ---- */
  useEffect(() => {
    const s = S.current; if (!s || !spin) return;
    const t0 = performance.now(), y0 = s.yaw;
    const step = (now) => { const k = Math.min(1, (now - t0) / 1800); s.yaw = y0 + k * Math.PI * 2 * (1 - (1 - k) * 0.0); s.render(); if (k < 1) s.raf = requestAnimationFrame(step); };
    cancelAnimationFrame(s.raf); s.raf = requestAnimationFrame(step);
  }, [spin]);

  /* ---- ゆび ---- */
  const P = useRef(null);
  const pick = (e) => {
    const s = S.current; if (!s || !s.hits) return null;
    const r = wrapRef.current.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), s.camera);
    const tp = cb.current.tappable || {};
    for (const h of ray.intersectObjects(s.hits, false)) { const u = h.object.userData; if (u.type === "cell" || tp[u.type]) return u; }
    return null;
  };
  const down = (e) => {
    const s = S.current; if (!s) return;
    try { wrapRef.current.setPointerCapture(e.pointerId); } catch (_) { /* なし */ }
    const hit = pick(e);
    const faceDrag = hit && hit.type === "cell" && cb.current.onFaceDrag;
    P.current = { x: e.clientX, y: e.clientY, moved: 0, faceDrag: faceDrag ? hit.id : null, yaw: s.yaw, pitch: s.pitch };
    if (faceDrag) cb.current.onFaceDrag(hit.id, "start", 0, 0);
  };
  const move = (e) => {
    const p = P.current, s = S.current; if (!p || !s) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.moved = Math.max(p.moved, Math.hypot(dx, dy));
    if (p.faceDrag) { cb.current.onFaceDrag(p.faceDrag, "move", dx, dy); return; }
    // とじた はこは 上下にも 大きく まわせる（下の 面も 見える）。展開図は すこしだけ
    const lim = mode === "box" ? [-1.5, 1.5] : [-0.5, 0.7];
    s.yaw = p.yaw + dx * 0.012; s.pitch = Math.max(lim[0], Math.min(lim[1], p.pitch + dy * 0.008)); s.render();
  };
  const up = (e) => {
    const p = P.current; P.current = null; if (!p) return;
    if (!p.faceDrag && cb.current.onTurn) cb.current.onTurn(p.moved);
    if (p.faceDrag) cb.current.onFaceDrag(p.faceDrag, "end", e.clientX - p.x, e.clientY - p.y, p.moved < 7);
    if (p.moved < 7) { const hit = pick(e); if (hit && cb.current.onTap) cb.current.onTap(hit); }
  };

  return <div className="hk-3d" style={{ height }} ref={wrapRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { P.current = null; }}
    role="img" aria-label={mode === "box" ? "はこ（ゆびで まわせる）" : "展開図"} />;
}
