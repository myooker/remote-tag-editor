import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The backend (Crow) runs on :18080 in dev. In production nginx serves the
// built /dist and proxies /api to the backend, so requests stay same-origin.
// Override the dev proxy target with VITE_API_TARGET if your backend is elsewhere
// (e.g. the dockerized stack on http://localhost:8080).
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:18080";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  // `npm run preview` serves the production build; proxy /api so it can also
  // talk to the backend during testing.
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
