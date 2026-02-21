"use client";

import { User, Bot } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-teal-700" : "bg-purple-600"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? "bg-teal-700 text-white rounded-br-sm"
              : "bg-gray-700 text-gray-100 rounded-bl-sm"
          }`}
        >
          <div className="whitespace-pre-wrap text-sm">{content}</div>
        </div>
        <span className="text-xs text-gray-400 mt-1">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}
