"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface TermsAcceptanceModalProps {
  userId: Id<"users">;
  onAccepted: () => void;
}

export function TermsAcceptanceModal({ userId, onAccepted }: TermsAcceptanceModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const acceptTerms = useMutation(api.auth.acceptTerms);

  const canAccept = agreedToTerms && agreedToConsent && !isSubmitting;

  const handleAccept = async () => {
    if (!canAccept) return;
    setIsSubmitting(true);
    try {
      await acceptTerms({ userId, version: "2026-02-12" });
      onAccepted();
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <svg
            className="h-8 w-8 text-teal-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-white">MySDAManager</h1>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">
          Terms of Service &amp; Privacy Policy
        </h2>

        {/* Scrollable content */}
        <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-5 mb-6 space-y-5 bg-gray-900/50">
          {/* Service Disclaimer */}
          <div>
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
              Service Disclaimer
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              MySDAManager is a management tool and does not guarantee NDIS audit
              success or compliance. You remain responsible for verifying all data
              against current NDIS Practice Standards.
            </p>
          </div>

          {/* Health Data */}
          <div>
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
              Health Data
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              We handle Sensitive Information as defined by the Australian Privacy
              Principles (APPs). You warrant that you have obtained informed consent
              from all NDIS participants before entering their data.
            </p>
          </div>

          {/* Liability */}
          <div>
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
              Liability
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Our liability is limited to 12 months of subscription fees paid. We
              are not liable for penalties resulting from failure to maintain
              accurate records.
            </p>
          </div>

          {/* Security */}
          <div>
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-2">
              Security
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              We maintain AES-256 encryption at rest and TLS in transit. Data
              breaches will be notified within 72 hours under the NDB scheme.
            </p>
          </div>
        </div>

        {/* Links to full documents */}
        <div className="flex items-center gap-4 mb-6 text-sm">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-500 hover:text-teal-400 transition-colors underline"
          >
            Full Terms of Service
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-500 hover:text-teal-400 transition-colors underline"
          >
            Full Privacy Policy
          </a>
        </div>

        {/* Checkboxes */}
        <div className="space-y-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-600 bg-gray-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
              I have read and agree to the Terms of Service and Privacy Policy
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToConsent}
              onChange={(e) => setAgreedToConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-600 bg-gray-700 text-teal-600 focus:ring-teal-500 focus:ring-offset-gray-800"
            />
            <span className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
              I acknowledge that I am responsible for obtaining NDIS participant
              consent before entering their data into the system
            </span>
          </label>
        </div>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={!canAccept}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
            canAccept
              ? "bg-teal-600 hover:bg-teal-700 cursor-pointer"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? "Accepting..." : "Accept & Continue"}
        </button>
      </div>
    </div>
  );
}
