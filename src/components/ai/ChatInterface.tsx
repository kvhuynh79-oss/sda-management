"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, CheckCircle, XCircle, Paperclip, FileText, X, Upload } from "lucide-react";
import ChatMessage from "./ChatMessage";
import QuickActions from "./QuickActions";
import { useConfirmDialog } from "../ui/ConfirmDialog";

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
  onFileUpload?: (file: File, instructions?: string) => Promise<void>;
  isLoading: boolean;
  pendingAction: PendingAction | null;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onConfirmAction,
  onCancelAction,
  onFileUpload,
  isLoading,
  pendingAction,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { alert: alertDialog } = useConfirmDialog();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await validateAndSetFile(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !onFileUpload) return;
    const instructions = input.trim() || undefined;
    await onFileUpload(selectedFile, instructions);
    setSelectedFile(null);
    setInput("");
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Shared file validation logic
  const validateAndSetFile = async (file: File): Promise<boolean> => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      await alertDialog('Please upload an image (PNG, JPG, WebP, GIF) or PDF file.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      await alertDialog('File size must be less than 10MB.');
      return false;
    }
    setSelectedFile(file);
    return true;
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (!onFileUpload || isLoading || pendingAction || selectedFile) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await validateAndSetFile(files[0]);
    }
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 relative"
      onDragEnter={onFileUpload ? handleDragEnter : undefined}
      onDragLeave={onFileUpload ? handleDragLeave : undefined}
      onDragOver={onFileUpload ? handleDragOver : undefined}
      onDrop={onFileUpload ? handleDrop : undefined}
    >
      {/* Drag Overlay */}
      {isDragging && onFileUpload && (
        <div className="absolute inset-0 z-50 bg-purple-900/90 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-400">
          <Upload className="w-16 h-16 text-purple-300 mb-4" />
          <p className="text-xl font-semibold text-white mb-2">Drop document here</p>
          <p className="text-sm text-purple-300">PNG, JPG, WebP, GIF, or PDF (max 10MB)</p>
        </div>
      )}

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
              <li>Upload and analyze documents (NDIS plans, agreements, etc.)</li>
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
        {/* Selected File Preview */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-2 p-3 bg-purple-900/30 border border-purple-600/50 rounded-lg">
            <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB • Add instructions below or click send to analyze
              </p>
            </div>
            <button
              onClick={clearSelectedFile}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf"
            className="hidden"
          />

          {/* File upload button */}
          {onFileUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || !!pendingAction || !!selectedFile}
              className="px-3 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 hover:text-white disabled:text-gray-400 rounded-lg transition-colors"
              title="Upload document"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={selectedFile ? undefined : handleKeyDown}
            placeholder={
              pendingAction
                ? "Confirm or cancel the pending action above..."
                : selectedFile
                ? "Add instructions (optional), e.g. 'File this to Waldron Rd' or 'Extract participant details'..."
                : "Ask a question or upload a document..."
            }
            disabled={isLoading || !!pendingAction}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent resize-none disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "120px" }}
          />
          <button
            type={selectedFile ? "button" : "submit"}
            onClick={selectedFile ? handleFileUpload : undefined}
            disabled={selectedFile ? isLoading : (!input.trim() || isLoading || !!pendingAction)}
            className="px-4 py-3 bg-teal-700 hover:bg-teal-800 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {selectedFile
            ? "Type instructions like 'file to Waldron Rd' then click send, or just send to analyze"
            : "Press Enter to send • Drag & drop or click 📎 to upload documents"
          }
        </p>
      </div>
    </div>
  );
}
