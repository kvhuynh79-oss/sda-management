"use client";

import { useEffect, useRef, useCallback, ReactNode } from "react";

interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Function to call when modal should close */
  onClose: () => void;
  /** Modal title (required for accessibility) */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer with action buttons */
  footer?: ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Disable close on backdrop click */
  disableBackdropClick?: boolean;
  /** Disable close on Escape key */
  disableEscapeKey?: boolean;
  /** Optional class for modal content */
  contentClassName?: string;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  disableBackdropClick = false,
  disableEscapeKey = false,
  contentClassName = "",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Return focus to trigger element on close
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Focus trap: keep focus within modal
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      lastElement?.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      firstElement?.focus();
      e.preventDefault();
    }
  }, []);

  // Keyboard event handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close
      if (e.key === "Escape" && !disableEscapeKey) {
        onClose();
      }
      // Tab key for focus trap
      if (e.key === "Tab") {
        handleTabKey(e);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, disableEscapeKey, handleTabKey]);

  // Focus first focusable element when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disableBackdropClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      aria-labelledby={titleId.current}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`bg-gray-800 rounded-lg w-full ${SIZE_CLASSES[size]} ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 id={titleId.current} className="text-xl font-semibold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Footer (optional) */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
