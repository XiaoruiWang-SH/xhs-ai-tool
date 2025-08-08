import React, { useState, useEffect, useRef } from 'react';

// Message Types according to design spec
export type MessageType = 'user' | 'ai' | 'system' | 'collected';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  showApplyButton?: boolean;
  isApplying?: boolean;
}

export interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

interface CollectedContentMessage extends Omit<ChatMessage, 'content'> {
  type: 'collected';
  collectedData: CollectedContent;
}

interface ChatInterfaceProps {
  collectedContent?: CollectedContent;
}

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

// Collected Content Message Component
const CollectedContentMessage: React.FC<{
  collectedData: CollectedContent;
  timestamp: Date;
}> = ({ collectedData, timestamp }) => {
  const handleGenerateIdeas = () => {
    console.log('Generate ideas clicked');
    // TODO: Implement generate ideas functionality
  };

  const handleViewFullContent = () => {
    console.log('View full content clicked');
    // TODO: Implement view full content functionality
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
                <span className="text-caption text-neutral-700">
                  Images ({collectedData.images.length})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {collectedData.images.slice(0, 3).map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Collected image ${index + 1}`}
                    className="w-full h-16 object-cover rounded border-neutral-300"
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
                <span className="text-caption text-neutral-700">Title:</span>
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
                <span className="text-caption text-neutral-700">Content:</span>
              </div>
              <p className="text-sm text-neutral-900 ml-6 line-clamp-3">
                {collectedData.content.substring(0, 150)}
                {collectedData.content.length > 150 ? '...' : ''}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleGenerateIdeas}
              className="flex items-center gap-1 px-3 py-1.5 text-caption text-xhs-red border-xhs-red rounded hover:bg-xhs-red-light transition-colors"
            >
              <span>✨</span>
              <span>Generate Ideas</span>
            </button>
            <button
              onClick={handleViewFullContent}
              className="flex items-center gap-1 px-3 py-1.5 text-caption text-neutral-700 border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
            >
              <span>📋</span>
              <span>View Full Content</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Regular Message Component
const MessageBubble: React.FC<{
  message: ChatMessage;
  onApply?: (messageId: string) => void;
}> = ({ message, onApply }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="text-center my-4">
        <span className="text-caption text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

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

          {/* Apply button for AI messages */}
          {!isUser && message.showApplyButton && (
            <div className="mt-3">
              <ApplyButton
                onClick={() => onApply?.(message.id)}
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
      <div className="flex items-end gap-3">
        {/* Attachment button */}
        <button
          className="flex items-center justify-center w-8 h-8 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
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
            className="w-full text-sm border-neutral-300 rounded-lg px-3 py-2 resize-none focus:border-xhs-red focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
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
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  collectedContent,
}) => {
  const [messages, setMessages] = useState<
    (ChatMessage | CollectedContentMessage)[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle collected content - auto-populate when received
  useEffect(() => {
    if (collectedContent) {
      const collectedMessage: CollectedContentMessage = {
        id: `collected-${Date.now()}`,
        type: 'collected',
        sender: 'system',
        timestamp: new Date(),
        collectedData: collectedContent,
      };

      const aiResponseMessage: ChatMessage = {
        id: `ai-response-${Date.now()}`,
        type: 'ai',
        sender: 'ai',
        content:
          "I've collected your content! I can help:\n• Improve the title\n• Add engaging hashtags\n• Enhance description\n\nWhat would you like me to focus on?",
        timestamp: new Date(),
        showApplyButton: true,
        isApplying: false,
      };

      setMessages([collectedMessage]);
    }
  }, [collectedContent]);

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

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        sender: 'ai',
        content: `I understand you want to: "${messageContent}"\n\nHere's my suggestion for your Xiaohongshu post:\n\n✨ Enhanced content with engaging elements\n📱 Optimized for mobile viewing\n🎯 Targeted hashtags included\n\nWould you like me to apply these improvements to your page?`,
        timestamp: new Date(),
        showApplyButton: true,
        isApplying: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleApplyMessage = async (messageId: string) => {
    console.log('Applying message:', messageId);

    // Update message to show loading state
    setMessages((prev) =>
      prev.map((msg) =>
        'id' in msg && msg.id === messageId ? { ...msg, isApplying: true } : msg
      )
    );

    try {
      // Send message to content script to apply content
      const response = await chrome.runtime.sendMessage({
        action: 'applyContentToPage',
        data: {
          messageId,
          // You can extract the actual content from the message here
        },
      });

      if (response.success) {
        // Add success message
        const successMessage: ChatMessage = {
          id: `success-${Date.now()}`,
          type: 'system',
          sender: 'system',
          content: '✅ Content successfully applied to page!',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error(response.error || 'Failed to apply content');
      }
    } catch (error) {
      console.error('Failed to apply content:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        sender: 'system',
        content: '❌ Failed to apply content. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Reset loading state
      setMessages((prev) =>
        prev.map((msg) =>
          'id' in msg && msg.id === messageId
            ? { ...msg, isApplying: false }
            : msg
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50">
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

        {messages.map((message) => {
          if (message.type === 'collected') {
            const collectedMsg = message as CollectedContentMessage;
            return (
              <CollectedContentMessage
                key={message.id}
                collectedData={collectedMsg.collectedData}
                timestamp={collectedMsg.timestamp}
              />
            );
          } else {
            const chatMsg = message as ChatMessage;
            return (
              <MessageBubble
                key={chatMsg.id}
                message={chatMsg}
                onApply={handleApplyMessage}
              />
            );
          }
        })}

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
