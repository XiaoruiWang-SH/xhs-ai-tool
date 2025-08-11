import { type MessageSource } from "./services/messageTypes";

// background.ts
/// <reference types="chrome"/>

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

// 监听标签页更新
chrome.tabs.onUpdated.addListener(
  async (
    tabId: number,
    changeInfo: chrome.tabs.OnUpdatedInfo,
    tab: chrome.tabs.Tab
  ): Promise<void> => {
    if (
      changeInfo.status === 'complete' &&
      tab.url &&
      isXiaohongshuPage(tab.url)
    ) {
      // 根据不同网站更新扩展图标标题
      const title = '打开小红书AI助手';
      chrome.action.setTitle({
        tabId: tabId,
        title: title,
      });
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
      case 'postContentCollected':
        console.log('文案生成收到内容收集:', message.data);
        handleContentCollected(message.data, sender, 'post', sendResponse);
        return false;
      case 'commentContentCollected':
        console.log('评论页面收到内容收集:', message.data);
        handleContentCollected(message.data, sender, 'comment', sendResponse);
        return false;

      case 'applyContentToPage':
        handleApplyContentToPage(message.data, sendResponse);
        return true;

      case 'applyCommentToPage':
        handleApplyCommentToPage(message.data, sendResponse);
        return true;

      default:
        console.log('未知消息类型:', message.action);
        sendResponse({ error: '未知消息类型' });
        return false;
    }
  }
);

// 处理内容收集事件
function handleContentCollected(
  data: any,
  sender: chrome.runtime.MessageSender,
  type: MessageSource,
  sendResponse: (response: any) => void
): void {
  try {
    console.log('处理内容收集:', data);

    // 从sender获取标签页信息
    if (!sender.tab?.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    // 确保侧边栏打开，在callback中发送消息
    openSidePanel(sender.tab.id, () => {
      let action = 'postContentReceived';
      if (type === 'comment') {
        action = 'commentContentReceived';
      }
      if (type === 'reply') {
        action = 'replyContentReceived';
      }
      // 侧边栏打开成功后，转发消息给sidepanel
      setTimeout(() => {
        chrome.runtime
          .sendMessage({
            action: action,
            data: data,
          })
          .then(() => {
            sendResponse({ success: true, message: '内容收集事件已处理' });
          })
          .catch((error) => {
            console.error('转发消息失败:', error);
            sendResponse({ success: false, error: error.message });
          });
      }, 500);
    });
  } catch (error) {
    console.error('处理内容收集失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 处理应用内容到页面
async function handleApplyContentToPage(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('Service Worker: 转发内容应用请求到content script:', data);

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    // 确保数据包含必要的字段
    if (!data.title && !data.content) {
      sendResponse({ success: false, error: '缺少标题或内容数据' });
      return;
    }

    // 发送消息到content script应用内容 (只转发，不存储)
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'applyEditedContent',
      data: {
        title: data.title || '',
        content: data.content || '',
        messageId: data.messageId,
        timestamp: data.timestamp,
      },
    });

    console.log('Service Worker: Content script响应:', response);

    sendResponse({
      success: response?.success || false,
      message: response?.message || '内容应用状态未知',
      error: response?.error,
    });
  } catch (error) {
    console.error('Service Worker: 应用内容到页面失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 处理应用评论到页面
async function handleApplyCommentToPage(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('Service Worker: 转发评论应用请求到content script:', data);

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    // 确保数据包含必要的字段
    if (!data.content) {
      sendResponse({ success: false, error: '缺少评论内容数据' });
      return;
    }

    // 发送消息到content script应用评论 (只转发，不存储)
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'applyCommentContent',
      data: {
        content: data.content || '',
        messageId: data.messageId,
        timestamp: data.timestamp,
      },
    });

    console.log('Service Worker: Content script响应:', response);

    sendResponse({
      success: response?.success || false,
      message: response?.message || '评论应用状态未知',
      error: response?.error,
    });
  } catch (error) {
    console.error('Service Worker: 应用评论到页面失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 检查是否为小红书页面
function isXiaohongshuPage(url: string): boolean {
  return /^https:\/\/.*\.xiaohongshu\.com\/.*$/.test(url);
}

// 打开侧边栏
function openSidePanel(tabId: number, callback?: () => void): void {
  chrome.sidePanel.open(
    {
      tabId: tabId,
    },
    () => {
      console.log('侧边栏已成功打开');
      if (callback) {
        callback();
      }
    }
  );
}
