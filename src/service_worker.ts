// background.ts
/// <reference types="chrome"/>

interface TabInfo {
  id: number;
  url?: string;
  title?: string;
}

interface SiteInfo {
  title: string;
  url: string;
  favIconUrl?: string;
}

interface Message {
  action: string;
  data?: any;
}

// 扩展安装时初始化
chrome.runtime.onInstalled.addListener((): void => {
  console.log('侧边栏扩展已安装');

  // 设置点击扩展图标时自动打开侧边栏
  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(
  async (tab: chrome.tabs.Tab): Promise<void> => {
    console.log('扩展图标被点击，准备打开侧边栏');

    try {
      if (tab.id) {
        await chrome.sidePanel.open({
          tabId: tab.id,
        });

        // 设置徽章表示侧边栏已打开
        chrome.action.setBadgeText({
          tabId: tab.id,
          text: '●',
        });

        chrome.action.setBadgeBackgroundColor({
          color: '#4CAF50',
        });
      }
    } catch (error) {
      console.error('打开侧边栏失败:', error);
    }
  }
);

// 监听来自侧边栏的消息
chrome.runtime.onMessage.addListener(
  (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean => {
    switch (message.action) {
      case 'getCurrentTab':
        handleGetCurrentTab(sendResponse);
        return true; // 保持消息通道开启

      case 'executeScript':
        handleExecuteScript(message.data, sendResponse);
        return true;

      default:
        console.log('未知消息类型:', message.action);
        sendResponse({ error: '未知消息类型' });
        return false;
    }
  }
);

// 获取当前活动标签页信息
async function handleGetCurrentTab(
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab) {
      const siteInfo: SiteInfo = {
        title: tab.title || '未知页面',
        url: tab.url || '',
        favIconUrl: tab.favIconUrl,
      };
      sendResponse({ success: true, data: siteInfo });
    } else {
      sendResponse({ success: false, error: '未找到活动标签页' });
    }
  } catch (error) {
    console.error('获取标签页信息失败:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// 执行页面脚本
async function handleExecuteScript(
  scriptData: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scriptData.func,
      args: scriptData.args || [],
    });

    sendResponse({
      success: true,
      data: results[0]?.result,
    });
  } catch (error) {
    console.error('执行脚本失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
    tab: chrome.tabs.Tab
  ): void => {
    if (changeInfo.status === 'complete' && tab.url) {
      // 根据不同网站更新扩展图标标题
      let title = '打开侧边栏';

      if (tab.url.includes('github.com')) {
        title = 'GitHub工具栏';
      } else if (tab.url.includes('stackoverflow.com')) {
        title = 'Stack Overflow工具';
      }

      chrome.action.setTitle({
        tabId: tabId,
        title: title,
      });
    }
  }
);
