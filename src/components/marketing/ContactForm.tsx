"use client";

import { useState, FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const INQUIRY_TYPES = [
  { value: "", label: "Select an inquiry type" },
  { value: "general", label: "General Inquiry" },
  { value: "demo", label: "Request a Demo" },
  { value: "support", label: "Support" },
  { value: "partnership", label: "Partnership" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitInquiry = useMutation(api.marketingLeads.submitInquiry);

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    inquiryType.length > 0 &&
    message.trim().length > 0 &&
    !isSubmitting;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await submitInquiry({
        name: name.trim(),
        email: email.trim(),
        organization: organization.trim() || undefined,
        phone: phone.trim() || undefined,
        inquiryType,
        message: message.trim(),
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-teal-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Message sent
        </h3>
        <p className="text-gray-400">
          Thank you for reaching out. We typically respond within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="contact-name"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@provider.com.au"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
        />
      </div>

      {/* Organisation */}
      <div>
        <label
          htmlFor="contact-organization"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Organisation{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="contact-organization"
          type="text"
          autoComplete="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Your SDA provider name"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
        />
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="contact-phone"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Phone{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="04XX XXX XXX"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
        />
      </div>

      {/* Inquiry Type */}
      <div>
        <label
          htmlFor="contact-inquiry-type"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Inquiry Type <span className="text-red-400">*</span>
        </label>
        <select
          id="contact-inquiry-type"
          required
          value={inquiryType}
          onChange={(e) => setInquiryType(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {INQUIRY_TYPES.map((type) => (
            <option key={type.value} value={type.value} disabled={!type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your SDA portfolio and how we can help..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus-visible:ring-2 focus-visible:ring-teal-500 resize-vertical"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
