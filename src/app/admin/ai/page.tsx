"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "../../../components/Header";
import ChatInterface from "../../../components/ai/ChatInterface";
import ConversationsList from "../../../components/ai/ConversationsList";
import { Bot, Menu, X } from "lucide-react";

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

export default function AIAssistantPage() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<
    Id<"aiConversations"> | undefined
  >(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Login returns "id", not "_id"
      setUserId((user.id || user._id) as Id<"users">);
    }
  }, []);

  // Fetch conversations
  const conversations = useQuery(
    api.aiChatbot.getConversations,
    userId ? { userId } : "skip"
  );

  // Fetch active conversation
  const activeConversation = useQuery(
    api.aiChatbot.getConversation,
    activeConversationId ? { conversationId: activeConversationId } : "skip"
  );

  // Actions and mutations
  const processQuery = useAction(api.aiChatbot.processUserQuery);
  const executeAction = useAction(api.aiChatbot.executeAction);
  const deleteConversation = useMutation(api.aiChatbot.deleteConversation);

  // Update messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      setMessages(activeConversation.messages);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const handleSendMessage = async (content: string) => {
    if (!userId) return;

    // Add user message immediately for better UX
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setPendingAction(null);

    try {
      const result = await processQuery({
        conversationId: activeConversationId,
        userMessage: content,
        userId,
      });

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Check if there's a pending action
      if (result.pendingAction) {
        setPendingAction(result.pendingAction);
      }

      // Update active conversation ID if this was a new conversation
      if (!activeConversationId && result.conversationId) {
        setActiveConversationId(result.conversationId as Id<"aiConversations">);
      }
    } catch (error) {
      console.error("Error processing query:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action: PendingAction) => {
    if (!userId) return;

    setIsLoading(true);

    try {
      const result = await executeAction({
        conversationId: activeConversationId,
        actionType: action.actionType,
        params: action.params,
        userId,
      });

      // Add result message
      const resultMessage: Message = {
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, resultMessage]);

      // Update conversation ID if needed
      if (!activeConversationId && result.conversationId) {
        setActiveConversationId(result.conversationId as Id<"aiConversations">);
      }
    } catch (error) {
      console.error("Error executing action:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't complete that action. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    const cancelMessage: Message = {
      role: "assistant",
      content: "Action cancelled. Is there anything else I can help you with?",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  const handleNewConversation = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setPendingAction(null);
  };

  const handleSelectConversation = (id: Id<"aiConversations">) => {
    setActiveConversationId(id);
    setPendingAction(null);
  };

  const handleDeleteConversation = async (id: Id<"aiConversations">) => {
    await deleteConversation({ conversationId: id });
    if (activeConversationId === id) {
      handleNewConversation();
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header currentPage="ai" />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-gray-400">Please log in to use the AI Assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="ai" />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-4 left-4 z-50 p-3 bg-blue-600 rounded-full shadow-lg"
        >
          {sidebarOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative z-40 w-72 h-full bg-gray-800 border-r border-gray-700 p-4 transition-transform duration-300`}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">AI Assistant</h1>
              <p className="text-xs text-gray-400">Powered by Claude</p>
            </div>
          </div>

          <ConversationsList
            conversations={conversations || []}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onConfirmAction={handleConfirmAction}
            onCancelAction={handleCancelAction}
            isLoading={isLoading}
            pendingAction={pendingAction}
          />
        </div>
      </div>
    </div>
  );
}
