import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.join(projectRoot, "client", "src") },
      { find: "@shared", replacement: path.join(projectRoot, "shared") },
      { find: "@assets", replacement: path.join(projectRoot, "attached_assets") },
    ],
  },
  root: path.join(projectRoot, "client"),
  build: {
    outDir: path.join(projectRoot, "dist", "public"),
    emptyOutDir: true,
  },
});