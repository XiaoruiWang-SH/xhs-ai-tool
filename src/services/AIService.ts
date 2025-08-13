import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { type ChatMessage, type MessageSource } from './messageTypes';
import type { AIConfig } from '../components/SettingsPanel';
import type {
  ResponseCreateParamsBase,
  FunctionTool,
} from 'openai/resources/responses/responses.mjs';
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletion,
} from 'openai/resources/chat/completions.mjs';

// API message format for OpenAI/Claude
export interface APIMessage {
  role: 'system' | 'user' | 'assistant';
  content: any[];
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

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    if (config.apiKey) {
      this.initializeClient();
    } else {
      throw new Error('请设置⚙️您的AI大模型和api key');
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
      } else if (this.config.provider === 'chatgpt') {
        // Default to OpenAI
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true,
        });
        console.log('OpenAI client initialized');
      } else if (this.config.provider === 'qwen') {
        // Default to OpenAI
        this.openai = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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
    } else if (this.config.provider === 'chatgpt') {
      return this.openaiChatCompletion(messages, msgSource);
    } else if (this.config.provider === 'qwen') {
      return this.qwenChatCompletion(messages, msgSource);
    }
    return Promise.reject(new Error('Unsupported AI provider'));
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

    try {
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Claude消息格式
      const claudeMessages: Anthropic.MessageParam[] = conversationMessages.map(
        (msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      );

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

    // 定义Tools来强制Claude返回JSON格式
    const tools: FunctionTool[] = [
      {
        type: 'function',
        strict: true,
        name: 'generate_xhs_content',
        description: '生成小红书内容，包括标题和内容',
        parameters: {
          type: 'object',
          additionalProperties: false, // 必须显式禁止额外字段
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
          required: ['title', 'content'], // 建议加 required 提升稳定性
        },
      },
      {
        type: 'function',
        strict: true,
        name: 'generate_xhs_comment',
        description: '生成小红书笔记评论',
        parameters: {
          type: 'object',
          additionalProperties: false, // 必须显式禁止额外字段
          properties: {
            content: {
              type: 'string',
              maxLength: 100,
              description:
                '生成的小红书笔记评论，可包含表情符号，不超过100个字符',
            },
          },
          required: ['content'],
        },
      },
    ];

    try {
      const schema =
        msgSource === 'post' ? XHS_CONTENT_SCHEMA : XHS_COMMENT_SCHEMA;
      const schemaName = msgSource === 'post' ? 'xhs_content' : 'xhs_comment';
      const schemaDescription =
        msgSource === 'post' ? '小红书内容生成格式' : '小红书评论生成格式';
      const targetToolName =
        msgSource === 'comment'
          ? 'generate_xhs_comment'
          : 'generate_xhs_content';

      const response = await this.openai.responses.create({
        model: 'gpt-5', // 你现在的模型名
        // 强制文本产出（不需要工具时建议加上，避免无文本输出）
        // 注意：Responses API 里，input 是消息数组（role + content parts）
        // 如果你的 APIMessage 已经是正确结构就直接传；否则请在这里做适配
        input: messages,
        reasoning: { effort: 'low' },
        instructions:
          msgSource === 'post' ? postSystemPrompt : commentSystemPrompt,
        tools: tools,
        tool_choice: {
          type: 'function',
          name: targetToolName,
        },
      });

      if (
        !response.output ||
        !Array.isArray(response.output) ||
        response.output.length === 0
      ) {
        throw new Error('Invalid response from chatgpt API');
      }

      // 查找tool_use内容
      const contentItem = response.output.find(
        (content) => content.type === 'function_call'
      );

      if (
        contentItem &&
        contentItem.name === targetToolName &&
        contentItem.arguments
      ) {
        let toolInput = {};
        try {
          toolInput = JSON.parse(contentItem.arguments) as {
            title: string;
            content: string;
          };
        } catch (error) {
          console.error('OpenAI API parse failed:', error);
        }

        // 验证tool输入是否符合我们的schema
        if (validateContentResponse(toolInput, msgSource)) {
          return {
            content: JSON.stringify(toolInput),
          };
        } else {
          throw new Error('Tool input validation failed');
        }
      }
      return { content: '' };
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      return this.handleAPIError(error, 'OpenAI');
    }
  }

  private async qwenChatCompletion(
    messages: APIMessage[],
    msgSource: MessageSource
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI client not initialized. Please check your API key.'
      );
    }

    // 定义Tools来强制OpenAI返回JSON格式
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'generate_xhs_content',
          description: '生成小红书内容，包括标题和内容',
          strict: true,
          parameters: {
            type: 'object',
            additionalProperties: false,
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
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'generate_xhs_comment',
          description: '生成小红书笔记评论',
          strict: true,
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              content: {
                type: 'string',
                maxLength: 100,
                description:
                  '生成的小红书笔记评论，可包含表情符号，不超过100个字符',
              },
            },
            required: ['content'],
          },
        },
      },
    ];

    try {
      const schema =
        msgSource === 'post' ? XHS_CONTENT_SCHEMA : XHS_COMMENT_SCHEMA;
      const schemaName = msgSource === 'post' ? 'xhs_content' : 'xhs_comment';
      const schemaDescription =
        msgSource === 'post' ? '小红书内容生成格式' : '小红书评论生成格式';
      const targetToolName =
        msgSource === 'comment'
          ? 'generate_xhs_comment'
          : 'generate_xhs_content';

      const postInstructions = `你是一个专业的小红书内容创作专家。请根据用户提供的信息和图片，生成符合小红书风格的标题和内容。

输出要求：严格按照JSON格式，包含title和content两个字符串字段。

创作规则：
1. 标题：吸引人、有点击欲望，不超过20个字符
2. 内容：真实有用、亲切自然，适当使用表情符号和话题标签
3. 语言风格：符合小红书用户喜好`;

      const commentInstructions = `你是一个专业的小红书评论帮手。请根据用户提供的笔记内容和图片，生成一条简短的、有趣的评论。

输出要求：严格按照JSON格式，包含content一个字符串字段。

评论规则：
1. 语气：真诚自然、友好亲切，符合小红书社区氛围
2. 长度：控制在100字以内，适当使用表情符号`;

      messages.unshift({
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              msgSource === 'comment' ? commentInstructions : postInstructions,
          },
        ],
      });

      const response = (await this.openai.chat.completions.create({
        model: 'qwen-vl-plus', // 你现在的模型名
        // 强制文本产出（不需要工具时建议加上，避免无文本输出）
        // 注意：Responses API 里，input 是消息数组（role + content parts）
        // 如果你的 APIMessage 已经是正确结构就直接传；否则请在这里做适配
        messages: messages,
        enable_thinking: false,
        response_format: {
          type: 'json_object',
        },
      } as ChatCompletionCreateParamsBase)) as ChatCompletion;

      if (response.choices[0].message.content) {
        return { content: response.choices[0].message.content };
      }
      return { content: '' };
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
  aiConfig: AIConfig
): APIMessage[] {
  if (aiConfig.provider === 'claude') {
    return buildClaudeChatMessages(data);
  } else if (aiConfig.provider === 'chatgpt') {
    return buildChatgptChatMessages(data);
  } else if (aiConfig.provider === 'qwen') {
    return buildQwenChatMessages(data);
  }
  return buildChatgptChatMessages(data);
}

