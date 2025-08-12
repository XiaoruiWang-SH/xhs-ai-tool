// Message Types according to design spec
export type MessageType =
  | 'user'
  | 'ai'
  | 'result'
  | 'collected'
  | 'introduction';
export type MessageSource = 'comment' | 'reply' | 'post';

export interface ChatMessage {
  id: string;
  type: MessageType;
  messageSource?: MessageSource;
  content?: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp: Date;
  showApplyButton?: boolean;
  isApplying?: boolean;
  // For collected content type
  collectedData?: CollectedContent;
  // For AI generated content
  generatedPostData?: AiGeneratedPostContent;
  generatedCommentData?: AiGeneratedCommentContent;
  // For user messages with images
  userMessage?: UserMessage;
}

export interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

export interface AiGeneratedPostContent {
  title: string;
  content: string;
}
export interface AiGeneratedCommentContent {
  content: string;
}

export interface UserMessage {
  content: string;
  images?: string[];
  msgSource?: MessageSource;
}

// Define action types
export type MessageAction =
  | { type: 'add'; data: ChatMessage }
  | { type: 'clearAdd'; data: ChatMessage }
  | { type: 'clear' };

export const initialMessages: ChatMessage[] = [
  {
    id: `system-${Date.now()}`,
    type: 'introduction',
    sender: 'assistant',
    messageSource: 'post',
    timestamp: new Date(Date.now()),
    content: '',
  },
];

export function messagesReducer(
  messages: ChatMessage[],
  action: MessageAction
) {
  switch (action.type) {
    case 'add': {
      return [...messages, action.data];
    }
    case 'clearAdd': {
      return [action.data];
    }
    case 'clear': {
      return [];
    }
    default: {
      throw Error('Unknown action: ' + (action as any).type);
    }
  }
}
