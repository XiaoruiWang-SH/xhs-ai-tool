import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '小红书AI小帮手',
  version: '1.0.0',
  action: {
    // default_popup: "index.html",
    default_title: '打开侧边栏',
  },
  side_panel: {
    default_path: 'index.html',
  },
  permissions: ['sidePanel', 'activeTab', 'storage', 'tabs'],
  background: {
    service_worker: 'src/service_worker.ts',
  },
  content_scripts: [
    {
      js: ['src/content/main.ts'],
      matches: ['https://*.xiaohongshu.com/*'],
    },
  ],
});
