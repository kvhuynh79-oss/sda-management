"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OnboardingStep = 1 | 2 | 3 | 4;
type AustralianState = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

const SDA_CATEGORIES = [
  { value: "improved_liveability", label: "Improved Liveability" },
  { value: "fully_accessible", label: "Fully Accessible" },
  { value: "robust", label: "Robust" },
  { value: "high_physical_support", label: "High Physical Support (HPS)" },
];

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="h-12 w-12 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="h-12 w-12 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className="h-16 w-16 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: OnboardingStep }) {
  const steps = [
    { number: 1 as const, label: "Welcome" },
    { number: 2 as const, label: "Property" },
    { number: 3 as const, label: "Dwelling" },
    { number: 4 as const, label: "Done" },
  ];

  return (
    <nav aria-label="Onboarding progress" className="mb-10">
      <ol className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <li key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <span
                  className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? "bg-teal-600 text-white"
                      : isActive
                        ? "bg-teal-600 text-white ring-4 ring-teal-600/20"
                        : "bg-gray-700 text-gray-400"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </span>
                <span
                  className={`text-xs font-medium mt-1.5 ${
                    isActive ? "text-white" : isCompleted ? "text-teal-400" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 mx-2 mb-5 ${
                    isCompleted ? "bg-teal-600" : "bg-gray-700"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Onboarding Content
// ---------------------------------------------------------------------------

function OnboardingSetupContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Step 1: Welcome & org details
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [currency, setCurrency] = useState("AUD");

  // Step 2: First property
  const [propertyAddress, setPropertyAddress] = useState("");
  const [propertySuburb, setPropertySuburb] = useState("");
  const [propertyState, setPropertyState] = useState<AustralianState>("NSW");
  const [propertyPostcode, setPropertyPostcode] = useState("");
  const [sdaCategory, setSdaCategory] = useState("improved_liveability");
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);

  // Step 3: First dwelling
  const [dwellingName, setDwellingName] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("2");

  // Convex mutations
  const createProperty = useMutation(api.properties.create);
  const createDwelling = useMutation(api.dwellings.create);

  // ---- Handlers ----
  const handleNext = () => {
    if (step < 4) setStep((step + 1) as OnboardingStep);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as OnboardingStep);
  };

  const handleSkip = () => {
    if (step < 4) setStep((step + 1) as OnboardingStep);
  };

  const handleCreateProperty = useCallback(async () => {
    if (!propertyAddress.trim() || !user) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const propertyId = await createProperty({
        userId: user.id as Id<"users">,
        addressLine1: propertyAddress.trim(),
        suburb: propertySuburb.trim() || "Unknown",
        state: propertyState,
        postcode: propertyPostcode.trim() || "0000",
        propertyStatus: "active" as const,
        ownershipType: "investor" as const,
      });
      setCreatedPropertyId(propertyId as string);
      setStep(3);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create property. You can do this later from the dashboard."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [propertyAddress, propertySuburb, propertyState, propertyPostcode, user, createProperty]);

  const handleCreateDwelling = useCallback(async () => {
    if (!dwellingName.trim() || !createdPropertyId || !user) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await createDwelling({
        userId: user.id as Id<"users">,
        propertyId: createdPropertyId as Id<"properties">,
        dwellingName: dwellingName.trim(),
        dwellingType: "unit" as const,
        bedrooms: 1,
        sdaDesignCategory: sdaCategory as "improved_liveability" | "fully_accessible" | "robust" | "high_physical_support",
        sdaBuildingType: "existing" as const,
        maxParticipants: parseInt(maxParticipants, 10) || 2,
      });
      setStep(4);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create dwelling. You can do this later from the property page."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [dwellingName, maxParticipants, createdPropertyId, user, createDwelling, sdaCategory]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xl font-bold text-white">MySDAManager</span>
            </div>
            {step < 4 && (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip setup
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <StepIndicator currentStep={step} />

        {/* ============================================================== */}
        {/* Step 1: Welcome & Organization Settings                        */}
        {/* ============================================================== */}
        {step === 1 && (
          <div className="text-center">
            <div className="mb-6">
              <RocketIcon />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome to MySDAManager!
            </h1>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Let us help you get set up. We have pre-filled some settings for Australian SDA providers.
              You can change these later in Settings.
            </p>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sm:p-8 text-left max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-white mb-5">Organization Settings</h2>

              {/* Timezone */}
              <div className="mb-5">
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-300 mb-1">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                >
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  <option value="Australia/Melbourne">Australia/Melbourne (AEST)</option>
                  <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                  <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
                  <option value="Australia/Perth">Australia/Perth (AWST)</option>
                  <option value="Australia/Darwin">Australia/Darwin (ACST)</option>
                  <option value="Australia/Hobart">Australia/Hobart (AEST)</option>
                </select>
              </div>

              {/* Currency */}
              <div className="mb-6">
                <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">
                  Currency
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                >
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="NZD">NZD - New Zealand Dollar</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 2: Add First Property                                     */}
        {/* ============================================================== */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <BuildingIcon />
              <h1 className="text-2xl font-bold text-white mt-4 mb-2">Add Your First Property</h1>
              <p className="text-gray-400">
                Enter the address and SDA category for your first property. You can add more later.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sm:p-8">
              {/* Street address */}
              <div className="mb-5">
                <label htmlFor="propertyAddress" className="block text-sm font-medium text-gray-300 mb-1">
                  Street Address <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="propertyAddress"
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder="e.g. 123 Main Street"
                  autoComplete="street-address"
                  aria-required="true"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                />
              </div>

              {/* Suburb / State / Postcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                <div>
                  <label htmlFor="suburb" className="block text-sm font-medium text-gray-300 mb-1">
                    Suburb
                  </label>
                  <input
                    id="suburb"
                    type="text"
                    value={propertySuburb}
                    onChange={(e) => setPropertySuburb(e.target.value)}
                    placeholder="e.g. Parramatta"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-1">
                    State
                  </label>
                  <select
                    id="state"
                    value={propertyState}
                    onChange={(e) => setPropertyState(e.target.value as AustralianState)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  >
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-gray-300 mb-1">
                    Postcode
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    value={propertyPostcode}
                    onChange={(e) => setPropertyPostcode(e.target.value)}
                    placeholder="2150"
                    maxLength={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                </div>
              </div>

              {/* SDA Category */}
              <div className="mb-6">
                <label htmlFor="sdaCategory" className="block text-sm font-medium text-gray-300 mb-1">
                  SDA Design Category <span className="text-red-400" aria-label="required">*</span>
                </label>
                <select
                  id="sdaCategory"
                  value={sdaCategory}
                  onChange={(e) => setSdaCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                >
                  {SDA_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {submitError && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-600/30" role="alert">
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 font-medium px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleCreateProperty}
                  disabled={isSubmitting || !propertyAddress.trim()}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon />
                      Creating...
                    </>
                  ) : (
                    "Add Property"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 3: Add First Dwelling                                     */}
        {/* ============================================================== */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <HomeIcon />
              <h1 className="text-2xl font-bold text-white mt-4 mb-2">Add Your First Dwelling</h1>
              <p className="text-gray-400">
                Properties can contain multiple dwellings (units). Add the first one now.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sm:p-8">
              {/* Property context */}
              {propertyAddress && (
                <div className="bg-gray-700/50 rounded-lg p-3 mb-6 border border-gray-600">
                  <p className="text-xs text-gray-400 mb-0.5">Property</p>
                  <p className="text-sm text-white font-medium">
                    {propertyAddress}{propertySuburb ? `, ${propertySuburb}` : ""} {propertyState} {propertyPostcode}
                  </p>
                </div>
              )}

              {/* Dwelling number */}
              <div className="mb-5">
                <label htmlFor="dwellingName" className="block text-sm font-medium text-gray-300 mb-1">
                  Dwelling Number / Unit ID <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="dwellingName"
                  type="text"
                  value={dwellingName}
                  onChange={(e) => setDwellingName(e.target.value)}
                  placeholder="e.g. Unit 1, Dwelling A, Room 3"
                  aria-required="true"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                />
              </div>

              {/* Max participants */}
              <div className="mb-6">
                <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-300 mb-1">
                  Maximum Participants
                </label>
                <select
                  id="maxParticipants"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                >
                  <option value="1">1 participant</option>
                  <option value="2">2 participants</option>
                  <option value="3">3 participants</option>
                  <option value="4">4 participants</option>
                  <option value="5">5 participants</option>
                </select>
              </div>

              {/* Error */}
              {submitError && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-600/30" role="alert">
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 font-medium px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={handleCreateDwelling}
                  disabled={isSubmitting || !dwellingName.trim()}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon />
                      Creating...
                    </>
                  ) : (
                    "Add Dwelling"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Step 4: All Done                                               */}
        {/* ============================================================== */}
        {step === 4 && (
          <div className="text-center">
            {/* Success checkmark */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-600/20 mb-6">
              <svg className="h-10 w-10 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">You are all set!</h1>
            <p className="text-gray-400 mb-10 max-w-md mx-auto">
              Your organization is ready to go. Here are some next steps to get the most out of MySDAManager.
            </p>

            {/* Action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <Link
                href="/dashboard"
                className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:bg-gray-700/80 transition-colors text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <svg className="h-8 w-8 text-teal-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <h3 className="text-sm font-semibold text-white mb-1">Go to Dashboard</h3>
                <p className="text-xs text-gray-400">View your management hub</p>
              </Link>

              <Link
                href="/participants"
                className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:bg-gray-700/80 transition-colors text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <svg className="h-8 w-8 text-teal-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <h3 className="text-sm font-semibold text-white mb-1">Add Participant</h3>
                <p className="text-xs text-gray-400">Register your first participant</p>
              </Link>

              <Link
                href="/maintenance"
                className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:bg-gray-700/80 transition-colors text-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <svg className="h-8 w-8 text-teal-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.175 1.37-5.99L2.79 8.14l6.083-.53L11.42 2.25l2.548 5.36 6.082.53-4.615 4.215 1.37 5.99-5.384-3.175z" />
                </svg>
                <h3 className="text-sm font-semibold text-white mb-1">Log Maintenance</h3>
                <p className="text-xs text-gray-400">Create a maintenance request</p>
              </Link>
            </div>

            <Link
              href="/dashboard"
              className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-medium px-8 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export (wrapped in RequireAuth)
// ---------------------------------------------------------------------------

export default function OnboardingSetupPage() {
  return (
    <RequireAuth>
      <OnboardingSetupContent />
    </RequireAuth>
  );
}