function buildClaudeChatMessages(data: ChatMessage[]): APIMessage[] {
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

function buildChatgptChatMessages(data: ChatMessage[]): APIMessage[] {
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
          return {
            type: 'input_image',
            image_url: img,
          };
        });
        content.push(...imageObjects);
      }

      // Add user text content
      const textContent = {
        type: 'input_text',
        text: msg.userMessage.content,
      };
      content.push(textContent);
    } else if (msg.type === 'collected' && msg.collectedData) {
      const imgs = msg.collectedData.images || [];
      if (imgs.length > 0) {
        const imageObjects = imgs.map((img) => {
          return {
            type: 'input_image',
            image_url: img,
          };
        });
        content.push(...imageObjects);
      }
      const contentObjTitle = {
        type: 'input_text',
        text: `小红书文案标题: ${msg.collectedData.title}`,
      };
      content.push(contentObjTitle);
      const contentObjContent = {
        type: 'input_text',
        text: `小红书文案内容: ${msg.collectedData.content}`,
      };
      content.push(contentObjContent);
    } else if (msg.type === 'result' && msg.generatedPostData) {
      const aiContentObjTitle = {
        type: 'output_text',
        text: `AI生成的小红书文案标题: ${msg.generatedPostData.title}`,
      };
      content.push(aiContentObjTitle);
      const aiContentObjContent = {
        type: 'output_text',
        text: `AI生成的小红书文案内容: ${msg.generatedPostData.content}`,
      };
      content.push(aiContentObjContent);
    } else if (msg.type === 'result' && msg.generatedCommentData) {
      const aiContentObjComment = {
        type: 'output_text',
        text: `AI生成的小红书评论内容: ${msg.generatedCommentData.content}`,
      };
      content.push(aiContentObjComment);
    } else {
      let contentObj = {};
      if (msg.sender === 'user') {
        contentObj = {
          type: 'input_text',
          text: msg.content || '',
        };
      } else {
        contentObj = {
          type: 'output_text',
          text: msg.content || '',
        };
      }

      content.push(contentObj);
    }

    messages.push({
      role,
      content: content,
    });
  });

  return messages;
}

