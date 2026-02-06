"use client";

import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface Conversation {
  _id: Id<"aiConversations">;
  title?: string;
  updatedAt: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
}

interface ConversationsListProps {
  conversations: Conversation[];
  activeConversationId?: Id<"aiConversations">;
  onSelectConversation: (id: Id<"aiConversations">) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: Id<"aiConversations">) => void;
}

export default function ConversationsList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationsListProps) {
  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNewConversation}
        className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mb-4"
      >
        <Plus className="w-5 h-5" />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-1">
        {conversations.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">
            No conversations yet
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv._id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeConversationId === conv._id
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
              onClick={() => onSelectConversation(conv._id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  {conv.title || "New conversation"}
                </p>
                <p className="text-xs text-gray-400">{formatDate(conv.updatedAt)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConversation(conv._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
