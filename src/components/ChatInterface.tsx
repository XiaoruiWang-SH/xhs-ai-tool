import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import {
  AIService,
  buildChatMessages,
  validateContentResponse,
} from '../services/AIService';
import { useMessages, useMessagesDispatch } from '../services/messageHooks';
import type {
  ChatMessage,
  CollectedContent,
  MessageSource,
  UserMessage,
} from '../services/messageTypes';
import { batchCompressImages } from '../utils/imageUtils';
import { useAIConfig } from '../services/aiConfigHooks';
import aiAutoIcon from '../assets/aiAuto_icon.svg';
import xhsCommentImg from '../assets/xhs-comment.png';
import xhsPostImg from '../assets/xhs-post.png';

// Apply Button Component
const ApplyButton: React.FC<{
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  text?: string;
  loadingText?: string;
}> = ({
  onClick,
  isLoading = false,
  className = '',
  text = '📋 应用到页面',
  loadingText = '应用中...',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`bg-xhs-red hover:bg-xhs-red-hover text-white px-4 py-2 rounded-full text-caption font-medium border-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:transform hover:-translate-y-0.5 shadow-md hover:shadow-lg ${className}`}
    >
      {isLoading ? loadingText : text}
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
      className={`bg-white border-2 border-neutral-200 hover:border-xhs-red text-neutral-600 hover:text-xhs-red px-4 py-2 rounded-full text-caption font-medium disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 hover:transform hover:-translate-y-0.5 shadow-sm hover:shadow-md ${className}`}
    >
      {isLoading ? '重新生成中...' : '🔄 重新生成'}
    </button>
  );
};

