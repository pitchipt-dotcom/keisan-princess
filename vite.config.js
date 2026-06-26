import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// リポジトリのルート直下にある manifest.json / sw.js / privacy.html / icons/
// を、ビルド後の dist/ にそのままコピーするための簡易プラグイン。
// （本来は public/ に置くものだが、すでにルートに置いてある分をそのまま使うため）
function copyExtraStaticFiles() {
  return {
    name: "copy-extra-static-files",
    closeBundle() {
      const outDir = resolve(__dirname, "dist");
      const filesToCopy = ["manifest.json", "sw.js", "privacy.html"];
      filesToCopy.forEach((f) => {
        const src = resolve(__dirname, f);
        if (existsSync(src)) copyFileSync(src, resolve(outDir, f));
      });
      const iconsDir = resolve(__dirname, "icons");
      if (existsSync(iconsDir)) {
        const outIconsDir = resolve(outDir, "icons");
        mkdirSync(outIconsDir, { recursive: true });
        readdirSync(iconsDir).forEach((f) => {
          copyFileSync(resolve(iconsDir, f), resolve(outIconsDir, f));
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtraStaticFiles()],
});
