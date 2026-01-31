"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, CheckCircle, XCircle } from "lucide-react";
import ChatMessage from "./ChatMessage";
import QuickActions from "./QuickActions";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface PendingAction {
  actionType: string;
  description: string;
  params: Record<string, unknown>;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  onConfirmAction: (action: PendingAction) => Promise<void>;
  onCancelAction: () => void;
  isLoading: boolean;
  pendingAction: PendingAction | null;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  isLoading,
  pendingAction,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingAction]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");
    await onSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = async (query: string) => {
    await onSendMessage(query);
  };

  const handleConfirm = async () => {
    if (pendingAction) {
      await onConfirmAction(pendingAction);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              SDA Assistant
            </h2>
            <p className="text-gray-400 max-w-md mb-2">
              I can help you find information and perform actions like:
            </p>
            <ul className="text-gray-400 text-sm mb-6 space-y-1">
              <li>Query participant plans, vacancies, and payments</li>
              <li>Move participants between dwellings</li>
              <li>Create and update maintenance requests</li>
              <li>Record payments</li>
            </ul>
            <QuickActions onAction={handleQuickAction} disabled={isLoading} />
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}

            {/* Pending Action Confirmation */}
            {pendingAction && !isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col gap-3 max-w-[80%]">
                  <div className="px-4 py-3 bg-orange-900/30 border border-orange-600/50 rounded-2xl rounded-bl-sm">
                    <p className="text-sm text-orange-200 font-medium mb-2">
                      Action requires confirmation
                    </p>
                    <p className="text-sm text-gray-300">
                      {pendingAction.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm
                    </button>
                    <button
                      onClick={onCancelAction}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        {messages.length > 0 && !pendingAction && (
          <div className="mb-3">
            <QuickActions onAction={handleQuickAction} disabled={isLoading} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingAction
                ? "Confirm or cancel the pending action above..."
                : "Ask a question or give a command..."
            }
            disabled={isLoading || !!pendingAction}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !!pendingAction}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
