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

// 使用方法
const domWatcher = new DOMWatcher();
domWatcher.watch('.title.setting', (element) => {
  console.log('找到目标元素:', element);
  // 在这里处理元素

  const mydiv = document.createElement('span');
  mydiv.textContent = '【AI】';
  mydiv.style.color = 'red';
  mydiv.addEventListener('click', () => {
    alert('[AI]被点击了');
    // 发送消息给sidepanel
    chrome.runtime
      .sendMessage({
        action: 'aiTagClicked',
        data: {
          timestamp: new Date().toISOString(),
          element: element.textContent,
          url: window.location.href,
        },
      })
      .then((response) => {
        console.log('消息发送成功:', response);
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
  }
});
