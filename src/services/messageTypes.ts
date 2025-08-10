// Message Types according to design spec
export type MessageType = 'user' | 'ai' | 'result' | 'collected';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content?: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  showApplyButton?: boolean;
  isApplying?: boolean;
  // For collected content type
  collectedData?: CollectedContent;
  // For AI generated content
  generatedData?: AiGeneratedContent;
}

export interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

export interface AiGeneratedContent {
  title: string;
  content: string;
}

// Define action types
export type MessageAction =
  | { type: 'added'; data: ChatMessage }
  | { type: 'clear' };

export const initialMessages: ChatMessage[] = [
  {
    id: `system-${Date.now()}`,
    type: 'ai',
    sender: 'assistant',
    timestamp: new Date(Date.now()),
    content: `你好！👋 我是小红书AI文案助手，专门帮你创作优质内容！

🎯 我的核心能力：
• **生成文案** - 打造吸引人的标题和正文
• **生成评论** - 创作互动性强的评论内容  
• **生成回复** - 智能回复他人评论

💡 使用方式：
• 点击小红书页面【✨一键生成】按钮，我会自动获取当前页面内容并生成文案
• 或者直接告诉我你的需求，比如"帮我写个美食探店文案"

现在就开始创作吧！有什么想法尽管告诉我～`,
  },
];

export function messagesReducer(
  messages: ChatMessage[],
  action: MessageAction
) {
  switch (action.type) {
    case 'added': {
      return [...messages, action.data];
    }
    case 'clear': {
      return [];
    }
    default: {
      throw Error('Unknown action: ' + (action as any).type);
    }
  }
}
