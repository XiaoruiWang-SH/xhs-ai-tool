import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '小红书AI小帮手',
  version: '1.0.0',
  icons: {
    '16': 'public/icon_16x16.png',
    '32': 'public/icon_32x32.png',
    '48': 'public/icon_48x48.png',
    '128': 'public/icon_128x128.png',
  },
  action: {
    // default_popup: "index.html",
    default_title: '打开侧边栏',
    default_icon: {
      '16': 'public/icon_16x16.png',
      '32': 'public/icon_32x32.png',
      '48': 'public/icon_48x48.png',
      '128': 'public/icon_128x128.png',
    },
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
