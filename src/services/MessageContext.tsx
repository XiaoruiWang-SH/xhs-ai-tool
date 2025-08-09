import React, { useReducer } from 'react';
import { MessagesContext, MessagesDispatchContext } from './messageHooks';
import { messagesReducer, initialMessages } from './messageTypes';

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, dispatch] = useReducer(messagesReducer, initialMessages);

  return (
    <MessagesContext.Provider value={messages}>
      <MessagesDispatchContext.Provider value={dispatch}>
        {children}
      </MessagesDispatchContext.Provider>
    </MessagesContext.Provider>
  );
}
