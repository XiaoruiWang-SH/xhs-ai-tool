class DOMWatcher {
  private observer: MutationObserver | null = null;
  private callbacks: Map<string, (element: HTMLElement) => void> = new Map();

  constructor() {
    this.observer = new MutationObserver((mutations) => {
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
function collectPageContent() {
  const data = {
    images: [] as string[],
    title: '',
    content: '',
  };

  // a: 收集 .img-preview-area 下的所有 .img.preview 元素
  const imgPreviewArea = document.querySelector('.img-preview-area');
  if (imgPreviewArea) {
    const imgElements = imgPreviewArea.querySelectorAll('img.preview');
    imgElements.forEach((img: Element) => {
      const imgElement = img as HTMLImageElement;
      if (imgElement.src) {
        data.images.push(imgElement.src);
      }
    });
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
  title: string;
  content: string;
  images: string[];
}) {
  try {
    // 应用标题
    if (editedData.title) {
      const titleContainer = document.querySelector('.title-container');
      if (titleContainer) {
        const input = titleContainer.querySelector('input') as HTMLInputElement;
        if (input) {
          input.value = editedData.title;
          // 触发input事件以确保页面响应
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    // 应用内容
    if (editedData.content) {
      const editorContainer = document.querySelector('.editor-container');
      if (editorContainer) {
        const pElements = editorContainer.querySelectorAll('p');
        const contentLines = editedData.content.split('\n');

        // 更新现有的p元素，如果内容行数更多则创建新的p元素
        contentLines.forEach((line, index) => {
          if (pElements[index]) {
            pElements[index].textContent = line;
          } else {
            // 创建新的p元素
            const newP = document.createElement('p');
            newP.textContent = line;
            editorContainer.appendChild(newP);
          }
        });

        // 如果原来的p元素比新内容多，移除多余的p元素
        for (let i = contentLines.length; i < pElements.length; i++) {
          pElements[i].remove();
        }
      }
    }

    console.log('内容应用完成');
    return { success: true, message: '内容已成功应用到页面' };
  } catch (error) {
    console.error('应用内容失败:', error);
    return { success: false, error: (error as Error).message };
  }
}

// 使用方法
const domWatcher = new DOMWatcher();
domWatcher.watch('.title.setting', (element) => {
  console.log('找到目标元素:', element);
  // 在这里处理元素

  const mydiv = document.createElement('span');
  mydiv.textContent = '【AI】';
  mydiv.style.color = 'red';
  mydiv.addEventListener('click', () => {
    // 收集页面内容
    const collectedData = collectPageContent();

    // 发送消息给sidepanel
    chrome.runtime
      .sendMessage({
        action: 'contentCollected',
        data: {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          content: collectedData,
        },
      })
      .then((response) => {
        console.log('内容收集完成:', response);
      })
      .catch((error) => {
        console.error('发送消息失败:', error);
      });
  });
  element.appendChild(mydiv);

  domWatcher.stop();
});
domWatcher.start();

// 监听来自sidepanel的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'messageFromSidepanel') {
    console.log('Content script收到来自sidepanel的消息:', message.data);

    // 在页面上显示消息
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = `来自侧边栏: ${message.data.message}`;
    document.body.appendChild(notification);

    // 3秒后移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);

    sendResponse({ success: true, message: '消息已在页面显示' });
    return true;
  } else if (message.action === 'applyEditedContent') {
    console.log('收到应用编辑内容的请求:', message.data);

    const result = applyEditedContent(message.data);
    sendResponse(result);
    return true;
  }
});
