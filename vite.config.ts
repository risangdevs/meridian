import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Keep local development at / and publish production under the repository path.
  base: command === "build" ? "/meridian/" : "/",
}));
