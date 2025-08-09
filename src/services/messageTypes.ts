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

export const initialMessages: ChatMessage[] = [];

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

