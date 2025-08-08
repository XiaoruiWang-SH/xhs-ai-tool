import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  type CollectedContent,
} from '../components/ChatInterface';

// API message format for OpenAI/Claude
export interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIResponse {
  content: string;
  usage?: OpenAI.CompletionUsage | Anthropic.Usage;
}

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    if (config.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    try {
      if (this.config.provider === 'claude') {
        this.anthropic = new Anthropic({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
        });
        console.log('Anthropic Claude client initialized');
      } else {
        // Default to OpenAI
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl || 'https://api.openai.com/v1',
          dangerouslyAllowBrowser: true,
        });
        console.log('OpenAI client initialized');
      }
    } catch (error) {
      console.error('Failed to initialize AI client:', error);
      throw new Error('AI client initialization failed');
    }
  }

  public async chatCompletion(messages: APIMessage[]): Promise<AIResponse> {
    if (this.config.provider === 'claude') {
      return this.claudeChatCompletion(messages);
    } else {
      return this.openaiChatCompletion(messages);
    }
  }

  private async claudeChatCompletion(
    messages: APIMessage[]
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error(
        'Claude client not initialized. Please check your API key.'
      );
    }

    try {
      // 转换消息格式 - Claude需要分离系统消息
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Claude消息格式
      const claudeMessages: Anthropic.MessageParam[] = conversationMessages.map(
        (msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      );
      // const msg = await anthropic.messages.create({
      //   model: 'claude-sonnet-4-20250514',
      //   max_tokens: 1024,
      //   messages: [{ role: 'user', content: 'Hello, Claude' }],
      // });
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemMessage?.content || undefined,
        messages: claudeMessages,
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('Invalid response from Claude API');
      }

      const textContent = response.content.find(
        (content) => content.type === 'text'
      );
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return {
        content: textContent.text,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Claude API call failed:', error);
      return this.handleAPIError(error, 'Claude');
    }
  }

  private async openaiChatCompletion(
    messages: APIMessage[]
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI client not initialized. Please check your API key.'
      );
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('Invalid response from OpenAI API');
      }

      return {
        content: choice.message.content || '',
        usage: response.usage || undefined,
      };
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      return this.handleAPIError(error, 'OpenAI');
    }
  }

  private handleAPIError(error: any, provider: string): never {
    // 更友好的错误处理
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error(`${provider} API密钥无效，请检查您的配置`);
      } else if (error.message.includes('429')) {
        throw new Error(`${provider} API请求频率过高，请稍后再试`);
      } else if (error.message.includes('403')) {
        throw new Error(`${provider} API权限不足，请检查您的账户状态`);
      } else if (error.message.includes('quota')) {
        throw new Error(`${provider} API配额已用完，请检查您的账户额度`);
      }
    }

    throw new Error(
      `${provider} 请求失败: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }

  public updateConfig(newConfig: AIConfig): void {
    this.config = newConfig;
    if (newConfig.apiKey) {
      // Reset both clients
      this.openai = null;
      this.anthropic = null;
      this.initializeClient();
    } else {
      this.openai = null;
      this.anthropic = null;
    }
  }

  public isConfigured(): boolean {
    if (this.config.provider === 'claude') {
      return !!this.config.apiKey && !!this.anthropic;
    } else {
      return !!this.config.apiKey && !!this.openai;
    }
  }
}

// 构建聊天消息的辅助函数
export function buildChatMessages(data: {
  message: string;
  conversationHistory?: Array<{
    sender: 'user' | 'ai';
    content: string;
  }>;
  context?: CollectedContent;
}): APIMessage[] {
  const messages: APIMessage[] = [];

  // 系统提示词
  let systemPrompt = `你是一个专业的小红书内容创作助手。你的任务是帮助用户创作吸引人的标题和内容。

你的能力包括:
1. 根据图片和内容生成吸引人的标题
2. 润色和优化现有文本
3. 提供创作建议和灵感
4. 符合小红书平台特色的内容创作

【重要】请严格按照以下JSON格式返回结果，不要包含任何其他文字、解释或markdown代码块：
{
  "title": "优化后的标题",
  "content": "优化后的内容"
}

格式要求：
- 必须返回有效的JSON对象，包含title和content两个字段
- title字段：优化后的标题，要吸引人、有点击欲望，符合小红书风格
- content字段：优化后的完整内容，可包含表情符号、话题标签、换行等
- 不要使用markdown代码块包装
- 不要添加任何解释文字，只返回纯JSON

示例输出：
{"title": "这款神器让我一周瘦了3斤！真的太好用了","content": "姐妹们，今天必须跟你们分享这个宝藏产品！用了一周真的效果超级明显：体重减轻3斤、腰围小了2cm、精神状态超好。推荐理由：天然成分更安心、使用方便不费时、性价比超高。#减肥分享 #瘦身心得 #健康生活 #小红书好物"}`;

  // 添加收集到的内容到系统提示中
  if (data.context) {
    systemPrompt += `\n\n当前页面收集到的内容:\n`;
    if (data.context.images && data.context.images.length > 0) {
      systemPrompt += `- 图片数量: ${data.context.images.length}张\n`;
    }
    if (data.context.title) {
      systemPrompt += `- 当前标题: ${data.context.title}\n`;
    }
    if (data.context.content) {
      systemPrompt += `- 当前内容: ${data.context.content}\n`;
    }
  }

  messages.push({
    role: 'system',
    content: systemPrompt,
  });

  // 添加对话历史
  if (data.conversationHistory && data.conversationHistory.length > 0) {
    data.conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    });
  }

  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: data.message,
  });

  return messages;
}

// 从Chrome存储获取AI配置
export async function getAIConfig(): Promise<AIConfig> {
  try {
    const result = await chrome.storage.sync.get(['aiConfig']);
    return (
      result.aiConfig || {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        baseUrl: 'https://api.openai.com/v1',
      }
    );
  } catch (error) {
    console.error('Failed to get AI config:', error);
    return {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      baseUrl: 'https://api.openai.com/v1',
    };
  }
}
