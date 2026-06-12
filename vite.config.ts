/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { joinPublicImageUrl } from "./src/lib/publicImageUrlCore.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function publicImageCdnBuildPlugin(env: Record<string, string>): Plugin {
  const rawBase = (env.VITE_PUBLIC_IMAGE_CDN_BASE ?? "").trim();
  const cdnBase = rawBase.replace(/\/+$/, "");
  let buildOutDir = "dist";

  return {
    name: "public-image-cdn-html-manifest",
    configResolved(config) {
      buildOutDir = config.build.outDir;
    },
    transformIndexHtml(html: string) {
      if (!cdnBase) return html;
      const iconHref = joinPublicImageUrl(cdnBase, "/images/app/pwa_icon.png");
      return html.replace(
        'href="/images/app/pwa_icon.png"',
        `href="${iconHref}"`,
      );
    },
    closeBundle() {
      if (!cdnBase) return;
      const manifestPath = path.resolve(
        __dirname,
        buildOutDir,
        "manifest.webmanifest",
      );
      if (!fs.existsSync(manifestPath)) return;
      const rawJson = fs.readFileSync(manifestPath, "utf8");
      let manifest: { icons?: { src: string }[] };
      try {
        manifest = JSON.parse(rawJson) as { icons?: { src: string }[] };
      } catch {
        return;
      }
      if (!manifest.icons?.length) return;
      for (const icon of manifest.icons) {
        if (typeof icon.src === "string" && icon.src.startsWith("/images/")) {
          icon.src = joinPublicImageUrl(cdnBase, icon.src);
        }
      }
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

// https://vite.dev/config/ — 產線掛在網域根
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_PROXY;
  return {
    base: "/",
    resolve: {
      alias: {
        "@protobufjs/inquire": path.resolve(
          __dirname,
          "src/shims/protobufInquire.cjs",
        ),
      },
    },
    plugins: [react(), publicImageCdnBuildPlugin(env)],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
      setupFiles: ["./src/test/vitest-setup.ts"],
    },
    server: {
      port: 5176,
      host: true,
      allowedHosts: ["devserver-main--hilarious-semifreddo-86de97.netlify.app"],
      // 不設 VITE_API_BASE 時，可將同源的 /api 代理到後端
      proxy: proxyTarget
        ? {
            "/api": {
              target: proxyTarget,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
