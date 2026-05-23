import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@shared": path.resolve(rootDir, "../../shared")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    fs: {
      allow: [path.resolve(rootDir, "..", "..")]
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
