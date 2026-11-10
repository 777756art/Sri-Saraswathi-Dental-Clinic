import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["kinds-excluding-withdrawal-dem.trycloudflare.com"],
    proxy: {
      "/api": {
        target: "http://localhost:4102",
        changeOrigin: true,
      },
    },
  },
});
