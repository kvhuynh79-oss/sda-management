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
  const [lastClassifiedDoc, setLastClassifiedDoc] = useState<{
    fileBase64: string;
    mediaType: string;
    fileName: string;
    documentType: string;
    expiryDate?: string;
  } | null>(null);

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
  const classifyDocument = useAction(api.aiDocuments.classifyDocument);
  const saveClassification = useMutation(api.aiDocuments.saveClassificationToConversation);
  const fileDocument = useAction(api.aiDocuments.fileDocumentToProperty);

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

    // Check if this is a "file to [property]" command
    const fileToMatch = content.toLowerCase().match(/^file\s+(?:this\s+)?(?:document\s+)?to\s+(.+)$/i);

    if (fileToMatch && lastClassifiedDoc) {
      const propertyName = fileToMatch[1].trim();

      try {
        const result = await fileDocument({
          fileBase64: lastClassifiedDoc.fileBase64,
          mediaType: lastClassifiedDoc.mediaType,
          fileName: lastClassifiedDoc.fileName,
          propertyName,
          documentType: lastClassifiedDoc.documentType as "ndis_plan" | "service_agreement" | "lease" | "insurance" | "compliance" | "other",
          expiryDate: lastClassifiedDoc.expiryDate,
          userId,
        });

        const responseContent = result.success
          ? `✅ ${result.message}`
          : `❌ ${result.message}`;

        const assistantMessage: Message = {
          role: "assistant",
          content: responseContent,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Save to conversation
        await saveClassification({
          conversationId: activeConversationId,
          userId,
          userMessage: content,
          assistantResponse: responseContent,
        });

        // Clear the classified doc if successful
        if (result.success) {
          setLastClassifiedDoc(null);
        }
      } catch (error) {
        console.error("Error filing document:", error);
        const errorMessage: Message = {
          role: "assistant",
          content: "Sorry, I encountered an error filing the document. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Check if user is trying to file without a document
    if (fileToMatch && !lastClassifiedDoc) {
      const assistantMessage: Message = {
        role: "assistant",
        content: "I don't have a document to file. Please upload a document first using the 📎 button, then tell me which property to file it to.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

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

  const handleFileUpload = async (file: File) => {
    if (!userId) return;

    const userMessageContent = `📄 Analyzing document: **${file.name}**`;

    // Add user message showing the file being uploaded
    const userMessage: Message = {
      role: "user",
      content: userMessageContent,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // Determine media type
      let mediaType = file.type;
      if (file.type === "application/pdf") {
        mediaType = "application/pdf";
      } else if (file.type.startsWith("image/")) {
        mediaType = file.type;
      }

      // Call the classify document action
      const result = await classifyDocument({
        fileBase64: base64,
        mediaType,
        fileName: file.name,
      });

      // Store document info for potential filing
      const docType = result.documentType === "accommodation_agreement" ? "other" :
                      result.documentType === "csv_claims" ? "other" :
                      result.documentType;
      setLastClassifiedDoc({
        fileBase64: base64,
        mediaType,
        fileName: file.name,
        documentType: docType,
        expiryDate: result.extractedExpiry || undefined,
      });

      // Format the response
      const docTypeLabels: Record<string, string> = {
        ndis_plan: "NDIS Plan",
        accommodation_agreement: "Accommodation Agreement",
        service_agreement: "Service Agreement",
        lease: "Lease Agreement",
        insurance: "Insurance Certificate",
        compliance: "Compliance Certificate",
        csv_claims: "CSV Claims File",
        other: "Other Document",
      };

      const categoryLabels: Record<string, string> = {
        participant: "Participant",
        property: "Property",
        dwelling: "Dwelling",
        owner: "Owner",
      };

      let responseContent = `### Document Analysis Results\n\n`;
      responseContent += `**Document Type:** ${docTypeLabels[result.documentType] || result.documentType}\n`;
      responseContent += `**Category:** ${categoryLabels[result.suggestedCategory] || result.suggestedCategory}\n`;
      responseContent += `**Confidence:** ${Math.round(result.confidence * 100)}%\n\n`;
      responseContent += `**Summary:** ${result.summary}\n`;

      if (result.extractedExpiry) {
        responseContent += `\n**Expiry Date:** ${result.extractedExpiry}`;
      }

      // Add filing instructions
      responseContent += `\n\n---\n`;
      responseContent += `📁 **To file this document**, type: "file to [property name]" (e.g., "file to Tregear")\n\n`;

      if (result.documentType === "accommodation_agreement") {
        responseContent += `💡 **Tip:** This appears to be an Accommodation Agreement. You can upload it again and I can extract participant details, RRC amounts, and bank information to help with onboarding.`;
      } else if (result.documentType === "ndis_plan") {
        responseContent += `💡 **Tip:** This appears to be an NDIS Plan. I found the plan details above. You may want to update the participant's plan information in the system.`;
      } else if (result.documentType === "compliance" || result.documentType === "insurance") {
        responseContent += `💡 **Tip:** Consider adding this document to the Documents section and setting up an expiry alert.`;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: responseContent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save to conversation
      const newConversationId = await saveClassification({
        conversationId: activeConversationId,
        userId,
        userMessage: userMessageContent,
        assistantResponse: responseContent,
      });

      if (!activeConversationId && newConversationId) {
        setActiveConversationId(newConversationId as Id<"aiConversations">);
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I encountered an error analyzing the document. Please make sure it's a clear image or PDF and try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            pendingAction={pendingAction}
          />
        </div>
      </div>
    </div>
  );
}
