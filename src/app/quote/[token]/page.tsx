"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function QuoteSubmissionPage() {
  const params = useParams();
  const token = params.token as string;

  const quoteData = useQuery(api.quoteRequests.getByToken, { token });
  const markViewed = useMutation(api.quoteRequests.markViewed);
  const submitQuote = useMutation(api.quoteRequests.submitQuote);
  const declineQuote = useMutation(api.quoteRequests.declineQuote);

  const [formData, setFormData] = useState({
    quoteAmount: "",
    laborCost: "",
    materialsCost: "",
    estimatedDays: "",
    availableDate: "",
    warrantyMonths: "",
    description: "",
    validDays: "14",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [error, setError] = useState("");

  // Mark as viewed when page loads
  useEffect(() => {
    if (quoteData && quoteData.quoteRequest.status === "sent") {
      markViewed({ token });
    }
  }, [quoteData, token, markViewed]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await submitQuote({
        token,
        quoteAmount: parseFloat(formData.quoteAmount),
        laborCost: formData.laborCost ? parseFloat(formData.laborCost) : undefined,
        materialsCost: formData.materialsCost ? parseFloat(formData.materialsCost) : undefined,
        estimatedDays: formData.estimatedDays ? parseInt(formData.estimatedDays) : undefined,
        availableDate: formData.availableDate || undefined,
        warrantyMonths: formData.warrantyMonths ? parseInt(formData.warrantyMonths) : undefined,
        description: formData.description || undefined,
        validDays: parseInt(formData.validDays),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await declineQuote({ token, reason: declineReason || undefined });
      setDeclined(true);
      setShowDeclineModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to decline");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (quoteData === undefined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading quote request...</div>
      </div>
    );
  }

  // Invalid or expired token
  if (!quoteData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid Quote Request</h1>
          <p className="text-gray-600">
            This quote request link is invalid or has expired. Please contact the property manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  // Already quoted or declined
  if (quoteData.quoteRequest.status === "quoted" || submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Quote Submitted</h1>
          <p className="text-gray-600">
            Thank you for your quote. The property manager will review it and contact you if your quote is accepted.
          </p>
        </div>
      </div>
    );
  }

  if (quoteData.quoteRequest.status === "declined" || declined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Quote Declined</h1>
          <p className="text-gray-600">You have declined this quote request.</p>
        </div>
      </div>
    );
  }

  if (quoteData.quoteRequest.status === "expired") {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Quote Request Expired</h1>
          <p className="text-gray-600">
            This quote request has expired. Please contact the property manager if you would still like to provide a quote.
          </p>
        </div>
      </div>
    );
  }

  const { maintenanceRequest, property, dwelling, photos, contractor, organizationName, organizationLogoUrl } = quoteData;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {organizationLogoUrl ? (
              <img src={organizationLogoUrl} alt={organizationName || "Organization"} className="w-12 h-12 rounded-lg object-contain" />
            ) : (
              <div className="w-12 h-12 bg-teal-700 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">Quote Request</h1>
              <p className="text-gray-600">{organizationName || "MySDAManager"}</p>
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-teal-900">
              Hi {contractor?.companyName || "Contractor"}, we&apos;re requesting a quote for maintenance work. Please review
              the details below and submit your quote.
            </p>
          </div>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Job Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400">Property</label>
              <p className="text-gray-800 font-medium">
                {property?.addressLine1}
                <br />
                {property?.suburb}, {property?.state} {property?.postcode}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Dwelling</label>
              <p className="text-gray-800 font-medium">{dwelling?.dwellingName || "Main Property"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Category</label>
              <p className="text-gray-800 font-medium capitalize">{maintenanceRequest.category}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Priority</label>
              <span
                className={`inline-block px-2 py-1 text-xs rounded-full ${
                  maintenanceRequest.priority === "urgent"
                    ? "bg-red-100 text-red-700"
                    : maintenanceRequest.priority === "high"
                    ? "bg-orange-100 text-orange-700"
                    : maintenanceRequest.priority === "medium"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {maintenanceRequest.priority.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="text-sm text-gray-400">Issue</label>
            <h3 className="text-gray-800 font-medium">{maintenanceRequest.title}</h3>
            <p className="text-gray-600 mt-2">{maintenanceRequest.description}</p>
          </div>

          {/* Photos */}
          {photos && photos.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="text-sm text-gray-400 mb-2 block">Photos ({photos.length})</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <a
                    key={index}
                    href={photo.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    {photo.url && (
                      <img
                        src={photo.url}
                        alt={photo.description || `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quote Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit Your Quote</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Quote Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quoteAmount}
                    onChange={(e) => setFormData({ ...formData, quoteAmount: e.target.value })}
                    required
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quote Valid For</label>
                <select
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.laborCost}
                    onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Materials Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.materialsCost}
                    onChange={(e) => setFormData({ ...formData, materialsCost: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Days to Complete</label>
                <input
                  type="number"
                  value={formData.estimatedDays}
                  onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Earliest Available Date</label>
                <input
                  type="date"
                  value={formData.availableDate}
                  onChange={(e) => setFormData({ ...formData, availableDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (months)</label>
                <input
                  type="number"
                  value={formData.warrantyMonths}
                  onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  placeholder="e.g., 12"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work / Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                placeholder="Describe what's included in this quote..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Quote"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeclineModal(true)}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Decline
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-400 text-sm">
          <p>Quote request expires: {quoteData.quoteRequest.expiryDate}</p>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Decline Quote Request</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to decline this quote request?</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Not available, Outside service area..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
