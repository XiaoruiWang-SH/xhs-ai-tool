import { useState, useEffect } from 'react';
import { Layout, TabContent } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { SettingsPanel } from './components/SettingsPanel';
import type { TabType } from './components/Layout';
import { MessagesProvider } from './services/MessageContext';
import { useMessagesDispatch } from './services/messageHooks';
import { type MessageSource } from './services/messageTypes';

// 内部组件，处理消息监听逻辑
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [connectionStatus] = useState<'connected' | 'connecting' | 'error'>(
    'connected'
  );
  const messageDispatch = useMessagesDispatch();

  useEffect(() => {
    // 建立与 service worker 的连接以追踪状态
    const port = chrome.runtime.connect({ name: 'sidepanel' });
    console.log('已与 service worker 建立连接');

    // 监听来自background script的消息
    const messageListener = (message: any, _sender: any, sendResponse: any) => {
      if (message.action === 'postContentReceived') {
        console.log('收到post内容收集:', message.data);
        if (messageDispatch) {
          messageDispatch({
            type: 'clearAdd',
            data: {
              id: message.data.timestamp,
              type: 'collected',
              messageSource: 'post',
              sender: 'user',
              timestamp: new Date(message.data.timestamp),
              collectedData: message.data.content,
            },
          });
        }
      } else if (message.action === 'commentContentReceived') {
        console.log('收到comment内容收集:', message.data);
        if (messageDispatch) {
          messageDispatch({
            type: 'clearAdd',
            data: {
              id: message.data.timestamp,
              type: 'collected',
              messageSource: 'comment',
              sender: 'user',
              timestamp: new Date(message.data.timestamp),
              collectedData: message.data.content,
            },
          });
        }
        // 自动切换到聊天界面
        setActiveTab('chat');
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      // 断开连接，service worker 会自动检测到
      port.disconnect();
      console.log('已断开与 service worker 的连接');
      
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [messageDispatch]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <Layout
      defaultTab={activeTab}
      connectionStatus={connectionStatus}
      onTabChange={handleTabChange}
    >
      <TabContent tabType="chat">
        <ChatInterface />
      </TabContent>

      <TabContent tabType="settings">
        <SettingsPanel onClose={() => setActiveTab('chat')} />
      </TabContent>
    </Layout>
  );
}

function App() {
  return (
    <MessagesProvider>
      <AppContent />
    </MessagesProvider>
  );
}

export default App;
