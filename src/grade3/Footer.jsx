/* =====================================================================
   3年生の 画面の いちばん下：「もどる」（と、もどる ほどでは ない 移動の ボタン）
   - 答えの ボタン・数字キー・クッキーの ボタンから はなす（上に 点線と 広い すきま）
   - 画面が みじかい ときも、画面の 下の はしに よせる（親指が とどきやすい）
   - たしかめの 画面は 出さない（操作を ふやさない）
   ===================================================================== */
import React from "react";

export function G3Footer({ onBack, backLabel = "もどる", children }) {
  return (
    <div className="g3-footer">
      {children}
      <button className="g3-back" onClick={onBack}>‹ {backLabel}</button>
    </div>
  );
}
