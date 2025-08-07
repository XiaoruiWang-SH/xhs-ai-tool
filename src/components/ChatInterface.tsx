import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from '@chatscope/chat-ui-kit-react';
import {
  AIService,
  buildChatMessages,
  getAIConfig,
} from '../services/openaiService.js';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'image';
}

interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

interface ChatInterfaceProps {
  collectedContent?: CollectedContent;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  collectedContent,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messageIdCounter = useRef(0);

  // 预设功能按钮
  const presetPrompts = [
    '根据收集的内容生成标题',
    '优化现有标题',
    '润色文本内容',
    '根据图片生成描述',
    '生成热门话题标题',
    '重写内容让它更吸引人',
  ];

  const generateMessageId = () => {
    return `msg_${messageIdCounter.current++}_${Date.now()}`;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        content: text,
        sender: 'user',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        // 直接处理AI请求，不通过service worker
        const config = await getAIConfig();
        if (!config.apiKey) {
          throw new Error('请先配置API密钥。点击设置按钮进行配置');
        }

        // 使用AI SDK (支持OpenAI和Claude)
        const aiService = new AIService(config);
        
        if (!aiService.isConfigured()) {
          throw new Error('AI服务配置失败，请检查API密钥');
        }

        // 构建聊天消息
        const chatMessages = buildChatMessages({
          message: text,
          context: collectedContent,
          conversationHistory: messages.slice(-5).map(msg => ({
            sender: msg.sender,
            content: msg.content
          }))
        });

        // 调用AI API
        const aiResponse = await aiService.chatCompletion(chatMessages);

        const aiMessage: ChatMessage = {
          id: generateMessageId(),
          content: aiResponse.content,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);

      } catch (error) {
        console.error('发送消息失败:', error);
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          content: `抱歉，发生了错误: ${
            error instanceof Error ? error.message : '未知错误'
          }`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
    },
    [collectedContent, messages]
  );

  const handlePresetClick = (prompt: string) => {
    sendMessage(prompt);
  };

  // 初始欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: generateMessageId(),
        content:
          '👋 你好！我是你的AI助手。我可以帮你:\n\n• 根据图片和内容生成标题\n• 润色和优化文本\n• 创作吸引人的内容\n• 提供写作建议\n\n选择下方的预设功能或直接输入你的需求吧！',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);

  return (
    <div className="h-full flex flex-col">
      {/* 预设功能按钮 */}
      <div className="p-2.5 border-b border-gray-300 flex flex-wrap gap-1.5">
        {presetPrompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => handlePresetClick(prompt)}
            className="py-1.5 px-2.5 border border-gray-300 rounded-2xl bg-surface hover:bg-primary-hover cursor-pointer text-xs transition-colors duration-200"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 收集内容概览 */}
      {collectedContent && (
        <div className="p-2.5 bg-surface border-b border-gray-300 text-xs text-primary">
          <div>📊 已收集内容:</div>
          <div>
            🖼️ 图片: {collectedContent.images.length}张 | 📝 标题:{' '}
            {collectedContent.title ? '✓' : '✗'} | 📄 内容:{' '}
            {collectedContent.content ? '✓' : '✗'}
          </div>
        </div>
      )}

      {/* 聊天界面 */}
      <div className="flex-1">
        <MainContainer>
          <ChatContainer>
            <MessageList>
              {messages.map((msg) => (
                <Message
                  key={msg.id}
                  model={{
                    message: msg.content,
                    sender: msg.sender === 'user' ? 'You' : 'AI Assistant',
                    direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
                    position: 'single',
                  }}
                />
              ))}
              {isTyping && <TypingIndicator content="AI正在思考..." />}
            </MessageList>
            <MessageInput
              placeholder="输入消息或选择上方预设功能..."
              onSend={sendMessage}
              attachButton={false}
              sendButton={true}
            />
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  );
};

