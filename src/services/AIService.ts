import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { type ChatMessage, type MessageSource } from './messageTypes';

// API message format for OpenAI/Claude
export interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: any[];
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
  type: 'object',
  properties: {
    title: {
      type: 'string',
      maxLength: 20,
      description:
        '优化后的标题，要吸引人、有点击欲望，符合小红书风格，不超过20个字符',
    },
    content: {
      type: 'string',
      maxLength: 1000,
      description:
        '优化后的完整内容，可包含表情符号、话题标签、换行等，不超过1000个字符',
    },
  },
  required: ['title', 'content'],
  additionalProperties: false,
};

// 定义小红书评论的JSON Schema
export const XHS_COMMENT_SCHEMA = {
  type: 'object',
  properties: {
    content: {
      type: 'string',
      maxLength: 100,
      description:
        '生成的评论内容，要有趣、有价值，可包含表情符号，不超过100个字符',
    },
  },
  required: ['content'],
  additionalProperties: false,
};

// 验证响应是否符合Schema
export function validateContentResponse(
  response: any,
  msgSource: MessageSource = 'post'
): response is { title?: string; content: string } {
  if (
    typeof response !== 'object' ||
    response === null ||
    typeof response.content !== 'string' ||
    response.content.length > 10000
  ) {
    return false;
  }

  // For post messages, title is required
  if (msgSource === 'post') {
    return typeof response.title === 'string' && response.title.length <= 100;
  }

  // For comment messages, title is optional
  return true;
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

  public async chatCompletion(
    messages: APIMessage[],
    msgSource: MessageSource
  ): Promise<AIResponse> {
    if (this.config.provider === 'claude') {
      return this.claudeChatCompletion(messages, msgSource);
    } else {
      return this.openaiChatCompletion(messages, msgSource);
    }
  }

  public getProvider(): string {
    return this.config.provider;
  }

  private async claudeChatCompletion(
    messages: APIMessage[],
    msgSource: MessageSource
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error(
        'Claude client not initialized. Please check your API key.'
      );
    }

    try {
      // 小红书内容生成的系统提示词
      const postSystemPrompt = `你是一个专业的小红书内容创作专家，擅长创作吸引人的标题和内容。

请根据用户提供的内容和要求，生成符合小红书风格的标题和正文内容。

要求：
1. 标题要吸引人，有点击欲望，不超过20个字符
2. 内容要有价值，可读性强，符合小红书用户喜好
3. 适当使用表情符号和话题标签（#标签#）
4. 语言风格要亲切自然，贴近用户
5. 内容要真实有用，避免夸大宣传
`;

      // 小红书评论生成的系统提示词
      const commentSystemPrompt = `你是一个专业的小红书评论助手，擅长生成有趣、有价值的评论内容。

请根据用户提供的笔记内容，生成一条简短的评论。

要求：
1. 评论要真诚自然，避免过于商业化
2. 可以是赞美、提问、分享经验或表达共鸣
3. 适当使用表情符号，让评论更生动
4. 字数控制在100字以内
5. 语气要友好亲切，符合小红书社区氛围
6. 避免刷屏式的无意义评论

评论类型可以是：
- 赞美型：夸赞内容的优点和价值
- 互动型：提出有趣的问题促进讨论
- 经验型：分享相关的个人经验或建议  
- 共鸣型：表达对内容的认同和共鸣
- 幽默型：以轻松幽默的方式回应
`;

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
                description:
                  '优化后的标题，要吸引人、有点击欲望，符合小红书风格，不超过20个字符',
              },
              content: {
                type: 'string',
                maxLength: 1000,
                description:
                  '优化后的完整内容，可包含表情符号、话题标签、换行等，不超过1000个字符',
              },
            },
            required: ['title', 'content'],
            additionalProperties: false,
          },
        },
        {
          name: 'generate_xhs_comment',
          description: '生成小红书笔记评论',
          input_schema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                maxLength: 1000,
                description:
                  '生成的小红书笔记评论，可包含表情符号，不超过100个字符',
              },
            },
            required: ['content'],
            additionalProperties: false,
          },
        },
      ];

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system:
          msgSource === 'comment' ? commentSystemPrompt : postSystemPrompt,
        messages: claudeMessages,
        tools: tools,
        tool_choice: {
          type: 'tool',
          name:
            msgSource === 'comment'
              ? 'generate_xhs_comment'
              : 'generate_xhs_content',
        },
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
        const toolInput = toolUseContent.input as {
          title: string;
          content: string;
        };

        // 验证tool输入是否符合我们的schema
        if (validateContentResponse(toolInput, msgSource)) {
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
    messages: APIMessage[],
    msgSource: MessageSource
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI client not initialized. Please check your API key.'
      );
    }

    try {
      // 为支持的模型启用structured outputs
      const modelSupportsStructured = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
      ].some((model) => this.config.model?.includes(model));

      const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams =
        {
          model: this.config.model || 'gpt-3.5-turbo',
          messages:
            messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          max_tokens: 1000,
          temperature: 0.7,
        };

      // 如果模型支持，添加response_format
      if (modelSupportsStructured) {
        const schema =
          msgSource === 'post' ? XHS_CONTENT_SCHEMA : XHS_COMMENT_SCHEMA;
        const schemaName = msgSource === 'post' ? 'xhs_content' : 'xhs_comment';
        const schemaDescription =
          msgSource === 'post' ? '小红书内容生成格式' : '小红书评论生成格式';

        completionParams.response_format = {
          type: 'json_schema',
          json_schema: {
            name: schemaName,
            description: schemaDescription,
            schema: schema,
            strict: true,
          },
        } as any;
      }

      const response = await this.openai.chat.completions.create(
        completionParams
      );

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
export function buildChatMessages(
  data: ChatMessage[],
  _provider: string = 'openai'
): APIMessage[] {
  const messages: APIMessage[] = [];

  // 添加完整的对话历史，只区分user和assistant
  const totalNumMsgs = data.length;
  const userfulMessages = data.filter((msg, index) => {
    if (
      totalNumMsgs > 6 &&
      index !== 0 &&
      index !== 1 &&
      index !== totalNumMsgs - 1 &&
      index !== totalNumMsgs - 2 &&
      index !== totalNumMsgs - 3
    )
      return false;
    return msg.sender === 'user' || msg.sender === 'assistant';
  });

  userfulMessages.forEach((msg) => {
    const role: 'user' | 'assistant' =
      msg.sender === 'user' ? 'user' : 'assistant';
    const content: any[] = [];

    // Handle user messages with uploaded images
    if (msg.sender === 'user' && msg.userMessage) {
      // Add user uploaded images
      if (msg.userMessage.images && msg.userMessage.images.length > 0) {
        const imageObjects = msg.userMessage.images.map((img) => {
          // 移除 data URL 前缀，只保留 base64 编码部分
          let base64Data = img;
          if (img.startsWith('data:')) {
            const commaIndex = img.indexOf(',');
            if (commaIndex !== -1) {
              base64Data = img.substring(commaIndex + 1);
            }
          }

          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Data,
            },
          };
        });
        content.push(...imageObjects);
      }

      // Add user text content
      const textContent = {
        type: 'text',
        text: msg.userMessage.content,
      };
      content.push(textContent);
    } else if (msg.type === 'collected' && msg.collectedData) {
      const imgs = msg.collectedData.images || [];
      if (imgs.length > 0) {
        const imageObjects = imgs.map((img) => {
          // 移除 data URL 前缀，只保留 base64 编码部分
          let base64Data = img;
          if (img.startsWith('data:')) {
            const commaIndex = img.indexOf(',');
            if (commaIndex !== -1) {
              base64Data = img.substring(commaIndex + 1);
            }
          }

          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Data,
            },
          };
        });
        content.push(...imageObjects);
      }
      const contentObjTitle = {
        type: 'text',
        text: `小红书文案标题: ${msg.collectedData.title}`,
      };
      content.push(contentObjTitle);
      const contentObjContent = {
        type: 'text',
        text: `小红书文案内容: ${msg.collectedData.content}`,
      };
      content.push(contentObjContent);
    } else if (msg.type === 'result' && msg.generatedPostData) {
      const aiContentObjTitle = {
        type: 'text',
        text: `AI生成的小红书文案标题: ${msg.generatedPostData.title}`,
      };
      content.push(aiContentObjTitle);
      const aiContentObjContent = {
        type: 'text',
        text: `AI生成的小红书文案内容: ${msg.generatedPostData.content}`,
      };
      content.push(aiContentObjContent);
    } else if (msg.type === 'result' && msg.generatedCommentData) {
      const aiContentObjComment = {
        type: 'text',
        text: `AI生成的小红书评论内容: ${msg.generatedCommentData.content}`,
      };
      content.push(aiContentObjComment);
    } else {
      const contentObj = {
        type: 'text',
        text: msg.content || '',
      };
      content.push(contentObj);
    }

    messages.push({
      role,
      content: content,
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
