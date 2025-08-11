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

export interface PostData {
  title: string;
  content: string;
  images: string[];
}

export interface CommentData {
  title: string;
  content: string;
  images: string[];
}

// 使用方法
const domWatcher = new DOMWatcher();
// genetate post
domWatcher.watch('.post-page .title.setting', (element) => {
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
      const collectedData = await collectPostPageContent();

      // 发送消息给sidepanel
      const response = await chrome.runtime.sendMessage({
        action: 'postContentCollected',
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

// generate comment
domWatcher.watch(
  '.note-container .interaction-container .engage-bar-container .left-icon-area',
  (element) => {
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
      console.log('AI助手按钮被点击');
      // 检查是否处于禁用状态
      if (aiButton.dataset.disabled === 'true') {
        return;
      }
      try {
        // 收集页面内容
        const collectedData = await collectCommentPageContent();
        // 发送消息给sidepanel
        const response = await chrome.runtime.sendMessage({
          action: 'commentContentCollected',
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
  }
);

domWatcher.start();

// 收集发布页面内容的函数
async function collectPostPageContent() {
  const data: PostData = {
    images: [] as string[],
    title: '',
    content: '',
  };

  // a: 收集 .img-preview-area 下的所有 .img.preview 元素
  const imgPreviewArea = document.querySelector('.post-page .img-preview-area');
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
  const titleContainer = document.querySelector('.post-page .title-container');
  if (titleContainer) {
    const input = titleContainer.querySelector('input') as HTMLInputElement;
    if (input) {
      data.title = input.value;
    }
  }

  // c: 收集 .plugin.editor-container 的P元素内容
  const editorContainer = document.querySelector(
    '.post-page .editor-container'
  );
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

// 解析媒体容器中的图片链接并转换为base64
async function parseMediaContainerImages(): Promise<string[]> {
  const images: string[] = [];

  try {
    // 查找媒体容器
    const mediaContainer = document.querySelector(
      '.note-container .media-container'
    );
    if (!mediaContainer) {
      console.log('未找到媒体容器 .media-container');
      return images;
    }

    // 查找滑动容器中的所有图片
    const sliderContainer = mediaContainer.querySelector('.slider-container');
    if (!sliderContainer) {
      console.log('未找到滑动容器 .slider-container');
      return images;
    }

    // 获取所有图片元素
    const imgElements = sliderContainer.querySelectorAll('img');
    console.log(`找到 ${imgElements.length} 张图片`);

    if (imgElements.length === 0) {
      return images;
    }

    // 转换所有HTTPS图片为base64
    const imagePromises: Promise<string>[] = [];

    imgElements.forEach((imgElement: Element, index: number) => {
      const img = imgElement as HTMLImageElement;
      if (img.src && img.src.startsWith('https://')) {
        console.log(`处理第 ${index + 1} 张图片: ${img.src}`);

        // 创建新的图片元素来避免跨域问题
        const promise = new Promise<string>((resolve, reject) => {
          const proxyImg = new Image();
          proxyImg.crossOrigin = 'anonymous';

          proxyImg.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
              }

              canvas.width = proxyImg.naturalWidth || proxyImg.width;
              canvas.height = proxyImg.naturalHeight || proxyImg.height;

              ctx.drawImage(proxyImg, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              resolve(dataUrl);
            } catch (error) {
              console.error(`转换图片 ${index + 1} 失败:`, error);
              // 如果转换失败，返回原始URL
              resolve(img.src);
            }
          };

          proxyImg.onerror = () => {
            console.error(`加载图片 ${index + 1} 失败: ${img.src}`);
            // 如果加载失败，返回原始URL
            resolve(img.src);
          };

          // 使用原始图片的src，设置crossOrigin来尝试解决跨域问题
          proxyImg.src = img.src;
        });

        imagePromises.push(promise);
      } else {
        console.log(`跳过非HTTPS图片: ${img.src}`);
      }
    });

    // 等待所有图片处理完成
    if (imagePromises.length > 0) {
      const results = await Promise.all(imagePromises);
      images.push(...results);
      console.log(`成功处理 ${results.length} 张图片`);
    }
  } catch (error) {
    console.error('解析媒体容器图片时发生错误:', error);
  }

  return images;
}

// 收集笔记页面内容的函数
async function collectCommentPageContent() {
  const data: CommentData = {
    images: [] as string[],
    title: '',
    content: '',
  };

  // 使用新的解析方法收集媒体容器中的图片
  try {
    const mediaImages = await parseMediaContainerImages();
    data.images = mediaImages;
  } catch (error) {
    console.error('收集媒体容器图片失败:', error);
  }

  // b: 收集标题 - 直接取 div 的内容
  const titleContainer =
    document.querySelector('#detail-title') ||
    document.querySelector('.note-content .title');
  if (titleContainer) {
    data.title = titleContainer.textContent?.trim() || '';
    console.log('收集到标题:', data.title);
  }

  // c: 收集内容 - 取所有标签的文字内容
  const contentContainer =
    document.querySelector('#detail-desc') ||
    document.querySelector('.note-content .desc');
  if (contentContainer) {
    // 获取所有文字内容，包括各种标签（span, a等）
    data.content = contentContainer.textContent?.trim() || '';
    console.log('收集到内容:', data.content);
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
      const titleContainer = document.querySelector(
        '.post-page .title-container'
      );
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
      const editorContainer = document.querySelector(
        '.post-page .editor-container'
      );
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

// 应用评论内容到页面
function applyCommentContent(commentData: {
  content?: string;
  messageId?: string;
  timestamp?: string;
}) {
  try {
    console.log('Content Script: 开始应用评论内容:', commentData);

    if (!commentData.content) {
      console.warn('Content Script: 没有评论内容可应用');
      return {
        success: false,
        error: '没有评论内容',
      };
    }

    // 查找评论输入框的 p 标签，优先使用 id，然后使用 class 或元素选择器
    let commentInput: HTMLParagraphElement | null = null;

    // 优先尝试通过 ID 查找
    commentInput = document.querySelector('#content-textarea') as HTMLParagraphElement;
    
    // 如果通过 ID 找不到，尝试使用完整的 class 路径
    if (!commentInput) {
      commentInput = document.querySelector(
        '.interaction-container .engage-bar-container .input-box .content-edit p'
      ) as HTMLParagraphElement;
      console.log('Content Script: 通过 class 路径找到评论输入框');
    } else {
      console.log('Content Script: 通过 ID 找到评论输入框');
    }

    if (!commentInput) {
      console.warn('Content Script: 未找到评论输入框');
      return {
        success: false,
        error: '未找到评论输入框',
      };
    }

    // 直接将内容放入 p 标签中
    commentInput.textContent = commentData.content;
    commentInput.focus();

    // 触发相关事件以确保页面响应
    ['input', 'change', 'keyup', 'blur', 'focus'].forEach((eventType) => {
      commentInput!.dispatchEvent(new Event(eventType, { bubbles: true }));
    });

    console.log('Content Script: 评论内容已成功应用');
    return {
      success: true,
      message: '评论内容已成功应用到页面',
    };
  } catch (error) {
    console.error('Content Script: 应用评论内容失败:', error);
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
  } else if (message.action === 'applyCommentContent') {
    console.log('Content Script: 收到应用评论内容的请求:', message.data);

    // 验证数据格式
    if (!message.data) {
      console.error('Content Script: 缺少数据');
      sendResponse({ success: false, error: '缺少数据' });
      return true;
    }

    if (!message.data.content) {
      console.error('Content Script: 缺少评论内容');
      sendResponse({ success: false, error: '缺少评论内容数据' });
      return true;
    }

    // 应用评论并返回结果
    const result = applyCommentContent(message.data);
    console.log('Content Script: 应用评论结果:', result);
    sendResponse(result);
    return true;
  } else {
    console.log('Content Script: 未知消息类型:', message.action);
    sendResponse({ success: false, error: '未知消息类型' });
    return false;
  }
});
