"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import { storeTokens } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // MFA state
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingUserId, setPendingUserId] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const loginWithSession = useAction(api.auth.loginWithSession);
  const completeMfaLogin = useAction(api.auth.completeMfaLogin);
  const router = useRouter();

  // Sanitize error messages to be user-friendly
  const getErrorMessage = (err: unknown, isMfaStep = false): string => {
    if (err instanceof Error) {
      const message = err.message.toLowerCase();
      // MFA-specific errors - don't sanitize these
      if (isMfaStep) {
        if (message.includes("invalid mfa") || message.includes("invalid totp")) {
          return "Invalid verification code. Please try again.";
        }
        return "Verification failed. Please try again.";
      }
      if (message.includes("invalid") || message.includes("not found")) {
        return "Invalid email or password. Please try again.";
      }
      if (message.includes("disabled") || message.includes("inactive")) {
        return "This account has been disabled. Please contact your administrator.";
      }
    }
    return isMfaStep
      ? "Verification failed. Please try again."
      : "Login failed. Please check your credentials and try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginWithSession({ email, password });

      // Check if MFA is required
      if (result.requiresMfa && result.userId) {
        setRequiresMfa(true);
        setPendingUserId(result.userId);
        setIsLoading(false);
        return;
      }

      // Store session tokens (new JWT-based auth)
      if (result.token && result.refreshToken) {
        storeTokens(result.token, result.refreshToken);
      }

      // BACKWARD COMPATIBILITY: Also store user data in old format
      // TODO: Remove this once all pages are migrated to useSession
      if (result.user) {
        localStorage.setItem("sda_user", JSON.stringify({
          id: result.user._id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        }));
      }

      // Redirect based on role - SIL providers go to their restricted portal
      if (result.user?.role === "sil_provider") {
        router.push("/portal/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await completeMfaLogin({
        userId: pendingUserId as any, // Cast to Id<"users">
        mfaCode: mfaCode,
      });

      if (!result.token || !result.user) {
        setError("Invalid code. Please try again.");
        setIsLoading(false);
        return;
      }

      // Store session tokens
      storeTokens(result.token, result.refreshToken || "");

      // BACKWARD COMPATIBILITY: Also store user data in old format
      localStorage.setItem("sda_user", JSON.stringify({
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      }));

      // Redirect based on role
      if (result.user.role === "sil_provider") {
        router.push("/portal/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getErrorMessage(err, true));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/Logo.jpg"
              alt="Better Living Solutions"
              width={280}
              height={80}
              className="rounded object-contain"
              priority
            />
          </div>
          <p className="text-gray-400">
            Specialist Disability Accommodation Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-xl font-semibold text-white mb-6">
            {requiresMfa ? "Two-Factor Authentication" : "Sign in to your account"}
          </h1>

          {!requiresMfa ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Info Message */}
              <div className="bg-blue-500/10 border border-blue-500 text-blue-400 px-4 py-3 rounded-lg text-sm">
                <p>Enter the {useBackupCode ? "backup code" : "verification code"} from your authenticator app to continue.</p>
              </div>

              {/* MFA Code Field */}
              <div>
                <label
                  htmlFor="mfaCode"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  {useBackupCode ? "Backup Code" : "Verification Code"}
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => {
                    // Only allow digits for regular codes, alphanumeric for backup codes
                    const value = useBackupCode
                      ? e.target.value.replace(/[^a-zA-Z0-9]/g, "")
                      : e.target.value.replace(/\D/g, "").slice(0, 6);
                    setMfaCode(value);
                    setError("");
                  }}
                  required
                  autoComplete="one-time-code"
                  inputMode={useBackupCode ? "text" : "numeric"}
                  maxLength={useBackupCode ? 12 : 6}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-wider font-mono"
                  placeholder={useBackupCode ? "xxxx-xxxx-xxxx" : "000000"}
                  autoFocus
                />
                <p className="text-gray-400 text-xs mt-2">
                  {useBackupCode ? "Enter one of your backup codes" : "Enter the 6-digit code from your authenticator app"}
                </p>
              </div>

              {/* Toggle Backup Code */}
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setMfaCode("");
                  setError("");
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
              >
                {useBackupCode ? "Use authenticator code instead" : "Use backup code instead"}
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || (useBackupCode ? mfaCode.length < 8 : mfaCode.length !== 6)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                {isLoading ? "Verifying..." : "Verify"}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setRequiresMfa(false);
                  setMfaCode("");
                  setPendingUserId("");
                  setUseBackupCode(false);
                  setError("");
                }}
                className="w-full py-2 px-4 text-gray-400 hover:text-white transition-colors text-sm"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          SDA Property Management System
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false);
          setResetEmail("");
          setResetSubmitted(false);
        }}
        title="Reset Password"
        size="md"
      >
        {!resetSubmitted ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResetSubmitted(true);
            }}
            className="space-y-4"
          >
            <p className="text-gray-300 text-sm">
              Enter your email address and we&apos;ll help you reset your password.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Submit
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white">Contact your administrator</h3>
            <p className="text-gray-400 text-sm">
              To reset your password for <span className="text-white font-medium">{resetEmail}</span>, please contact your system administrator.
            </p>
            <div className="pt-2 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-gray-300 text-sm">
                <strong>Contact:</strong><br />
                khen@betterlivingsolutions.com.au
              </p>
            </div>
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail("");
                setResetSubmitted(false);
              }}
              className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Back to Login
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