// Collected Content Message Component
const CollectedContentMessageForPost: React.FC<{
  collectedData: CollectedContent;
  timestamp: Date;
  onCommandClickForPost?: (command: string) => void;
}> = ({ collectedData, timestamp, onCommandClickForPost }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
    onCommandClickForPost?.(command);
  };

  return (
    <div className="mb-4 max-w-full">
      <div
        className={`rounded-lg p-4 border bg-xhs-red-light border-chrome-border shadow-sm transition-all duration-700 transform ${
          isVisible
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-8 opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🤖</span>
          <span className="text-caption font-medium text-neutral-500">
            来自小红书的内容
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
              <div className="flex justify-start items-center gap-2 mb-2">
                <span className="text-sm">📸</span>
                <span className="text-caption font-semibold text-neutral-700">
                  图片 ({collectedData.images.length})
                </span>
              </div>
              <div className="flex flex-wrap justify-start items-center gap-2">
                {collectedData.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Collected image ${index + 1}`}
                    className="w-[38px] h-[38px] object-cover rounded border-neutral-300"
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
                  className={`flex items-center gap-2 px-3 py-1 text-caption border-[0.5px] rounded-lg transition-colors ${cmd.color}`}
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

// Collected Content Message Component for Comment
const CollectedContentMessageForComment: React.FC<{
  collectedData: CollectedContent;
  timestamp: Date;
  onCommandClickForComment?: (command: string) => void;
}> = ({ collectedData, timestamp, onCommandClickForComment }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Common commands for comment generation
  const commonCommands = [
    {
      id: 'generate-comment',
      icon: '💬',
      label: '生成评论',
      command: '请基于这篇笔记的图片和内容生成一条评论',
      color: 'text-xhs-red border-xhs-red hover:bg-xhs-red-light',
    },
    {
      id: 'ask-question',
      icon: '❓',
      label: '提问互动',
      command: '请基于这篇笔记的图片和内容生成提问式的评论，促进与博主的互动',
      color: 'text-blue-600 border-blue-600 hover:bg-blue-50',
    },
    {
      id: 'praise-comment',
      icon: '👏',
      label: '夸赞评论',
      command: '请基于这篇笔记的图片和内容生成一条夸赞评论',
      color: 'text-purple-600 border-purple-600 hover:bg-purple-50',
    },
    {
      id: 'emoji-comment',
      icon: '😊',
      label: '表情评论',
      command: '请基于这篇笔记的图片和内容生成一条带有很多表情的评论',
      color: 'text-teal-600 border-teal-600 hover:bg-teal-50',
    },
  ];

  const handleCommandClick = (command: string) => {
    onCommandClickForComment?.(command);
  };

  return (
    <div className="mb-4 max-w-full">
      <div
        className={`rounded-lg p-4 border bg-blue-50 border-chrome-border shadow-sm transition-all duration-700 transform ${
          isVisible
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-8 opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🤖</span>
          <span className="text-caption font-medium text-neutral-500">
            来自小红书的内容
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
              <div className="flex justify-start items-center gap-2 mb-2">
                <span className="text-sm">📸</span>
                <span className="text-caption font-semibold text-neutral-700">
                  图片 ({collectedData.images.length})
                </span>
              </div>
              <div className="flex flex-wrap justify-start items-center gap-2">
                {collectedData.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Collected image ${index + 1}`}
                    className="w-[38px] h-[38px] object-cover rounded border-neutral-300"
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
              快速评论生成
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {commonCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleCommandClick(cmd.command)}
                  className={`flex items-center gap-2 px-3 py-1 text-caption border-[0.5px] rounded-lg transition-colors ${cmd.color}`}
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
              💡 如有其他评论要求，请直接在下方输入框输入
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Result Display Component - Enhanced Xiaohongshu Style
const AIResultDisplay: React.FC<{
  message: ChatMessage;
  onApply?: (messageId: string) => void;
  onRegenerate?: () => void;
  isLoading?: boolean;
}> = ({ message, onApply, onRegenerate, isLoading = false }) => {
  if (
    message.type !== 'result' ||
    (!message.generatedPostData && !message.generatedCommentData)
  ) {
    return null;
  }

  return (
    <div className="flex mb-6 justify-start">
      <div className="max-w-[300px] w-full">
        <div className={`flex items-center mb-1 flex-row`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
            🤖
          </div>
          <span className="text-micro text-neutral-500">小红书 AI 帮手</span>
          <span className="text-micro text-neutral-500 ml-auto">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Content Card with Xiaohongshu styling */}
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden">
          <div className="p-4">
            {/* Title Section - Only for post */}
            {message.messageSource === 'post' && message.generatedPostData && (
              <div className="mb-4">
                <div className="flex items-center gap-1 mb-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-yellow-600 text-sm">📝</span>
                  </div>
                  <span className="text-caption font-semibold text-neutral-700">
                    标题:
                  </span>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl py-1 px-3 border border-yellow-200">
                  <p className="text-neutral-900 font-medium text-sm leading-relaxed">
                    {message.generatedPostData.title}
                  </p>
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="mb-5">
              <div className="flex items-center gap-1 mb-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    message.messageSource === 'comment'
                      ? 'bg-green-100'
                      : 'bg-blue-100'
                  }`}
                >
                  <span
                    className={`text-sm ${
                      message.messageSource === 'comment'
                        ? 'text-green-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {message.messageSource === 'comment' ? '💬' : '📖'}
                  </span>
                </div>
                <span className="text-caption font-semibold text-neutral-700">
                  {message.messageSource === 'comment' ? '评论:' : '内容:'}
                </span>
              </div>
              <div
                className={`rounded-xl py-1 px-3 ${
                  message.messageSource === 'comment'
                    ? 'bg-gradient-to-r from-green-50 to-teal-50 border border-green-200'
                    : 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
                }`}
              >
                <div className="text-neutral-900 text-sm leading-relaxed whitespace-pre-wrap">
                  {message.messageSource === 'post'
                    ? message.generatedPostData?.content
                    : message.generatedCommentData?.content}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-around items-center">
              <ApplyButton
                onClick={() => onApply?.(message.id)}
                isLoading={isLoading}
                text={
                  message.messageSource === 'comment'
                    ? '💬 应用评论'
                    : '📋 应用文案'
                }
                loadingText={
                  message.messageSource === 'comment'
                    ? '应用评论中...'
                    : '应用文案中...'
                }
              />
              <RegenerateButton
                onClick={() => onRegenerate?.()}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Bottom accent */}
          {/* <div className="h-0.5 bg-gradient-to-r from-transparent via-xhs-red to-transparent opacity-30"></div> */}
        </div>
      </div>
    </div>
  );
};

const Introduction = ({ message }: { message: ChatMessage }) => {
  return (
    <div className={`flex mb-4 justify-start`}>
      <div className="max-w-[300px] w-full">
        {/* Avatar and sender */}
        <div className={`flex items-center gap-2 mb-1 flex-row`}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
            🤖
          </div>
          <span className="text-micro text-neutral-600 font-medium">
            小红书 AI 帮手
          </span>
          <span className="text-micro text-neutral-500 ml-auto">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Welcome Message Card */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl p-4 shadow-lg border border-blue-100">
          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="text-base font-semibold text-neutral-800 mb-1">
              你好！👋 欢迎使用小红书AI帮手
            </h3>
            <p className="text-xs text-neutral-600">
              专业的创作工具，让你的小红书内容更出色
            </p>
          </div>

          {/* Core Features */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-1">
              🎯 核心功能
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">
                  📝
                </span>
                <span className="text-neutral-700 text-xs">
                  智能生成小红书文案和标题
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs">
                  💬
                </span>
                <span className="text-neutral-700 text-xs">
                  创作高互动性评论内容
                </span>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-1">
              💡 使用方法
            </h4>

            {/* Method 1 */}
            <div className="mb-4 p-3 bg-white rounded-xl border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-xhs-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  点击一键生成按钮
                </span>
              </div>
              <p className="text-xs text-neutral-600 mb-2 ml-8">
                在小红书页面找到
                <img
                  className="inline mx-1 w-10 h-4"
                  src={aiAutoIcon}
                  alt="AI按钮"
                />
                按钮并点击
              </p>

              {/* Example Images */}
              <div className="ml-8 space-y-2">
                <div className="relative">
                  <p className="text-xs text-neutral-500 mb-1">
                    📝 笔记创作页面：
                  </p>
                  <div className="relative bg-neutral-50 rounded-lg overflow-hidden border-[0.5px]">
                    <img
                      src={xhsPostImg}
                      alt="笔记页面示例"
                      className="w-full h-auto"
                    />
                  </div>
                </div>

                <div className="relative">
                  <p className="text-xs text-neutral-500 mb-1">💬 评论页面：</p>
                  <div className="relative bg-neutral-50 rounded-lg overflow-hidden border-[0.5px]">
                    <img
                      src={xhsCommentImg}
                      alt="评论页面示例"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Method 2 */}
            <div className="p-3 bg-white rounded-xl border border-neutral-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  直接对话创作
                </span>
              </div>
              <p className="text-xs text-neutral-600 ml-8">
                在下方输入框直接告诉我需求，如：
                <br />
                <span className="italic text-neutral-500">
                  "帮我写个美食探店文案"
                </span>
              </p>
            </div>
          </div>

          {/* AI Configuration Section */}
          {/* <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-1">
              ⚙️ AI配置说明
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs mt-0.5">
                  🤖
                </span>
                <div>
                  <p className="text-xs text-neutral-700 font-medium">
                    选择模型
                  </p>
                  <p className="text-xs text-neutral-600">
                    支持ChatGPT, Claude, Gemeni, 通义千问, Kimi
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs mt-0.5">
                  🔑
                </span>
                <div>
                  <p className="text-xs text-neutral-700 font-medium">
                    设置API Key
                  </p>
                  <p className="text-xs text-neutral-600">
                    点击右上角设置按钮配置API密钥
                  </p>
                </div>
              </div>
            </div>
          </div> */}

          {/* Call to Action */}
          <div className="text-center pt-3 border-t border-neutral-200">
            <p className="text-sm text-neutral-600 mb-2">
              ✨ 准备好开始创作了吗？
            </p>
            <p className="text-xs text-neutral-500">
              上传图片或描述你的想法，让我帮你打造爆款内容！
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
  onCommandClick?: (command: string, messageSource: MessageSource) => void;
}> = ({ message, onApply, onCommandClick }) => {
  const msgSource = message.messageSource || 'post';
  // Handle regenerate click with a specific regenerate prompt
  const handleRegenerateClick = () => {
    if (!onCommandClick) return;

    // Create a specific regenerate prompt that requests a different version
    const regeneratePrompt = `请基于之前的要求重新生成一个不同的版本。要求：
1. 提供与之前不同的创意角度和表达方式
2. 保持相同的主题和核心信息

请生成一个全新的、有创意的版本。`;

    onCommandClick(regeneratePrompt, msgSource);
  };

  if (message.type === 'introduction') {
    return <Introduction message={message} />;
  }

  if (
    message.type === 'collected' &&
    message.messageSource === 'post' &&
    message.collectedData
  ) {
    // Handle collected content for generate post
    return (
      <CollectedContentMessageForPost
        collectedData={message.collectedData}
        timestamp={message.timestamp}
        onCommandClickForPost={(command) => {
          if (!onCommandClick) return;
          // Pass the command with the message source
          onCommandClick(command, 'post');
        }}
      />
    );
  }

  // Handle collected content for generate comment
  if (
    message.type === 'collected' &&
    message.messageSource === 'comment' &&
    message.collectedData
  ) {
    return (
      <CollectedContentMessageForComment
        collectedData={message.collectedData}
        timestamp={message.timestamp}
        onCommandClickForComment={(command) => {
          if (!onCommandClick) return;
          // Pass the command with the message source
          onCommandClick(command, 'comment');
        }}
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
  if (message.type === 'result') {
    return (
      <AIResultDisplay
        message={message}
        onApply={onApply}
        onRegenerate={handleRegenerateClick}
      />
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
          {/* 显示用户上传的图片 */}
          {isUser &&
            message.userMessage?.images &&
            message.userMessage.images.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {message.userMessage.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`User upload ${index + 1}`}
                      className="w-[38px] h-[38px] object-cover rounded border-[0.5px] border-xhs-red-light"
                    />
                  ))}
                </div>
              </div>
            )}

          <div className="text-sm whitespace-pre-wrap break-words">
            {isUser ? message.userMessage?.content : message.content}
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
  onSendMessage: (userMessage: UserMessage) => void;
  disabled?: boolean;
}> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理图片上传
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const newImages = await batchCompressImages(Array.from(files));
      setUploadedImages((prev) => [...prev, ...newImages]);
    } catch (error) {
      console.error('图片上传失败:', error);
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 移除图片
  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (message.trim() && !disabled) {
      const userMessage: UserMessage = {
        content: message.trim(),
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      };
      onSendMessage(userMessage);
      setMessage('');
      setUploadedImages([]);
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
      {/* 上传的图片预览区域 */}
      {uploadedImages.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-10 h-10 object-cover rounded border border-neutral-200"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-1">
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* 图片上传按钮 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center justify-center w-8 h-8 text-base text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors disabled:opacity-50 border border-neutral-200"
          title="Upload images"
        >
          📷
        </button>

        {/* Message input */}
        <div className="flex-1 flex items-center">
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
          disabled={
            (!message.trim() && uploadedImages.length === 0) || disabled
          }
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
  const aiConfig = useAIConfig();

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
        const aiService = new AIService(aiConfig);
        const infoMessages = messages.filter(
          (msg) => msg.type !== 'introduction'
        );
        const chatMessages = buildChatMessages(infoMessages, aiConfig);
        const lastMsg = messages[messages.length - 1];
        const msgSource: MessageSource = lastMsg.messageSource || 'post';
        const response = await aiService.chatCompletion(
          chatMessages,
          msgSource
        );

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
          if (validateContentResponse(parsedResponse, msgSource)) {
            // Generated content response with structured data
            aiMessage = {
              id: `ai-${Date.now()}`,
              type: 'result',
              messageSource: msgSource,
              sender: 'assistant',
              timestamp: new Date(),
              ...(msgSource === 'post'
                ? {
                    generatedPostData: {
                      title: parsedResponse.title || '',
                      content: parsedResponse.content,
                    },
                  }
                : {
                    generatedCommentData: {
                      content: parsedResponse.content,
                    },
                  }),
            };
          } else {
            // 详细的验证错误信息
            const errors = [];
            if (msgSource === 'post' && !parsedResponse.title) {
              errors.push('缺少title字段');
            }
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
            type: 'add',
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
            type: 'add',
            data: errorMessage,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messageDispatch, aiConfig]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (userMessageData: UserMessage) => {
    if (isLoading) return;

    // Get message source from userMessage or default to last message's source
    const msgSource =
      userMessageData.msgSource ||
      (messages.length > 0
        ? messages[messages.length - 1].messageSource
        : undefined) ||
      'post';

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      sender: 'user',
      messageSource: msgSource,
      timestamp: new Date(),
      userMessage: userMessageData,
    };

    if (messageDispatch) {
      messageDispatch({
        type: 'add',
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
      (!targetMessage.generatedPostData && !targetMessage.generatedCommentData)
    ) {
      console.error('Message not found or no generated data:', messageId);
      return;
    }

    try {
      // Prepare data based on message source
      const isPostMessage = targetMessage.messageSource === 'post';
      const actionType = isPostMessage
        ? 'applyContentToPage'
        : 'applyCommentToPage';

      const data =
        isPostMessage && targetMessage.generatedPostData
          ? {
              messageId,
              title: targetMessage.generatedPostData.title,
              content: targetMessage.generatedPostData.content,
              timestamp: new Date().toISOString(),
            }
          : {
              messageId,
              content: targetMessage.generatedCommentData?.content,
              timestamp: new Date().toISOString(),
            };

      // Send complete content data to be applied
      const response = await chrome.runtime.sendMessage({
        action: actionType,
        data,
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
            type: 'add',
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
          type: 'add',
          data: errorMessage,
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-y-scroll">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onApply={handleApplyMessage}
            onCommandClick={(command: string, msgSource: MessageSource) =>
              handleSendMessage({ content: command, msgSource: msgSource })
            }
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
