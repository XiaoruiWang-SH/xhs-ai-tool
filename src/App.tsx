import { useState, useEffect } from 'react'
import './App.css'

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
    const messageListener = (message: any, sender: any, sendResponse: any) => {
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
        <h1>小红书AI工具助手</h1>
        
        {/* 内容收集和编辑区域 */}
        {collectedContent && (
          <div className="content-section">
            <h2>收集到的内容</h2>
            <div className="content-info">
              <p><strong>时间:</strong> {new Date(collectedContent.timestamp).toLocaleString()}</p>
              <p><strong>页面:</strong> {collectedContent.url}</p>
            </div>

            {/* 图片展示 */}
            {collectedContent.content.images.length > 0 && (
              <div className="images-section">
                <h3>图片 ({collectedContent.content.images.length}张)</h3>
                <div className="images-grid">
                  {collectedContent.content.images.map((src, index) => (
                    <img key={index} src={src} alt={`图片${index + 1}`} style={{width: '80px', height: '80px', objectFit: 'cover', margin: '2px'}} />
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
                  style={{width: '100%', padding: '8px', marginBottom: '10px'}}
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
                  style={{width: '100%', height: '200px', padding: '8px', marginBottom: '10px'}}
                  placeholder="输入内容..."
                />
              ) : (
                <div className="content-display">
                  <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                    {collectedContent.content.content || '暂无内容'}
                  </pre>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="action-buttons">
              {isEditing ? (
                <>
                  <button onClick={applyEditedContent} style={{backgroundColor: '#4CAF50', color: 'white', margin: '5px'}}>
                    应用到页面
                  </button>
                  <button onClick={() => setIsEditing(false)} style={{backgroundColor: '#f44336', color: 'white', margin: '5px'}}>
                    取消编辑
                  </button>
                </>
              ) : (
                <button onClick={startEditing} style={{backgroundColor: '#008CBA', color: 'white', margin: '5px'}}>
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
            <button onClick={() => sendMessageToContent('Hello from Sidepanel!')}>
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
                  <p><strong>时间:</strong> {new Date(msg.timestamp).toLocaleString()}</p>
                  <p><strong>元素:</strong> {msg.element}</p>
                  <p><strong>页面:</strong> {msg.url}</p>
                  <hr />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
