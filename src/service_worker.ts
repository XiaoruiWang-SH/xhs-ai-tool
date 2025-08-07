// background.ts
/// <reference types="chrome"/>

// interface TabInfo {
//   id: number;
//   url?: string;
//   title?: string;
// }

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
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean => {
    switch (message.action) {
      case 'getCurrentTab':
        handleGetCurrentTab(sendResponse);
        return true; // 保持消息通道开启

      case 'executeScript':
        handleExecuteScript(message.data, sendResponse);
        return true;

      case 'aiTagClicked':
            console.log('AI标签被点击:', message.data);
            handleAiTagClicked(message.data, sendResponse);
        // sendResponse({ success: true, message: 'AI标签点击事件已记录' });
        return false;

      case 'contentCollected':
        console.log('收到内容收集:', message.data);
        handleContentCollected(message.data, sendResponse);
        return false;

      case 'sendToContent':
        // sendResponse({ success: true, message: 'sendToContent事件已记录' });
        handleSendToContent(message.data, sendResponse);
        return true;

      case 'applyContentToPage':
        handleApplyContentToPage(message.data, sendResponse);
        return true;

      case 'chatWithAI':
        handleChatWithAI(message.data, sendResponse);
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

// 处理发送消息到content script
async function handleSendToContent(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('转发消息到content script:', data);

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    // 发送消息到content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'messageFromSidepanel',
      data: data,
    });

    sendResponse({
      success: true,
      message: '消息已发送到content script',
      response: response,
    });
  } catch (error) {
    console.error('发送消息到content script失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 处理AI标签点击事件
async function handleAiTagClicked(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('AI标签被点击:', data);

    // 转发消息给sidepanel
    chrome.runtime
      .sendMessage({
        action: 'sendToPanel',
        data: data,
      })
      .then(() => {
        sendResponse({ success: true, message: 'AI标签点击事件已处理' });
      })
      .catch((error) => {
        console.error('转发消息失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error('处理AI标签点击失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 处理内容收集事件
async function handleContentCollected(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('处理内容收集:', data);

    // 转发消息给sidepanel
    chrome.runtime
      .sendMessage({
        action: 'contentReceived',
        data: data,
      })
      .then(() => {
        sendResponse({ success: true, message: '内容收集事件已处理' });
      })
      .catch((error) => {
        console.error('转发消息失败:', error);
        sendResponse({ success: false, error: error.message });
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
    console.log('应用内容到页面:', data);

    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ success: false, error: '无效的标签页ID' });
      return;
    }

    // 发送消息到content script应用内容
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'applyEditedContent',
      data: data,
    });

    sendResponse({
      success: true,
      message: '内容已应用到页面',
      response: response,
    });
  } catch (error) {
    console.error('应用内容到页面失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 处理AI聊天请求
async function handleChatWithAI(
  data: any,
  sendResponse: (response: any) => void
): Promise<void> {
  try {
    console.log('处理AI聊天请求:', data);

    // 从Chrome存储获取API配置
    const config = await getAIConfig();
    if (!config.apiKey) {
      sendResponse({
        success: false,
        error: '请先配置API密钥。点击扩展图标 -> 设置'
      });
      return;
    }

    // 构建聊天消息
    const messages = await buildChatMessages(data);
    
    // 调用AI API
    const aiResponse = await callAIAPI(config, messages);
    
    sendResponse({
      success: true,
      data: {
        reply: aiResponse.content,
        usage: aiResponse.usage
      }
    });

  } catch (error) {
    console.error('AI聊天失败:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

// 获取AI配置
async function getAIConfig(): Promise<{
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}> {
  const result = await chrome.storage.sync.get(['aiConfig']);
  return result.aiConfig || {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1'
  };
}

// 构建聊天消息
async function buildChatMessages(data: any): Promise<any[]> {
  const messages: any[] = [];
  
  // 系统提示词
  let systemPrompt = `你是一个专业的小红书内容创作助手。你的任务是帮助用户创作吸引人的标题和内容。

你的能力包括:
1. 根据图片和内容生成吸引人的标题
2. 润色和优化现有文本
3. 提供创作建议和灵感
4. 符合小红书平台特色的内容创作

请用友好、专业的语气回复，提供实用的建议。`;

  // 如果有收集的内容，添加到系统提示中
  if (data.context) {
    systemPrompt += `\n\n当前页面收集到的内容:\n`;
    if (data.context.images && data.context.images.length > 0) {
      systemPrompt += `- 图片数量: ${data.context.images.length}张\n`;
    }
    if (data.context.title) {
      systemPrompt += `- 当前标题: ${data.context.title}\n`;
    }
    if (data.context.content) {
      systemPrompt += `- 当前内容: ${data.context.content}\n`;
    }
  }

  messages.push({
    role: 'system',
    content: systemPrompt
  });

  // 添加对话历史
  if (data.conversationHistory && data.conversationHistory.length > 0) {
    data.conversationHistory.forEach((msg: any) => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
  }

  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: data.message
  });

  return messages;
}

// 调用AI API
async function callAIAPI(config: any, messages: any[]): Promise<{
  content: string;
  usage?: any;
}> {
  const apiUrl = `${config.baseUrl}/chat/completions`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.choices || result.choices.length === 0) {
    throw new Error('API返回格式错误');
  }

  return {
    content: result.choices[0].message.content,
    usage: result.usage
  };
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
