import { useState, useEffect } from 'react';
import { Layout, TabContent } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { SettingsPanel } from './components/SettingsPanel';
import type { TabType } from './components/Layout';

interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

interface ContentData {
  timestamp: string;
  url: string;
  content: CollectedContent;
}

function App() {
  const [collectedContent, setCollectedContent] = useState<ContentData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [connectionStatus] = useState<'connected' | 'connecting' | 'error'>('connected');

  useEffect(() => {
    // 监听来自background script的消息
    const messageListener = (message: any, _sender: any, sendResponse: any) => {
      if (message.action === 'contentReceived') {
        console.log('收到内容收集:', message.data);
        setCollectedContent(message.data);
        // 自动切换到聊天界面
        setActiveTab('chat');
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

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
        <ChatInterface collectedContent={collectedContent?.content} />
      </TabContent>
      
      <TabContent tabType="settings">
        <SettingsPanel onClose={() => setActiveTab('chat')} />
      </TabContent>
    </Layout>
  );
}

export default App;