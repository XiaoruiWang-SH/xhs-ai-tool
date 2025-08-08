import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AIService,
  buildChatMessages,
  getAIConfig,
} from '../services/openaiService.js';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'image';
}

interface CollectedContent {
  images: string[];
  title: string;
  content: string;
}

interface ChatInterfaceProps {
  collectedContent?: CollectedContent;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  collectedContent,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '01',
      content: 'Hello my friend',
      sender: 'ai',
      timestamp: new Date(Date.now()),
      type: 'text',
    },
    {
      id: '02',
      content: 'Hello my friend from user',
      sender: 'user',
      timestamp: new Date(Date.now()),
      type: 'text',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messageIdCounter = useRef(0);

  const MessageList = ({ messages }: { messages: ChatMessage[] }) => {
    const Message = ({ model }: { model: ChatMessage }) => {
      return (
        <div
          className={`flex ${
            model.sender === 'ai' ? 'justify-start' : 'justify-end'
          }`}
        >
          {model.content}
        </div>
      );
    };

    return (
      <>
        {messages.map((msg) => (
          <Message key={msg.id} model={msg} />
        ))}
      </>
    );
  };

  const MessageInput = () => {
    return (
      <div className="flex justify-between items-center">
        <input
          className="flex-11/12 border-[0.5px]"
          type="text"
          placeholder="请输入..."
        />
        <button
          className=" flex-1/12"
          onClick={() => {
            console.log('send a message');
            const newMsg: ChatMessage = {
              id: '03',
              content: 'Hello my friend from user',
              sender: 'user',
              timestamp: new Date(Date.now()),
              type: 'text',
            };
            setMessages((prevMessage) => [...prevMessage, newMsg]);
            setTimeout(() => {
              const newAiMsg: ChatMessage = {
                id: '04',
                content: 'Hello my friend from ai',
                sender: 'ai',
                timestamp: new Date(Date.now()),
                type: 'text',
              };
              setMessages((prevMessage) => [...prevMessage, newAiMsg]);
            }, 1000);
          }}
        >
          Send
        </button>
      </div>
    );
  };

  return (
    <div className="h-[500px] overflow-scroll">
      <div className="flex flex-col ">
        <MessageList messages={messages} />
      </div>
      <div className="absolute bottom-[10px] w-screen">
        <MessageInput />
      </div>
    </div>

    // <ChatContainer className="relative h-[500px]">
    //   <MessageList>
    //     {messages.map((msg) => (
    //       <Message
    //         key={msg.id}
    //         model={{
    //           message: msg.content,
    //           sender: msg.sender === 'user' ? 'You' : 'AI Assistant',
    //           direction: msg.sender === 'user' ? 'outgoing' : 'incoming',
    //           position: 'single',
    //         }}
    //       />
    //     ))}
    //     {isTyping && <TypingIndicator content="AI正在思考..." />}
    //   </MessageList>
    //   <MessageInput
    //     className="w-screen absolute bottom-0 flex justify-between items-center"
    //     placeholder="输入消息或选择上方预设功能..."
    //     onSend={() => {
    //       console.log('send message');
    //     }}
    //     attachButton={false}
    //     sendButton={true}
    //   />
    // </ChatContainer>
  );
};
