"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DialogVariant = "default" | "danger";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
}

interface AlertOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface DialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string | null; // null = alert mode (no cancel button)
  variant: DialogVariant;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export function useConfirmDialog(): ConfirmDialogContextType {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      "useConfirmDialog must be used within a ConfirmDialogProvider"
    );
  }
  return context;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

const INITIAL_STATE: DialogState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "Cancel",
  variant: "default",
  resolve: null,
};

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [dialog, setDialog] = useState<DialogState>(INITIAL_STATE);

  // ------ confirm() ------
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        variant: options.variant ?? "default",
        resolve,
      });
    });
  }, []);

  // ------ alert() ------
  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      setDialog({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "OK",
        cancelLabel: null, // no cancel button for alerts
        variant: "default",
        resolve: () => resolve(),
      });
    });
  }, []);

  // ------ handlers ------
  const handleConfirm = useCallback(() => {
    dialog.resolve?.(true);
    setDialog(INITIAL_STATE);
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog.resolve?.(false);
    setDialog(INITIAL_STATE);
  }, [dialog]);

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog.open && (
        <ConfirmDialogModal
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          variant={dialog.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmDialogContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

interface ConfirmDialogModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string | null;
  variant: DialogVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialogModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // IDs for ARIA references
  const titleId = "confirm-dialog-title";
  const descId = "confirm-dialog-desc";

  // ------ Fade-in on mount ------
  useEffect(() => {
    // Trigger CSS transition on next frame so the initial opacity-0 is painted
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ------ Auto-focus confirm button ------
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // ------ Escape key ------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // ------ Focus trap ------
  useEffect(() => {
    const container = dialogRef.current;
    if (!container) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusable = container!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  // ------ Lock body scroll ------
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ------ Variant-specific styles ------
  const confirmButtonStyles =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white"
      : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500 text-white";

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[400] bg-black/50 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Dialog container */}
      <div
        className="fixed inset-0 z-[401] flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* Dialog panel */}
        <div
          ref={dialogRef}
          className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md
            transition-all duration-200 transform
            ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
            mx-4 sm:mx-auto`}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-2">
            <h2
              id={titleId}
              className="text-lg font-semibold text-white"
            >
              {title}
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 pb-6">
            <p id={descId} className="text-gray-300 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            {cancelLabel !== null && (
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                {cancelLabel}
              </button>
            )}
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 ${confirmButtonStyles}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConfirmDialogProvider;
