import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes all asset paths relative, so the site works on GitHub
// Pages project URLs (https://<user>.github.io/<repo>/) without needing to
// hardcode the repo name. No changes required if you rename the repo.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
