import aiAuto_icon from '../assets/aiAuto_icon.svg';
import { convertImageElementToBase64 } from '../utils/imageUtils';

class DOMWatcher {
  private observer: MutationObserver | null = null;
  private callbacks: Map<string, (element: HTMLElement) => void> = new Map();

  constructor() {
    this.observer = new MutationObserver((mutations) => {
      console.log('DOMWatcher: 监听到DOM变化', mutations);
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkElement(node as HTMLElement);
            }
          });
        }
      });
    });
  }

  private checkElement(element: HTMLElement): void {
    // 检查当前元素
    this.callbacks.forEach((callback, selector) => {
      if (element.matches && element.matches(selector)) {
        callback(element);
      }
    });

    // 检查子元素
    this.callbacks.forEach((callback, selector) => {
      const found = element.querySelector(selector) as HTMLElement;
      if (found) {
        callback(found);
      }
    });
  }

  watch(selector: string, callback: (element: HTMLElement) => void): void {
    this.callbacks.set(selector, callback);

    // 检查现有元素
    const existing = document.querySelector(selector) as HTMLElement;
    if (existing) {
      callback(existing);
    }
  }

  start(): void {
    if (this.observer) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}


// 收集页面内容的函数
async function collectPageContent() {
  const data = {
    images: [] as string[],
    title: '',
    content: '',
  };

  // a: 收集 .img-preview-area 下的所有 .img.preview 元素
  const imgPreviewArea = document.querySelector('.img-preview-area');
  if (imgPreviewArea) {
    const imgElements = imgPreviewArea.querySelectorAll('img.preview');

    // 转换所有图片为base64
    const imagePromises: Promise<string>[] = [];
    imgElements.forEach((img: Element) => {
      const imgElement = img as HTMLImageElement;
      if (imgElement.src) {
        if (imgElement.src.startsWith('blob:')) {
          // 对于blob URL，转换为base64
          imagePromises.push(convertImageElementToBase64(imgElement));
        } else {
          // 对于普通URL，直接使用
          //   imagePromises.push(Promise.resolve(imgElement.src));
        }
      }
    });

    try {
      const imageResults = await Promise.all(imagePromises);
      data.images = imageResults;
    } catch (error) {
      console.error('转换图片失败:', error);
      // 如果转换失败，回退到原始URL
      imgElements.forEach((img: Element) => {
        const imgElement = img as HTMLImageElement;
        if (imgElement.src) {
          data.images.push(imgElement.src);
        }
      });
    }
  }

  // b: 收集 .plugin.title-container .d-text 的input值
  const titleContainer = document.querySelector('.title-container');
  if (titleContainer) {
    const input = titleContainer.querySelector('input') as HTMLInputElement;
    if (input) {
      data.title = input.value;
    }
  }

  // c: 收集 .plugin.editor-container 的P元素内容
  const editorContainer = document.querySelector('.editor-container');
  if (editorContainer) {
    const pElements = editorContainer.querySelectorAll('p');
    const contentArray: string[] = [];
    pElements.forEach((p: Element) => {
      contentArray.push(p.textContent || '');
    });
    data.content = contentArray.join('\n');
  }

  console.log('收集到的内容:', data);
  return data;
}

