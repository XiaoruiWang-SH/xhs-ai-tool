import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: '小红书AI小帮手 - 小红书AI创作助手',
  short_name: 'XHS AI Tool',
  version: '1.0.0',
  description:
    '专为小红书创作者打造的AI智能助手，支持AI文案生成、内容优化、图文创作。使用AI大模型技术，让您的小红书内容创作更高效、更有创意。',
  homepage_url: 'https://github.com/XiaoruiWang-SH/xhs-ai-tool',
  icons: {
    '16': 'public/icon_16x16.png',
    '32': 'public/icon_32x32.png',
    '48': 'public/icon_48x48.png',
    '128': 'public/icon_128x128.png',
  },
  action: {
    default_title: '打开小红书 AI帮手',
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
  permissions: ['sidePanel', 'activeTab', 'tabs'],
  background: {
    service_worker: 'src/service_worker.ts',
  },
  content_scripts: [
    {
      js: ['src/content/main.ts'],
      matches: [
        'https://creator.xiaohongshu.com/publish/*',
        'https://www.xiaohongshu.com/explore/*',
      ],
      run_at: 'document_idle',
    },
  ],
});
