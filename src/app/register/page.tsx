"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { trackConversion } from "@/lib/analytics";
import { getAttribution } from "@/hooks/useUtmCapture";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PlanId = "starter" | "professional" | "enterprise";
type RegistrationStep = 1 | 2 | 3;

interface FormErrors {
  orgName?: string;
  slug?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_NAMES: Record<PlanId, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

const PLAN_PRICES: Record<PlanId, string> = {
  starter: "$499/mo",
  professional: "$899/mo",
  enterprise: "$1,499/mo",
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 12) {
    return { valid: false, message: "Password must be at least 12 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 number." };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~"\\]/.test(password)) {
    return { valid: false, message: "Password must contain at least 1 special character (e.g. !@#$%^&*)." };
  }
  return { valid: true, message: "" };
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShieldIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function StepIndicator({ currentStep }: { currentStep: RegistrationStep }) {
  const steps = [
    { number: 1 as const, label: "Organization" },
    { number: 2 as const, label: "Admin Account" },
    { number: 3 as const, label: "Review" },
  ];

  return (
    <nav aria-label="Registration progress" className="mb-8">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <li key={step.number} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-teal-600 text-white"
                      : isActive
                        ? "bg-teal-600 text-white ring-2 ring-teal-400/50"
                        : "bg-gray-700 text-gray-400"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </span>
                <span
                  className={`text-sm font-medium hidden sm:inline ${
                    isActive ? "text-white" : isCompleted ? "text-teal-400" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 ${
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
// Main Component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---- State ----
  const [step, setStep] = useState<RegistrationStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("professional");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Step 2: Admin user
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const slugCheck = useQuery(
    api.registration.checkSlugAvailability,
    slug.length >= 3 ? { slug } : "skip"
  );
  const registerOrganization = useAction(api.registration.registerOrganization);

  // Pre-select plan from URL params
  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && (planParam === "starter" || planParam === "professional" || planParam === "enterprise")) {
      setSelectedPlan(planParam);
    }
  }, [searchParams]);

  // Auto-generate slug from org name (unless manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && orgName) {
      setSlug(slugify(orgName));
    }
  }, [orgName, slugManuallyEdited]);

  // Slug availability check (debounced mock)
  useEffect(() => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }

    if (slugCheck === undefined) {
      setCheckingSlug(true);
    } else {
      setSlugAvailable(slugCheck.available);
      setCheckingSlug(false);
    }
  }, [slug, slugCheck]);

  // ---- Validation ----
  const validateStep1 = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!orgName.trim()) newErrors.orgName = "Organization name is required.";
    if (slug.length < 3) newErrors.slug = "URL slug must be at least 3 characters.";
    if (slugAvailable === false) newErrors.slug = "This URL is already taken.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [orgName, slug, slugAvailable]);

  const validateStep2 = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!validateEmail(email)) newErrors.email = "Please enter a valid email address.";
    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!password) {
      newErrors.password = "Password is required.";
    } else {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) newErrors.password = passwordCheck.message;
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, firstName, lastName, password, confirmPassword]);

  // ---- Navigation ----
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setErrors({});
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as RegistrationStep);
      setErrors({});
    }
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const attribution = getAttribution();
      const result = await registerOrganization({
        orgName: orgName.trim(),
        slug,
        plan: selectedPlan,
        adminEmail: email.trim(),
        adminFirstName: firstName.trim(),
        adminLastName: lastName.trim(),
        adminPassword: password,
        // Marketing attribution
        ...(attribution?.utm_source && { utmSource: attribution.utm_source }),
        ...(attribution?.utm_medium && { utmMedium: attribution.utm_medium }),
        ...(attribution?.utm_campaign && { utmCampaign: attribution.utm_campaign }),
        ...(attribution?.utm_content && { utmContent: attribution.utm_content }),
        ...(attribution?.utm_term && { utmTerm: attribution.utm_term }),
        ...(attribution?.gclid && { gclid: attribution.gclid }),
        ...(attribution?.referral_code && { referralCode: attribution.referral_code }),
        ...(attribution?.landing_page && { landingPage: attribution.landing_page }),
      });

      // Store session in localStorage for useAuth compatibility
      const userData = {
        id: result.userId,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "admin",
        organizationId: result.organizationId,
      };
      localStorage.setItem("sda_user", JSON.stringify(userData));

      // Track successful registration
      trackConversion({ event: "trial_signup", value: 150, method: "registration_form" });

      // Redirect to onboarding
      router.push("/onboarding/setup");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Password strength indicator ----
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:',.<>?/`~"\\]/.test(password)) score++;

    if (score <= 2) return { level: Math.min(score, 5), label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { level: Math.min(score, 5), label: "Fair", color: "bg-yellow-500" };
    if (score <= 4) return { level: Math.min(score, 5), label: "Good", color: "bg-teal-500" };
    return { level: 5, label: "Strong", color: "bg-green-500" };
  }, [password]);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ---- Header ---- */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <ShieldIcon />
              <span className="text-xl font-bold text-white">MySDAManager</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">Already have an account?</span>
              <Link
                href="/login"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ---- Content ---- */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400">
            Set up your organization in minutes. 14-day free trial, no credit card required.
          </p>
        </div>

        <StepIndicator currentStep={step} />

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 sm:p-8">
          {/* ============================================================== */}
          {/* Step 1: Organization                                            */}
          {/* ============================================================== */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Organization Details</h2>

              {/* Organization name */}
              <div className="mb-5">
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-300 mb-1">
                  Organization Name <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Better Living Solutions"
                  autoComplete="organization"
                  aria-required="true"
                  aria-invalid={!!errors.orgName}
                  aria-describedby={errors.orgName ? "orgName-error" : undefined}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                    errors.orgName ? "border-red-500" : "border-gray-600"
                  }`}
                />
                {errors.orgName && (
                  <p id="orgName-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.orgName}
                  </p>
                )}
              </div>

              {/* URL slug */}
              <div className="mb-5">
                <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
                  Organization URL <span className="text-red-400" aria-label="required">*</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-600 bg-gray-600 text-gray-400 text-sm">
                    mysdamanager.com/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="your-org"
                    aria-required="true"
                    aria-invalid={!!errors.slug}
                    aria-describedby={errors.slug ? "slug-error" : "slug-status"}
                    className={`flex-1 px-3 py-2 bg-gray-700 border rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                      errors.slug ? "border-red-500" : "border-gray-600"
                    }`}
                  />
                </div>
                {/* Slug availability indicator */}
                <div id="slug-status" className="mt-1 flex items-center gap-1.5" aria-live="polite">
                  {checkingSlug && slug.length >= 3 && (
                    <span className="text-sm text-gray-400 flex items-center gap-1">
                      <SpinnerIcon /> Checking availability...
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === true && slug.length >= 3 && (
                    <span className="text-sm text-green-400 flex items-center gap-1">
                      <CheckCircleIcon className="h-4 w-4" /> Available
                    </span>
                  )}
                  {!checkingSlug && slugAvailable === false && slug.length >= 3 && (
                    <span className="text-sm text-red-400 flex items-center gap-1">
                      <XCircleIcon className="h-4 w-4" /> Already taken
                    </span>
                  )}
                </div>
                {errors.slug && (
                  <p id="slug-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.slug}
                  </p>
                )}
              </div>

              {/* Plan selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Plan
                </label>
                <fieldset>
                  <legend className="sr-only">Select a pricing plan</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(["starter", "professional", "enterprise"] as const).map((planId) => (
                      <label
                        key={planId}
                        className={`relative flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-teal-500 ${
                          selectedPlan === planId
                            ? "border-teal-500 bg-teal-600/10"
                            : "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name="plan"
                          value={planId}
                          checked={selectedPlan === planId}
                          onChange={() => setSelectedPlan(planId)}
                          className="sr-only"
                        />
                        <span className="text-sm font-semibold text-white">
                          {PLAN_NAMES[planId]}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">
                          {PLAN_PRICES[planId]}
                        </span>
                        {selectedPlan === planId && (
                          <CheckCircleIcon className="h-5 w-5 text-teal-400 absolute top-2 right-2" />
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Next button */}
              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
              >
                Continue
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* Step 2: Admin Account                                           */}
          {/* ============================================================== */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Admin Account</h2>

              {/* Name fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
                    First Name <span className="text-red-400" aria-label="required">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    autoComplete="given-name"
                    aria-required="true"
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? "firstName-error" : undefined}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                      errors.firstName ? "border-red-500" : "border-gray-600"
                    }`}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="mt-1 text-sm text-red-400" role="alert">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
                    Last Name <span className="text-red-400" aria-label="required">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    autoComplete="family-name"
                    aria-required="true"
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? "lastName-error" : undefined}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                      errors.lastName ? "border-red-500" : "border-gray-600"
                    }`}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="mt-1 text-sm text-red-400" role="alert">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  aria-required="true"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                    errors.email ? "border-red-500" : "border-gray-600"
                  }`}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password <span className="text-red-400" aria-label="required">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : "password-requirements"}
                    className={`w-full px-3 py-2 pr-12 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                      errors.password ? "border-red-500" : "border-gray-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 text-xs font-medium"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {/* Password strength bar */}
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= passwordStrength.level ? passwordStrength.color : "bg-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
                <p id="password-requirements" className="mt-1 text-xs text-gray-400">
                  8+ characters, 1 uppercase letter, 1 number
                </p>
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password <span className="text-red-400" aria-label="required">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors ${
                    errors.confirmPassword ? "border-red-500" : "border-gray-600"
                  }`}
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="mt-1 text-sm text-red-400" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* Step 3: Review & Confirm                                        */}
          {/* ============================================================== */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-6">Review & Confirm</h2>

              {/* Summary cards */}
              <div className="space-y-4 mb-6">
                {/* Organization */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Organization</h3>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-400">Name</dt>
                      <dd className="text-sm text-white font-medium">{orgName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-400">URL</dt>
                      <dd className="text-sm text-white font-medium">mysdamanager.com/{slug}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-400">Plan</dt>
                      <dd className="text-sm text-white font-medium">
                        {PLAN_NAMES[selectedPlan]} ({PLAN_PRICES[selectedPlan]})
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Admin account */}
                <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Admin Account</h3>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-400">Name</dt>
                      <dd className="text-sm text-white font-medium">{firstName} {lastName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-400">Email</dt>
                      <dd className="text-sm text-white font-medium">{email}</dd>
                    </div>
                  </dl>
                </div>

                {/* Trial info */}
                <div className="bg-teal-900/20 rounded-lg p-4 border border-teal-600/30">
                  <p className="text-sm text-teal-300">
                    Your 14-day free trial starts immediately. No credit card required. You can upgrade or cancel at any time from the billing page.
                  </p>
                </div>
              </div>

              {/* Error message */}
              {submitError && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-600/30" role="alert">
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}

              {/* Navigation */}
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
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-gray-400 mt-6">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
