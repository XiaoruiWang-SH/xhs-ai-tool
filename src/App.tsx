import { useState, useEffect } from 'react'
import { ChatInterface } from './components/ChatInterface2'
import { SettingsPanel } from './components/SettingsPanel'

interface AiTagClickData {
  timestamp: string;
  element: string;
  url: string;
}

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
  const [messages, setMessages] = useState<AiTagClickData[]>([])
  const [collectedContent, setCollectedContent] = useState<ContentData | null>(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'content' | 'chat'>('content')
  const [showSettings, setShowSettings] = useState(false)

  // 发送消息到content script
  const sendMessageToContent = async (messageText: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'sendToContent',
        data: {
          type: 'fromSidepanel',
          message: messageText,
          timestamp: new Date().toISOString()
        }
      });
      console.log('消息发送成功:', response);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  // 应用编辑后的内容到页面
  const applyEditedContent = async () => {
    if (!collectedContent) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'applyContentToPage',
        data: {
          title: editedTitle,
          content: editedContent,
          images: collectedContent.content.images
        }
      });
      
      if (response.success) {
        alert('内容已成功应用到页面!');
        setIsEditing(false);
      } else {
        alert('应用失败: ' + response.error);
      }
    } catch (error) {
      console.error('应用内容失败:', error);
      alert('应用内容失败: ' + error);
    }
  };

  // 开始编辑
  const startEditing = () => {
    if (collectedContent) {
      setEditedTitle(collectedContent.content.title);
      setEditedContent(collectedContent.content.content);
      setIsEditing(true);
    }
  };

  useEffect(() => {
    // 监听来自background script的消息
    const messageListener = (message: any, _sender: any, sendResponse: any) => {
      if (message.action === 'sendToPanel') {
        console.log('收到AI标签点击消息:', message.data);
        setMessages((prev) => [...prev, message.data]);
        sendResponse({ success: true });
      } else if (message.action === 'contentReceived') {
        console.log('收到内容收集:', message.data);
        setCollectedContent(message.data);
        setEditedTitle(message.data.content.title);
        setEditedContent(message.data.content.content);
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [])

  return (
    <>
      <div>
        <div className="flex justify-between items-center p-2.5 relative">
          <h1 className="m-0 text-lg">小红书AI工具助手</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-transparent border border-gray-300 rounded-full w-[30px] h-[30px] cursor-pointer flex items-center justify-center"
            title="设置"
          >
            ⚙️
          </button>
        </div>

        {/* 标签页切换 */}
        <div className="flex border-b border-gray-300 bg-surface">
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2.5 px-5 border-0 cursor-pointer ${
              activeTab === 'content'
                ? 'text-primary border-b-2 border-blue-600 font-bold'
                : 'bg-transparent font-normal'
            }`}
          >
            📝 内容编辑
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2.5 px-5 border-0 cursor-pointer ${
              activeTab === 'chat'
                ? 'text-primary border-b-2 border-blue-600 font-bold'
                : 'bg-transparent font-normal'
            }`}
          >
            💬 AI助手
          </button>
        </div>

        {/* 标签页内容 */}
        <div className={`${activeTab === 'chat' ? 'p-0' : 'p-2.5'}`}>
          {activeTab === 'content' && (
            <div>
              {/* 内容收集和编辑区域 */}
              {collectedContent && (
                <div className="content-section">
                  <h2>收集到的内容</h2>
                  <div className="content-info">
                    <p>
                      <strong>时间:</strong>{' '}
                      {new Date(collectedContent.timestamp).toLocaleString()}
                    </p>
                    <p>
                      <strong>页面:</strong> {collectedContent.url}
                    </p>
                  </div>

                  {/* 图片展示 */}
                  {collectedContent.content.images.length > 0 && (
                    <div className="images-section">
                      <h3>图片 ({collectedContent.content.images.length}张)</h3>
                      <div className="images-grid">
                        {collectedContent.content.images.map((src, index) => (
                          <img
                            key={index}
                            src={src}
                            alt={`图片${index + 1}`}
                            className="w-20 h-20 object-cover m-0.5"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 标题编辑 */}
                  <div className="title-section">
                    <h3>标题</h3>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full p-2 mb-2.5"
                        placeholder="输入标题..."
                      />
                    ) : (
                      <div className="content-display">
                        <p>{collectedContent.content.title || '暂无标题'}</p>
                      </div>
                    )}
                  </div>

                  {/* 内容编辑 */}
                  <div className="content-edit-section">
                    <h3>内容</h3>
                    {isEditing ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full h-50 p-2 mb-2.5"
                        placeholder="输入内容..."
                      />
                    ) : (
                      <div className="content-display">
                        <pre className="whitespace-pre-wrap break-words">
                          {collectedContent.content.content || '暂无内容'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="action-buttons">
                    {isEditing ? (
                      <>
                        <button
                          onClick={applyEditedContent}
                          className="bg-green-500 text-white m-1.5 px-4 py-2 rounded cursor-pointer border-none"
                        >
                          应用到页面
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="bg-red-500 text-white m-1.5 px-4 py-2 rounded cursor-pointer border-none"
                        >
                          取消编辑
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startEditing}
                        className="bg-blue-600 text-white m-1.5 px-4 py-2 rounded cursor-pointer border-none"
                      >
                        开始编辑
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!collectedContent && (
                <div className="no-content">
                  <p>点击页面上的【AI】按钮收集内容</p>
                </div>
              )}

              <div className="card">
                <p>AI标签点击次数: {messages.length}</p>
                <div>
                  <button
                    onClick={() =>
                      sendMessageToContent('Hello from Sidepanel!')
                    }
                  >
                    发送测试消息
                  </button>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="messages-section">
                  <h2>AI标签点击记录</h2>
                  <div className="messages-list">
                    {messages.map((msg, index) => (
                      <div key={index} className="message-item">
                        <p>
                          <strong>时间:</strong>{' '}
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                        <p>
                          <strong>元素:</strong> {msg.element}
                        </p>
                        <p>
                          <strong>页面:</strong> {msg.url}
                        </p>
                        <hr />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatInterface collectedContent={collectedContent?.content} />
          )}
        </div>

        {/* 设置面板覆盖层 */}
        {showSettings && (
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg max-h-[80vh] overflow-auto">
              <SettingsPanel onClose={() => setShowSettings(false)} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App
