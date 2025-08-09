import { createContext, useContext } from 'react';
import type { ChatMessage, MessageAction } from './messageTypes';

export const MessagesContext = createContext<ChatMessage[]>([]);
export const MessagesDispatchContext = createContext<React.Dispatch<MessageAction> | null>(null);

export function useMessages() {
  return useContext(MessagesContext);
}

export function useMessagesDispatch() {
  return useContext(MessagesDispatchContext);
}