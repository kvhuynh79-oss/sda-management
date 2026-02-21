"use client";

import { useState } from "react";
import { FormInput } from "./forms/FormInput";
import { Button } from "./forms/Button";

interface MfaSetupProps {
  /** The MFA secret for manual entry */
  secret: string;
  /** The QR code data URL for scanning */
  qrCodeUrl: string;
  /** Callback when verification succeeds - passes the verification code */
  onVerified: (verificationCode: string) => void;
  /** Callback to cancel setup */
  onCancel: () => void;
  /** Loading state during verification */
  isVerifying?: boolean;
}

export function MfaSetup({
  secret,
  qrCodeUrl,
  onVerified,
  onCancel,
  isVerifying = false,
}: MfaSetupProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    // Pass the verification code to parent for API call
    onVerified(verificationCode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">
          Set Up Two-Factor Authentication
        </h3>
        <p className="text-sm text-gray-400">
          Scan the QR code with your authenticator app to get started
        </p>
      </div>

      {/* QR Code Section */}
      <div className="bg-gray-700/50 rounded-lg p-6">
        <div className="text-center space-y-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="MFA QR Code"
              className="w-48 h-48"
            />
          </div>

          {/* App Suggestions */}
          <div className="text-sm text-gray-400">
            <p className="mb-1">Recommended authenticator apps:</p>
            <p className="text-gray-300">
              Google Authenticator, Microsoft Authenticator, Authy
            </p>
          </div>

          {/* Toggle Manual Entry */}
          <button
            type="button"
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-sm text-teal-500 hover:text-teal-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded px-2 py-1"
          >
            {showManualEntry ? "Hide manual entry" : "Can't scan? Enter manually"}
          </button>

          {/* Manual Entry Section */}
          {showManualEntry && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-300">
                Enter this code in your authenticator app:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white font-mono text-sm break-all">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label="Copy secret to clipboard"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <FormInput
          label="Verification Code"
          type="text"
          value={verificationCode}
          onChange={(e) => {
            // Only allow digits and limit to 6 characters
            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
            setVerificationCode(value);
            setError("");
          }}
          placeholder="000000"
          required
          error={error}
          helperText="Enter the 6-digit code from your authenticator app"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={6}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? "Verifying..." : "Verify & Enable"}
          </Button>
        </div>
      </form>

      {/* Security Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm">
            <p className="text-yellow-300 font-medium mb-1">Important</p>
            <p className="text-yellow-200/80">
              After enabling MFA, you&apos;ll receive backup codes. Save them securely - you&apos;ll need them if you lose access to your authenticator app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MfaSetup;
