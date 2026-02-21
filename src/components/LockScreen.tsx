"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LockScreenProps {
  /** Attempt to unlock with a PIN. Should return true on success. */
  onUnlock: (pin: string) => Promise<boolean>;
  /** Called when the user chooses to log out */
  onLogout: () => void;
}

const MAX_ATTEMPTS = 5;
const PIN_LENGTH = 4;

/**
 * Full-screen lock overlay for NDIS data protection.
 *
 * - 4-digit PIN input with a large touch-friendly number pad
 * - Each digit renders as a filled or empty dot (iOS-style)
 * - Auto-submits when 4 digits are entered
 * - Shake animation on incorrect PIN
 * - Forces logout after 5 failed attempts
 * - Accessible: role="dialog", aria-modal, focus trap
 */
export function LockScreen({ onUnlock, onLogout }: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedSince, setLockedSince] = useState<number>(Date.now());
  const [elapsedDisplay, setElapsedDisplay] = useState("0:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize lock timestamp
  useEffect(() => {
    const stored = sessionStorage.getItem("sda_lock_timestamp");
    if (stored) {
      setLockedSince(parseInt(stored, 10));
    } else {
      setLockedSince(Date.now());
    }
  }, []);

  // Update elapsed time display every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lockedSince) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setElapsedDisplay(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedSince]);

  // Focus trap: keep focus within the lock screen
  useEffect(() => {
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // Prevent Escape from closing the lock screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
      handleFocusTrap(e);
    };

    document.addEventListener("keydown", handleKeyDown);

    // Focus the first number pad button on mount
    setTimeout(() => {
      firstButtonRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Handle keyboard number input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isSubmitting) return;

      // Number keys 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        appendDigit(e.key);
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        deleteDigit();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isSubmitting]);

  /** Append a digit to the current PIN */
  const appendDigit = useCallback(
    (digit: string) => {
      if (pin.length >= PIN_LENGTH || isSubmitting) return;

      const newPin = pin + digit;
      setPin(newPin);
      setError("");

      // Auto-submit when all digits entered
      if (newPin.length === PIN_LENGTH) {
        submitPin(newPin);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pin, isSubmitting]
  );

  /** Delete the last digit */
  const deleteDigit = useCallback(() => {
    if (isSubmitting) return;
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, [isSubmitting]);

  /** Submit the PIN for verification */
  const submitPin = async (pinToSubmit: string) => {
    setIsSubmitting(true);

    try {
      const success = await onUnlock(pinToSubmit);

      if (success) {
        // Unlock successful - state will be managed by parent
        return;
      }

      // Wrong PIN
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setError("Too many failed attempts. Logging out...");
        setTimeout(() => {
          onLogout();
        }, 1500);
        return;
      }

      setError(
        `Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts === 1 ? "" : "s"} remaining.`
      );
      setShaking(true);
      setPin("");

      setTimeout(() => {
        setShaking(false);
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Number pad button layout */
  const padRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "delete"],
  ];

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Session locked. Enter your PIN to unlock."
    >
      {/* Lock icon and branding */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">MySDAManager</h1>
        <p className="text-gray-400 text-sm mt-1">Session Locked</p>
      </div>

      {/* PIN dots */}
      <div
        className={`flex gap-4 mb-3 ${shaking ? "animate-shake" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? "bg-teal-600 border-teal-600 scale-110"
                : "bg-transparent border-gray-500"
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">
          {pin.length} of {PIN_LENGTH} digits entered
        </span>
      </div>

      {/* Error message */}
      <div className="h-6 mb-4" aria-live="assertive" aria-atomic="true">
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>

      {/* Number pad */}
      <div
        className="grid grid-cols-3 gap-3 mb-8"
        role="group"
        aria-label="PIN number pad"
      >
        {padRows.map((row, rowIndex) =>
          row.map((key, colIndex) => {
            if (key === "") {
              // Empty spacer cell
              return (
                <div
                  key={`spacer-${rowIndex}-${colIndex}`}
                  className="w-[72px] h-[72px]"
                  aria-hidden="true"
                />
              );
            }

            if (key === "delete") {
              return (
                <button
                  key="delete"
                  type="button"
                  onClick={deleteDigit}
                  disabled={pin.length === 0 || isSubmitting}
                  className="w-[72px] h-[72px] rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400 hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
                  aria-label="Delete last digit"
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
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H17a2 2 0 012 2v10a2 2 0 01-2 2h-6.172a2 2 0 01-1.414-.586L3 12z"
                    />
                  </svg>
                </button>
              );
            }

            // Digit button
            return (
              <button
                key={key}
                ref={key === "1" ? firstButtonRef : undefined}
                type="button"
                onClick={() => appendDigit(key)}
                disabled={pin.length >= PIN_LENGTH || isSubmitting}
                className="w-[72px] h-[72px] rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-2xl font-semibold text-white hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
                aria-label={`Digit ${key}`}
              >
                {key}
              </button>
            );
          })
        )}
      </div>

      {/* Locked duration */}
      <p className="text-gray-400 text-xs mb-4" aria-live="off">
        Locked for {elapsedDisplay}
      </p>

      {/* Logout link */}
      <button
        type="button"
        onClick={onLogout}
        className="text-gray-400 hover:text-white text-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none rounded px-2 py-1"
      >
        Forgot PIN? Logout
      </button>

      {/* Inline shake animation style */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shake {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default LockScreen;
