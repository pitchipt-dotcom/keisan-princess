import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// フォントは アプリの 中に 同梱（Google Fonts など 外部への 通信を しない ため）
// src/fonts/ の 中身は Google Fonts が 配っている ファイルと 同じもの（SIL OFL）
import "./fonts/fonts.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA対応：オフラインでも開けるように Service Worker を登録
// （load イベントを待たず、できるだけ早く登録する）
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // 登録に失敗しても通常のWebアプリとしては問題なく動作する
  });
}
