import { useState, useEffect } from 'react'
import './App.css'

interface AiTagClickData {
  timestamp: string;
  element: string;
  url: string;
}

function App() {
  const [count, setCount] = useState(0)
  const [messages, setMessages] = useState<AiTagClickData[]>([])

  useEffect(() => {
    // 监听来自background script的消息
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.action === 'aiTagClicked') {
        console.log('收到AI标签点击消息:', message.data);
        setMessages(prev => [...prev, message.data]);
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
        <div className="card">
          <p>AI标签点击次数: {messages.length}</p>
          <button onClick={() => setCount((count) => count + 1)}>
            计数器: {count}
          </button>
        </div>
        
        <div className="messages-section">
          <h2>AI标签点击记录</h2>
          {messages.length === 0 ? (
            <p>暂无点击记录</p>
          ) : (
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
          )}
        </div>
      </div>
    </>
  )
}

export default App
