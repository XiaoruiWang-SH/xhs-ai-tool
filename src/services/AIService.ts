import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { type ChatMessage } from './messageTypes';

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

// 定义小红书内容的JSON Schema
export const XHS_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      maxLength: 20,
      description: "优化后的标题，要吸引人、有点击欲望，符合小红书风格，不超过20个字符"
    },
    content: {
      type: "string", 
      maxLength: 1000,
      description: "优化后的完整内容，可包含表情符号、话题标签、换行等，不超过1000个字符"
    }
  },
  required: ["title", "content"],
  additionalProperties: false
};

// 验证响应是否符合Schema
export function validateContentResponse(response: any): response is { title: string; content: string } {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.title === 'string' &&
    typeof response.content === 'string' &&
    response.title.length <= 20 &&
    response.content.length <= 1000
  );
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

  public getProvider(): string {
    return this.config.provider;
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

      // 定义Tools来强制Claude返回JSON格式
      const tools: Anthropic.Tool[] = [
        {
          name: 'generate_xhs_content',
          description: '生成小红书内容，包括标题和内容',
          input_schema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                maxLength: 20,
                description: '优化后的标题，要吸引人、有点击欲望，符合小红书风格，不超过20个字符'
              },
              content: {
                type: 'string',
                maxLength: 1000,
                description: '优化后的完整内容，可包含表情符号、话题标签、换行等，不超过1000个字符'
              }
            },
            required: ['title', 'content'],
            additionalProperties: false
          }
        }
      ];

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemMessage?.content || undefined,
        messages: claudeMessages,
        tools: tools,
        tool_choice: { type: 'tool', name: 'generate_xhs_content' }
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('Invalid response from Claude API');
      }

      // 查找tool_use内容
      const toolUseContent = response.content.find(
        (content) => content.type === 'tool_use'
      );
      
      if (toolUseContent && toolUseContent.type === 'tool_use') {
        // 直接返回tool的输入参数作为JSON内容
        const toolInput = toolUseContent.input as { title: string; content: string };
        
        // 验证tool输入是否符合我们的schema
        if (validateContentResponse(toolInput)) {
          return {
            content: JSON.stringify(toolInput),
            usage: response.usage,
          };
        } else {
          throw new Error('Tool input validation failed');
        }
      }

      // 如果没有tool_use，fallback到text内容
      const textContent = response.content.find(
        (content) => content.type === 'text'
      );
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text or tool_use content in Claude response');
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
      // 为支持的模型启用structured outputs
      const modelSupportsStructured = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'].some(
        model => this.config.model?.includes(model)
      );

      const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        max_tokens: 1000,
        temperature: 0.7,
      };

      // 如果模型支持，添加response_format
      if (modelSupportsStructured) {
        completionParams.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'xhs_content',
            description: '小红书内容生成格式',
            schema: XHS_CONTENT_SCHEMA,
            strict: true
          }
        } as any;
      }

      const response = await this.openai.chat.completions.create(completionParams);

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

// 构建聊天消息的辅助函数 - 根据不同AI提供商调整系统提示词
export function buildChatMessages(data: ChatMessage[], provider: string = 'openai'): APIMessage[] {
  const messages: APIMessage[] = [];

  // 根据提供商选择不同的系统提示词
  let systemPrompt: string;
  
  if (provider === 'claude') {
    // Claude使用Tools，系统提示词更简洁
    systemPrompt = `你是一个专业的小红书内容创作助手。你的任务是帮助用户创作吸引人的标题和内容。

你的能力包括:
1. 根据图片和内容生成吸引人的标题
2. 润色和优化现有文本
3. 提供创作建议和灵感
4. 符合小红书平台特色的内容创作

请使用提供的工具来生成结构化的内容。确保：
- 标题要吸引人、有点击欲望，符合小红书风格，不超过20个字符
- 内容要生动有趣，可包含表情符号、话题标签等，不超过1000个字符`;
  } else {
    // OpenAI使用JSON Schema约束输出格式
    systemPrompt = `你是一个专业的小红书内容创作助手。你的任务是帮助用户创作吸引人的标题和内容。

你的能力包括:
1. 根据图片和内容生成吸引人的标题
2. 润色和优化现有文本
3. 提供创作建议和灵感
4. 符合小红书平台特色的内容创作

【重要】你必须严格按照以下JSON Schema格式返回结果：

JSON Schema:
${JSON.stringify(XHS_CONTENT_SCHEMA, null, 2)}

格式要求：
1. 必须返回完全符合上述JSON Schema的有效JSON对象
2. title字段：优化后的标题，要吸引人、有点击欲望，符合小红书风格，严格不超过20个字符
3. content字段：优化后的完整内容，可包含表情符号、话题标签、换行等，严格不超过1000个字符
4. 不要使用markdown代码块包装（如\`\`\`json）
5. 不要添加任何解释文字，只返回纯JSON对象
6. 不要包含任何其他字段，只能有title和content

示例输出：
{"title": "一周瘦3斤神器！真香","content": "姐妹们，今天必须跟你们分享这个宝藏产品！用了一周真的效果超级明显：体重减轻3斤、腰围小了2cm、精神状态超好。推荐理由：天然成分更安心、使用方便不费时、性价比超高。#减肥分享 #瘦身心得 #健康生活 #小红书好物"}

请确保你的响应完全符合JSON Schema规范，系统会验证你的输出格式。`;
  }

  messages.push({
    role: 'system',
    content: systemPrompt,
  });

  // 添加完整的对话历史，只区分user和assistant
  const userfulMessages = data.filter(
    (msg) => msg.sender === 'user' || msg.sender === 'assistant'
  );

  userfulMessages.forEach((msg) => {
    const role: 'user' | 'assistant' =
      msg.sender === 'user' ? 'user' : 'assistant';
    let content = '';
    if (msg.type === 'collected' && msg.collectedData) {
      content = `标题：${msg.collectedData.title}\n内容：${msg.collectedData.content}`;
    } else if (msg.type === 'result' && msg.generatedData) {
      content = `标题：${msg.generatedData.title}\n内容：${msg.generatedData.content}`;
    } else {
      content = msg.content || '';
    }

    messages.push({
      role,
      content,
    });
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
