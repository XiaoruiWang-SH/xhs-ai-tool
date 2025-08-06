import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "CRXJS from scratch",
  version: "1.0.0",
  action: {
    default_popup: "index.html",
  },
  background: {
    service_worker: "src/service_worker.ts",
  },
  content_scripts: [
    {
      js: ["src/content/main.ts"],
      matches: ["https://*/*"],
    },
  ],
});
