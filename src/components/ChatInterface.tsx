import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  AIService,
  buildChatMessages,
  getAIConfig,
  validateContentResponse,
} from '../services/AIService';
import { useMessages, useMessagesDispatch } from '../services/messageHooks';
import type { ChatMessage, CollectedContent } from '../services/messageTypes';

// Apply Button Component
const ApplyButton: React.FC<{
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}> = ({ onClick, isLoading = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`bg-xhs-red hover:bg-xhs-red-hover text-white px-4 py-2 rounded-md text-caption font-medium border-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:transform hover:-translate-y-0.5 ${className}`}
    >
      {isLoading ? '应用中...' : '📋 Apply to Page'}
    </button>
  );
};

// Regenerate Button Component
const RegenerateButton: React.FC<{
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}> = ({ onClick, isLoading = false, className = '' }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`bg-neutral-600 hover:bg-neutral-700 text-white px-4 py-2 rounded-md text-caption font-medium border-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:transform hover:-translate-y-0.5 ${className}`}
    >
      {isLoading ? '重新生成中...' : '🔄 Regenerate'}
    </button>
  );
};

// Collected Content Message Component
const CollectedContentMessage: React.FC<{
  collectedData: CollectedContent;
  timestamp: Date;
  onCommandClick?: (command: string) => void;
}> = ({ collectedData, timestamp, onCommandClick }) => {
  // Common commands for Xiaohongshu content creation
  const commonCommands = [
    {
      id: 'optimize-notes',
      icon: '🔥',
      label: '优化笔记',
      command:
        '请基于当前的标题和内容进行全面的优化，包括优化标题让它更吸引人、丰富内容细节、添加合适的表情符号和话题标签，让整篇笔记更符合小红书的风格和传播效果',
      color: 'text-xhs-red border-xhs-red hover:bg-xhs-red-light',
    },
    {
      id: 'enhance-content',
      icon: '📝',
      label: '丰富内容',
      command:
        '请帮我丰富这个内容，增加更多细节描述、使用心得和实用建议，让内容更有价值',
      color: 'text-green-600 border-green-600 hover:bg-green-50',
    },
    {
      id: 'improve-title',
      icon: '✨',
      label: '优化标题',
      command:
        '请帮我优化这个标题，让它更吸引人、更有点击欲望，符合小红书的风格',
      color: 'text-purple-600 border-purple-600 hover:bg-purple-50',
    },
    {
      id: 'add-hashtags',
      icon: '#️⃣',
      label: '生成话题标签',
      command:
        '请为这篇内容生成5-8个合适的小红书话题标签，包括热门标签和精准标签',
      color: 'text-blue-600 border-blue-600 hover:bg-blue-50',
    },
    {
      id: 'add-emoji',
      icon: '😊',
      label: '添加表情符号',
      command: '请在内容中适当添加表情符号，让文案更生动活泼，符合小红书的风格',
      color: 'text-orange-600 border-orange-600 hover:bg-orange-50',
    },
    {
      id: 'seo-optimize',
      icon: '🔍',
      label: 'SEO优化',
      command: '请优化这个内容的关键词分布，提高在小红书搜索中的曝光率',
      color: 'text-teal-600 border-teal-600 hover:bg-teal-50',
    },
  ];

  const handleCommandClick = (command: string) => {
    onCommandClick?.(command);
  };

  return (
    <div className="mb-4 max-w-full">
      <div className="rounded-lg p-4 border bg-xhs-red-light border-chrome-border shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🤖</span>
          <span className="text-caption font-medium text-neutral-700">
            Collected from webpage
          </span>
          <span className="text-micro text-neutral-500 ml-auto">
            {timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded border-neutral-300 p-3">
          {/* Images section */}
          {collectedData.images && collectedData.images.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📸</span>
                <span className="text-caption font-semibold text-neutral-700">
                  图片 ({collectedData.images.length})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {collectedData.images.slice(0, 3).map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Collected image ${index + 1}`}
                    className="w-[40px] h-[40px] object-cover rounded border-neutral-300"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Title section */}
          {collectedData.title && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📝</span>
                <span className="text-caption font-semibold text-neutral-700">
                  标题:
                </span>
              </div>
              <p className="text-sm text-neutral-900 ml-6">
                {collectedData.title}
              </p>
            </div>
          )}

          {/* Content section */}
          {collectedData.content && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📄</span>
                <span className="text-caption font-semibold text-neutral-700">
                  内容:
                </span>
              </div>
              <p className="text-sm text-neutral-900 ml-6 line-clamp-3">
                {collectedData.content.substring(0, 150)}
                {collectedData.content.length > 150 ? '...' : ''}
              </p>
            </div>
          )}

          {/* Quick Commands */}
          <div className="mt-4 pt-3 border-t border-neutral-200">
            <h4 className="text-caption font-medium text-neutral-700 mb-3">
              快速优化命令
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {commonCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleCommandClick(cmd.command)}
                  className={`flex items-center gap-2 px-3 py-1 text-caption border rounded-lg transition-colors ${cmd.color}`}
                >
                  <span className="text-sm">{cmd.icon}</span>
                  <span className="text-xs font-medium">{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Tip */}
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <p className="text-micro text-neutral-500 text-center">
              💡 如有其他要求，请直接在下方输入框输入
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Unified Message Component
const MessageBubble: React.FC<{
  message: ChatMessage;
  onApply?: (messageId: string) => void;
  onCommandClick?: (command: string) => void;
}> = ({ message, onApply, onCommandClick }) => {
  // Handle regenerate click with a specific regenerate prompt
  const handleRegenerateClick = () => {
    if (!onCommandClick) return;

    // Create a specific regenerate prompt that requests a different version
    const regeneratePrompt = `请基于之前的要求重新生成一个不同版本的标题和内容。要求：
1. 提供与之前不同的创意角度和表达方式
2. 保持相同的主题和核心信息

请生成一个全新的、有创意的版本。`;

    onCommandClick(regeneratePrompt);
  };

  // Handle collected content type
  if (message.type === 'collected' && message.collectedData) {
    return (
      <CollectedContentMessage
        collectedData={message.collectedData}
        timestamp={message.timestamp}
        onCommandClick={onCommandClick}
      />
    );
  }

  // Handle system messages
  if (message.sender === 'system') {
    return (
      <div className="text-center my-4">
        <span className="text-caption text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Handle AI generated content with JSON format
  if (message.type === 'result' && message.generatedData) {
    return (
      <div className="flex mb-4 justify-start">
        <div className="max-w-[280px]">
          {/* Avatar and sender */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
              🤖
            </div>
            <span className="text-micro text-neutral-500">AI Assistant</span>
            <span className="text-micro text-neutral-500 ml-auto">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>

          {/* Generated content card */}
          <div className="bg-white border-neutral-300 rounded-lg p-3 shadow-sm">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✨</span>
                <span className="text-caption font-medium text-neutral-700">
                  优化后的标题:
                </span>
              </div>
              <p className="text-sm text-neutral-900 font-medium">
                {message.generatedData.title}
              </p>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📝</span>
                <span className="text-caption font-medium text-neutral-700">
                  优化后的内容:
                </span>
              </div>
              <div className="text-sm text-neutral-900 whitespace-pre-wrap">
                {message.generatedData.content}
              </div>
            </div>

            {/* Action buttons */}
            {message.type === 'result' && (
              <div className="mt-3 flex gap-2">
                <ApplyButton onClick={() => onApply?.(message.id)} />
                <RegenerateButton onClick={handleRegenerateClick} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isUser = message.sender === 'user';

  // Handle regular text messages
  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[280px]">
        {/* Avatar and sender */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isUser ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
            {isUser ? '👤' : '🤖'}
          </div>
          <span className="text-micro text-neutral-500">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-micro text-neutral-500 ml-auto">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={`rounded-lg p-3 shadow-sm ${
            isUser ? 'bg-blue-500 text-white' : 'bg-white border-neutral-300'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Action buttons for AI messages */}
          {!isUser && message.showApplyButton && (
            <div className="mt-3 flex gap-2">
              <ApplyButton
                onClick={() => onApply?.(message.id)}
                isLoading={message.isApplying}
              />
              <RegenerateButton
                onClick={handleRegenerateClick}
                isLoading={message.isApplying}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Chat Input Component
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t-chrome-border bg-white p-4">
      <div className="flex justify-between items-center gap-1">
        {/* Attachment button */}
        <button
          className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
          title="Attach image"
        >
          📎
        </button>

        {/* Message input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={disabled}
            rows={1}
            className="w-full text-sm border-[0.5px] border-neutral-300 rounded-lg px-3 py-2 resize-none focus:border-xhs-red focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
            style={{ minHeight: '36px', maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="flex items-center justify-center w-8 h-8 text-white bg-xhs-red rounded hover:bg-xhs-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Send message"
        >
          <span className="text-sm">▶</span>
        </button>
      </div>
    </div>
  );
};

// Main ChatInterface Component
const ChatInterfaceComponent = () => {
  // Use external messages if provided, otherwise fall back to local state
  const messages = useMessages();
  const messageDispatch = useMessagesDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const requestAIResponse = useCallback(
    async (messages: ChatMessage[]) => {
      try {
        setIsLoading(true);
        const aiConfig = await getAIConfig();
        const aiService = new AIService(aiConfig);

        const chatMessages = buildChatMessages(
          messages,
          aiService.getProvider()
        );

        const response = await aiService.chatCompletion(chatMessages);

        // Parse response as JSON (should always be JSON now)
        let aiMessage: ChatMessage;
        try {
          // Clean the response content in case it has markdown code blocks or extra text
          let cleanedContent = response.content.trim();

          // Remove markdown code blocks if present
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent
              .replace(/^```json\s*/, '')
              .replace(/```\s*$/, '');
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent
              .replace(/^```\s*/, '')
              .replace(/```\s*$/, '');
          }

          const parsedResponse = JSON.parse(cleanedContent);

          // 使用JSON Schema验证响应格式
          if (validateContentResponse(parsedResponse)) {
            // Generated content response with structured data
            aiMessage = {
              id: `ai-${Date.now()}`,
              type: 'result',
              sender: 'assistant',
              timestamp: new Date(),
              generatedData: {
                title: parsedResponse.title,
                content: parsedResponse.content,
              },
            };
          } else {
            // 详细的验证错误信息
            const errors = [];
            if (!parsedResponse.title) errors.push('缺少title字段');
            if (!parsedResponse.content) errors.push('缺少content字段');
            if (parsedResponse.title && parsedResponse.title.length > 20)
              errors.push('标题超过20字符限制');
            if (parsedResponse.content && parsedResponse.content.length > 1000)
              errors.push('内容超过1000字符限制');

            throw new Error(`JSON Schema验证失败: ${errors.join(', ')}`);
          }
        } catch (parseError) {
          console.error('Failed to parse AI response as JSON:', parseError);
          console.log('Original response:', response.content);

          // Fallback: treat as text response and show error
          aiMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            sender: 'assistant',
            content: `AI返回格式错误，原始回复：\n${response.content}`,
            timestamp: new Date(),
          };
        }
        if (messageDispatch) {
          messageDispatch({
            type: 'added',
            data: aiMessage,
          });
        }
      } catch (error) {
        console.error('AI request failed:', error);

        // Add error message
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          type: 'ai',
          sender: 'system',
          content: `❌ AI请求失败: ${
            error instanceof Error ? error.message : '未知错误'
          }`,
          timestamp: new Date(),
        };

        if (messageDispatch) {
          messageDispatch({
            type: 'added',
            data: errorMessage,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messageDispatch]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageContent: string) => {
    if (isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      sender: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    if (messageDispatch) {
      messageDispatch({
        type: 'added',
        data: userMessage,
      });

      // Get the updated messages list and call AI response
      const updatedMessages = [...messages, userMessage];
      await requestAIResponse(updatedMessages);
    }
  };

  const handleApplyMessage = async (messageId: string) => {
    console.log('Applying message:', messageId);

    // Find the message with the generated data
    const targetMessage = messages.find((msg) => msg.id === messageId);
    if (
      !targetMessage ||
      targetMessage.type !== 'result' ||
      !targetMessage.generatedData
    ) {
      console.error('Message not found or no generated data:', messageId);
      return;
    }

    try {
      // Send complete content data to be applied
      const response = await chrome.runtime.sendMessage({
        action: 'applyContentToPage',
        data: {
          messageId,
          title: targetMessage.generatedData.title,
          content: targetMessage.generatedData.content,
          timestamp: new Date().toISOString(),
        },
      });

      if (response.success) {
        // Add success message
        const successMessage: ChatMessage = {
          id: `success-${Date.now()}`,
          type: 'ai',
          sender: 'system',
          content: '✅ Content successfully applied to page!',
          timestamp: new Date(),
        };
        if (messageDispatch) {
          messageDispatch({
            type: 'added',
            data: successMessage,
          });
        }
      } else {
        throw new Error(response.error || 'Failed to apply content');
      }
    } catch (error) {
      console.error('Failed to apply content:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        sender: 'system',
        content: '❌ Failed to apply content. Please try again.',
        timestamp: new Date(),
      };
      if (messageDispatch) {
        messageDispatch({
          type: 'added',
          data: errorMessage,
        });
      }
    }
  };

  // Clear chat history (in-memory only)
  const handleClearChat = () => {
    if (window.confirm('确定要清除所有聊天记录吗？')) {
      if (messageDispatch) {
        messageDispatch({ type: 'clear' });
      }
      console.log('Chat history cleared');
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div className="flex justify-end p-2 border-b border-neutral-200">
          <button
            onClick={handleClearChat}
            className="text-xs text-neutral-500 hover:text-neutral-700 px-2 py-1 rounded hover:bg-neutral-100 transition-colors"
            title="清除聊天记录"
          >
            🗑️ Clear Chat
          </button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-title text-neutral-900 mb-2">
              Welcome to Xiaohongshu AI
            </h3>
            <p className="text-sm text-neutral-700 mb-4">
              I'm here to help create engaging content for your posts.
            </p>
            <p className="text-caption text-neutral-500">
              Click the [AI] button on any Xiaohongshu page to collect content,
              or start a conversation here.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApply={handleApplyMessage}
            onCommandClick={handleSendMessage}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[280px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  🤖
                </div>
                <span className="text-micro text-neutral-500">
                  AI Assistant
                </span>
              </div>
              <div className="bg-white border-neutral-300 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">💭</div>
                  <span className="text-sm text-neutral-500">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
};

// Export memoized component
export const ChatInterface = memo(ChatInterfaceComponent);