function buildQwenChatMessages(data: ChatMessage[]): APIMessage[] {
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
          return {
            type: 'image_url',
            image_url: img,
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
          return {
            type: 'image_url',
            image_url: img,
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
      let contentObj = {};
      if (msg.sender === 'user') {
        contentObj = {
          type: 'text',
          text: msg.content || '',
        };
      } else {
        contentObj = {
          type: 'text',
          text: msg.content || '',
        };
      }

      content.push(contentObj);
    }

    messages.push({
      role,
      content: content,
    });
  });
  return messages;
}

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

// 小红书内容生成的系统提示词
const postSystemPrompt = `你是一个专业的小红书内容创作专家，擅长创作吸引人的标题和内容。

请根据用户提供的图片和内容以及要求，生成符合小红书风格的标题和正文内容。

要求：
1. 标题要吸引人，有点击欲望，不超过20个字符
2. 内容要有价值，可读性强，符合小红书用户喜好
3. 适当使用表情符号和话题标签（#标签#）
4. 语言风格要亲切自然，贴近用户`;

// 小红书评论生成的系统提示词
const commentSystemPrompt = `你是一个专业的小红书评论帮手，擅长生成有趣、有价值的评论内容。

请根据用户提供的笔记图片和内容以及要求，生成一条简短的评论。

要求：
1. 评论要真诚自然，符合小红书社区氛围
2. 适当使用表情符号，让评论更生动
3. 字数控制在100字以内
`;

/** 安全 JSON 解析：字符串→对象；对象原样返回；失败返回 null */
function safeParseJSON<T = any>(val: unknown): T | null {
  if (val == null) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  if (typeof val === 'object') return val as T;
  return null;
}

/** 从 Responses 返回里提取指定工具的 arguments（兼容多种返回形态） */
function extractToolArgs(resp: any, toolName: string): any | null {
  // A) 常见：message.tool_calls[*].arguments
  if (Array.isArray(resp?.output)) {
    for (const item of resp.output) {
      if (item?.type === 'message') {
        if (Array.isArray(item.tool_calls)) {
          for (const tc of item.tool_calls) {
            if (tc?.name === toolName && tc?.arguments != null) {
              const parsed = safeParseJSON(tc.arguments);
              if (parsed) return parsed;
            }
          }
        }
        // B) 有些实现把 tool 调用放在 content 分片里
        if (Array.isArray(item.content)) {
          for (const part of item.content) {
            const t = String(part?.type || '');
            if (
              (t === 'tool_use' || t === 'tool' || t === 'tool_call') &&
              part?.name === toolName
            ) {
              const args = part?.input ?? part?.arguments;
              const parsed = safeParseJSON(args);
              if (parsed) return parsed;
            }
          }
        }
      }
      // C) 独立的 tool_call item（不在 message 内）
      const t = String(item?.type || '');
      if (t.includes('tool') && item?.name === toolName) {
        const args = item?.input ?? item?.arguments;
        const parsed = safeParseJSON(args);
        if (parsed) return parsed;
      }
    }
  }

  // D) 某些 SDK 会提供已解析对象
  if (resp?.output_parsed) return resp.output_parsed;

  return null;
}