// 应用编辑后的内容回到页面
function applyEditedContent(editedData: {
  title?: string;
  content?: string;
  messageId?: string;
  timestamp?: string;
}) {
  try {
    console.log('Content Script: 开始应用编辑后的内容:', editedData);

    const appliedFields: string[] = [];

    // 应用标题
    if (editedData.title) {
      const titleContainer = document.querySelector('.title-container');
      if (titleContainer) {
        const input = titleContainer.querySelector('input') as HTMLInputElement;
        if (input) {
          console.log('Content Script: 应用标题:', editedData.title);
          input.value = editedData.title;

          // 触发多种事件以确保页面响应
          const events = ['input', 'change', 'keyup', 'blur'];
          events.forEach((eventType) => {
            input.dispatchEvent(new Event(eventType, { bubbles: true }));
          });

          // 如果是React组件，尝试触发React事件
          const reactKey = Object.keys(input).find(
            (key) =>
              key.startsWith('__reactInternalInstance') ||
              key.startsWith('_reactInternalFiber')
          );
          if (reactKey) {
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }

          appliedFields.push('标题');
        } else {
          console.warn('Content Script: 未找到标题输入框');
        }
      } else {
        console.warn('Content Script: 未找到标题容器(.title-container)');
      }
    }

    // 应用内容
    if (editedData.content) {
      const editorContainer = document.querySelector('.editor-container');
      if (editorContainer) {
        console.log('Content Script: 应用内容:', editedData.content);

        // 获取现有的p元素
        const existingPElements = editorContainer.querySelectorAll('p');

        // 如果有现有的p元素，直接替换其内容
        if (existingPElements.length > 0) {
          // 使用第一个p元素来放置所有内容
          const firstP = existingPElements[0] as HTMLParagraphElement;
          firstP.textContent = editedData.content;

          // 移除其他多余的p元素
          for (let i = 1; i < existingPElements.length; i++) {
            existingPElements[i].remove();
          }
        } else {
          // 如果没有现有的p元素，创建一个新的
          const newP = document.createElement('p');
          newP.textContent = editedData.content;

          // 设置样式以匹配原有格式
          newP.setAttribute('data-slate-node', 'element');
          newP.setAttribute('data-slate-object', 'block');

          editorContainer.appendChild(newP);
        }

        // 触发编辑器更新事件
        const focusEvent = new Event('focus', { bubbles: true });
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });

        editorContainer.dispatchEvent(focusEvent);
        editorContainer.dispatchEvent(inputEvent);
        editorContainer.dispatchEvent(changeEvent);

        appliedFields.push('内容');
      } else {
        console.warn('Content Script: 未找到编辑器容器(.editor-container)');
      }
    }

    if (appliedFields.length > 0) {
      console.log(`Content Script: 应用完成 - ${appliedFields.join('、')}`);
      return {
        success: true,
        message: `${appliedFields.join('、')}已成功应用到页面`,
        appliedFields,
      };
    } else {
      console.warn('Content Script: 没有应用任何内容');
      return {
        success: false,
        error: '没有找到可应用的页面元素',
      };
    }
  } catch (error) {
    console.error('Content Script: 应用内容失败:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// 创建AI助手按钮的函数
function createAIAssistantButton(): HTMLSpanElement {
  const button = document.createElement('span');

  // 设置按钮样式，使用SVG图标
  button.innerHTML = `
    <img src="${aiAuto_icon}" alt="AI一键生成" style="width: auto; height: 24px; object-fit: contain;" />
  `;

  // 应用样式
  Object.assign(button.style, {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
  });

  // 悬停效果
  button.addEventListener('mouseenter', () => {
    Object.assign(button.style, {
      transform: 'translateY(-1px)',
      opacity: '0.9',
    });
  });

  button.addEventListener('mouseleave', () => {
    Object.assign(button.style, {
      transform: 'translateY(0)',
      opacity: '1',
    });
  });

  return button;
}

// 使用方法
const domWatcher = new DOMWatcher();
domWatcher.watch('.title.setting', (element) => {
  console.log('找到目标元素:', element);

  // 检查是否已经添加了AI按钮，避免重复添加
  if (element.querySelector('.ai-assistant-button')) {
    return;
  }

  // 创建AI助手按钮
  const aiButton = createAIAssistantButton();
  aiButton.classList.add('ai-assistant-button');

  // 添加点击事件
  aiButton.addEventListener('click', async () => {
    // 检查是否处于禁用状态
    if (aiButton.dataset.disabled === 'true') {
      return;
    }

    try {
      // 收集页面内容
      const collectedData = await collectPageContent();

      // 发送消息给sidepanel
      const response = await chrome.runtime.sendMessage({
        action: 'contentCollected',
        data: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          content: collectedData,
        },
      });

      console.log('内容收集完成:', response);
    } catch (error) {
      console.error('内容收集失败:', error);
    }
  });

  // 将按钮添加到目标元素
  element.appendChild(aiButton);
});
domWatcher.start();

// 监听来自sidepanel的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content Script: 收到消息:', {
    action: message.action,
    sender: sender.tab?.id,
  });

  if (message.action === 'messageFromSidepanel') {
    console.log('Content Script: 收到来自sidepanel的消息:', message.data);
    sendResponse({ success: true, message: '消息已在页面显示' });
    return true;
  } else if (message.action === 'applyEditedContent') {
    console.log('Content Script: 收到应用编辑内容的请求:', message.data);

    // 验证数据格式
    if (!message.data) {
      console.error('Content Script: 缺少数据');
      sendResponse({ success: false, error: '缺少数据' });
      return true;
    }

    if (!message.data.title && !message.data.content) {
      console.error('Content Script: 缺少标题和内容');
      sendResponse({ success: false, error: '缺少标题和内容数据' });
      return true;
    }

    // 应用内容并返回结果
    const result = applyEditedContent(message.data);
    console.log('Content Script: 应用结果:', result);
    sendResponse(result);
    return true;
  } else {
    console.log('Content Script: 未知消息类型:', message.action);
    sendResponse({ success: false, error: '未知消息类型' });
    return false;
  }
});
