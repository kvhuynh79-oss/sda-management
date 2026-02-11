"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingScreen, EmptyState, StatCard } from "@/components/ui";
import Link from "next/link";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatStatus } from "@/utils/format";

// ── Constants ────────────────────────────────────────────────────────────────

type EmploymentType = "full_time" | "part_time" | "casual" | "contractor";

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "casual", label: "Casual" },
  { value: "contractor", label: "Contractor" },
];

const EMPLOYMENT_BADGE_COLORS: Record<EmploymentType, string> = {
  full_time: "bg-green-500/20 text-green-400",
  part_time: "bg-blue-500/20 text-blue-400",
  casual: "bg-yellow-500/20 text-yellow-400",
  contractor: "bg-purple-500/20 text-purple-400",
};

const SCREENING_DOT_COLORS: Record<string, string> = {
  current: "bg-green-400",
  expiring_soon: "bg-yellow-400",
  expired: "bg-red-400",
  not_set: "bg-gray-500",
};

const SCREENING_LABELS: Record<string, string> = {
  current: "Current",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  not_set: "Not Set",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getScreeningStatus(
  expiryDate?: string
): "current" | "expiring_soon" | "expired" | "not_set" {
  if (!expiryDate) return "not_set";
  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiry < today) return "expired";
  if (expiry <= thirtyDays) return "expiring_soon";
  return "current";
}

function hasAnyScreeningWithStatus(
  member: StaffMember,
  status: string
): boolean {
  const checks = [
    getScreeningStatus(member.policeCheckExpiry),
    getScreeningStatus(member.ndisWorkerScreeningExpiry),
    getScreeningStatus(member.workingWithChildrenExpiry),
    getScreeningStatus(member.firstAidCertExpiry),
  ];
  return checks.some((s) => s === status);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  _id: Id<"staffMembers">;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  position?: string;
  employmentType: EmploymentType;
  startDate?: string;
  policeCheckNumber?: string;
  policeCheckExpiry?: string;
  ndisWorkerScreeningNumber?: string;
  ndisWorkerScreeningExpiry?: string;
  workingWithChildrenNumber?: string;
  workingWithChildrenExpiry?: string;
  ndisWorkerOrientation?: boolean;
  firstAidCertExpiry?: string;
  isActive?: boolean;
}

interface StaffFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  position: string;
  employmentType: EmploymentType;
  startDate: string;
  policeCheckNumber: string;
  policeCheckExpiry: string;
  ndisWorkerScreeningNumber: string;
  ndisWorkerScreeningExpiry: string;
  workingWithChildrenNumber: string;
  workingWithChildrenExpiry: string;
  ndisWorkerOrientation: boolean;
  firstAidCertExpiry: string;
}

const EMPTY_FORM: StaffFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  position: "",
  employmentType: "full_time",
  startDate: "",
  policeCheckNumber: "",
  policeCheckExpiry: "",
  ndisWorkerScreeningNumber: "",
  ndisWorkerScreeningExpiry: "",
  workingWithChildrenNumber: "",
  workingWithChildrenExpiry: "",
  ndisWorkerOrientation: false,
  firstAidCertExpiry: "",
};

// ── Screening Dot Component ──────────────────────────────────────────────────

function ScreeningDot({
  label,
  status,
}: {
  label: string;
  status: "current" | "expiring_soon" | "expired" | "not_set";
}) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${SCREENING_LABELS[status]}`}>
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${SCREENING_DOT_COLORS[status]}`}
        aria-hidden="true"
      />
      <span className="text-xs text-gray-400">{label}</span>
      <span className="sr-only">
        {label} status: {SCREENING_LABELS[status]}
      </span>
    </div>
  );
}

// ── Staff Card Component ─────────────────────────────────────────────────────

function StaffCard({ member }: { member: StaffMember }) {
  const empBadge =
    EMPLOYMENT_BADGE_COLORS[member.employmentType] || "bg-gray-500/20 text-gray-400";

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/80 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold truncate">
            {member.firstName} {member.lastName}
          </h3>
          {member.position && (
            <p className="text-gray-400 text-sm mt-0.5 truncate">
              {member.position}
            </p>
          )}
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ml-3 ${empBadge}`}
        >
          {formatStatus(member.employmentType)}
        </span>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-4">
        <p className="text-sm text-gray-300 truncate">
          <span className="sr-only">Email: </span>
          {member.email}
        </p>
        {member.phone && (
          <p className="text-sm text-gray-400 truncate">
            <span className="sr-only">Phone: </span>
            {member.phone}
          </p>
        )}
      </div>

      {/* Screening status row */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
          Screening Status
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ScreeningDot
            label="Police"
            status={getScreeningStatus(member.policeCheckExpiry)}
          />
          <ScreeningDot
            label="NDIS"
            status={getScreeningStatus(member.ndisWorkerScreeningExpiry)}
          />
          <ScreeningDot
            label="WWCC"
            status={getScreeningStatus(member.workingWithChildrenExpiry)}
          />
          <ScreeningDot
            label="First Aid"
            status={getScreeningStatus(member.firstAidCertExpiry)}
          />
        </div>
      </div>

      {/* View link */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <Link
          href={`/compliance/staff/${member._id}`}
          className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

// ── Add Staff Modal ──────────────────────────────────────────────────────────

function AddStaffModal({
  onClose,
  userId,
}: {
  onClose: () => void;
  userId: string;
}) {
  const [form, setForm] = useState<StaffFormData>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof StaffFormData, string>>>({});
  const createStaff = useMutation(api.staff.create);
  const { alert: alertDialog } = useConfirmDialog();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function updateField<K extends keyof StaffFormData>(key: K, value: StaffFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof StaffFormData, string>> = {};
    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email address";
    }
    if (!form.employmentType) newErrors.employmentType = "Employment type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createStaff({
        userId: userId as Id<"users">,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        position: form.position.trim() || undefined,
        employmentType: form.employmentType,
        startDate: form.startDate || undefined,
        policeCheckNumber: form.policeCheckNumber.trim() || undefined,
        policeCheckExpiry: form.policeCheckExpiry || undefined,
        ndisWorkerScreeningNumber: form.ndisWorkerScreeningNumber.trim() || undefined,
        ndisWorkerScreeningExpiry: form.ndisWorkerScreeningExpiry || undefined,
        workingWithChildrenNumber: form.workingWithChildrenNumber.trim() || undefined,
        workingWithChildrenExpiry: form.workingWithChildrenExpiry || undefined,
        ndisWorkerOrientation: form.ndisWorkerOrientation,
        firstAidCertExpiry: form.firstAidCertExpiry || undefined,
      });
      onClose();
    } catch (err) {
      await alertDialog({
        title: "Error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to create staff member. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1";
  const errorClass = "text-red-400 text-xs mt-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-staff-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h2 id="add-staff-title" className="text-lg font-semibold text-white">
            Add Staff Member
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6" noValidate>
          {/* Personal Details */}
          <fieldset>
            <legend className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
              Personal Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sf-firstName" className={labelClass}>
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="sf-firstName"
                  type="text"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Jane"
                  autoComplete="given-name"
                  required
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "err-firstName" : undefined}
                />
                {errors.firstName && (
                  <p id="err-firstName" className={errorClass} role="alert">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sf-lastName" className={labelClass}>
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="sf-lastName"
                  type="text"
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Smith"
                  autoComplete="family-name"
                  required
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "err-lastName" : undefined}
                />
                {errors.lastName && (
                  <p id="err-lastName" className={errorClass} role="alert">
                    {errors.lastName}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sf-email" className={labelClass}>
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="sf-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClass}
                  placeholder="jane.smith@example.com"
                  autoComplete="email"
                  required
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "err-email" : undefined}
                />
                {errors.email && (
                  <p id="err-email" className={errorClass} role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sf-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="sf-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={inputClass}
                  placeholder="04XX XXX XXX"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="sf-dob" className={labelClass}>
                  Date of Birth
                </label>
                <input
                  id="sf-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  className={inputClass}
                  autoComplete="bday"
                />
              </div>
            </div>
          </fieldset>

          {/* Employment Details */}
          <fieldset>
            <legend className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
              Employment Details
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sf-position" className={labelClass}>
                  Position / Title
                </label>
                <input
                  id="sf-position"
                  type="text"
                  value={form.position}
                  onChange={(e) => updateField("position", e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Support Worker"
                  autoComplete="organization-title"
                />
              </div>
              <div>
                <label htmlFor="sf-empType" className={labelClass}>
                  Employment Type <span className="text-red-400">*</span>
                </label>
                <select
                  id="sf-empType"
                  value={form.employmentType}
                  onChange={(e) =>
                    updateField("employmentType", e.target.value as EmploymentType)
                  }
                  className={inputClass}
                  required
                  aria-invalid={!!errors.employmentType}
                  aria-describedby={errors.employmentType ? "err-empType" : undefined}
                >
                  {EMPLOYMENT_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>
                      {et.label}
                    </option>
                  ))}
                </select>
                {errors.employmentType && (
                  <p id="err-empType" className={errorClass} role="alert">
                    {errors.employmentType}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="sf-startDate" className={labelClass}>
                  Start Date
                </label>
                <input
                  id="sf-startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>

          {/* Screening & Certifications */}
          <fieldset>
            <legend className="text-sm font-semibold text-white uppercase tracking-wide mb-3">
              Screening & Certifications
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sf-policeNum" className={labelClass}>
                  Police Check Number
                </label>
                <input
                  id="sf-policeNum"
                  type="text"
                  value={form.policeCheckNumber}
                  onChange={(e) => updateField("policeCheckNumber", e.target.value)}
                  className={inputClass}
                  placeholder="Certificate number"
                />
              </div>
              <div>
                <label htmlFor="sf-policeExp" className={labelClass}>
                  Police Check Expiry
                </label>
                <input
                  id="sf-policeExp"
                  type="date"
                  value={form.policeCheckExpiry}
                  onChange={(e) => updateField("policeCheckExpiry", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sf-ndisNum" className={labelClass}>
                  NDIS Worker Screening Number
                </label>
                <input
                  id="sf-ndisNum"
                  type="text"
                  value={form.ndisWorkerScreeningNumber}
                  onChange={(e) =>
                    updateField("ndisWorkerScreeningNumber", e.target.value)
                  }
                  className={inputClass}
                  placeholder="Screening number"
                />
              </div>
              <div>
                <label htmlFor="sf-ndisExp" className={labelClass}>
                  NDIS Worker Screening Expiry
                </label>
                <input
                  id="sf-ndisExp"
                  type="date"
                  value={form.ndisWorkerScreeningExpiry}
                  onChange={(e) =>
                    updateField("ndisWorkerScreeningExpiry", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sf-wwccNum" className={labelClass}>
                  Working With Children Check Number
                </label>
                <input
                  id="sf-wwccNum"
                  type="text"
                  value={form.workingWithChildrenNumber}
                  onChange={(e) =>
                    updateField("workingWithChildrenNumber", e.target.value)
                  }
                  className={inputClass}
                  placeholder="WWCC number"
                />
              </div>
              <div>
                <label htmlFor="sf-wwccExp" className={labelClass}>
                  Working With Children Check Expiry
                </label>
                <input
                  id="sf-wwccExp"
                  type="date"
                  value={form.workingWithChildrenExpiry}
                  onChange={(e) =>
                    updateField("workingWithChildrenExpiry", e.target.value)
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sf-firstAidExp" className={labelClass}>
                  First Aid Certificate Expiry
                </label>
                <input
                  id="sf-firstAidExp"
                  type="date"
                  value={form.firstAidCertExpiry}
                  onChange={(e) => updateField("firstAidCertExpiry", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ndisWorkerOrientation}
                    onChange={(e) =>
                      updateField("ndisWorkerOrientation", e.target.checked)
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-teal-600 focus:ring-teal-600 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">
                    NDIS Worker Orientation Completed
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
            >
              {isSubmitting ? "Creating..." : "Create Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Content ────────────────────────────────────────────────────────

function StaffContent() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("all");
  const [screeningFilter, setScreeningFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("sda_user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    try {
      setUser(JSON.parse(storedUser));
    } catch {
      router.push("/login");
    }
  }, [router]);

  const staffMembers = useQuery(
    api.staff.getAll,
    user ? { userId: user.id as Id<"users"> } : "skip"
  ) as StaffMember[] | undefined;

  const stats = useQuery(
    api.staff.getStats,
    user ? { userId: user.id as Id<"users"> } : "skip"
  ) as
    | {
        total: number;
        active: number;
        expiringSoon: number;
        expired: number;
      }
    | undefined;

  // Client-side filtering
  const filtered = useMemo(() => {
    if (!staffMembers) return [];
    return staffMembers.filter((s) => {
      // Search filter
      const matchesSearch =
        !search ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.position && s.position.toLowerCase().includes(search.toLowerCase()));

      // Employment type filter
      const matchesType =
        employmentFilter === "all" || s.employmentType === employmentFilter;

      // Screening status filter
      let matchesScreening = true;
      if (screeningFilter === "expiring") {
        matchesScreening = hasAnyScreeningWithStatus(s, "expiring_soon");
      } else if (screeningFilter === "expired") {
        matchesScreening = hasAnyScreeningWithStatus(s, "expired");
      } else if (screeningFilter === "current") {
        // All checks are current (none expired/expiring/not_set)
        matchesScreening =
          !hasAnyScreeningWithStatus(s, "expired") &&
          !hasAnyScreeningWithStatus(s, "expiring_soon") &&
          !hasAnyScreeningWithStatus(s, "not_set");
      }

      return matchesSearch && matchesType && matchesScreening;
    });
  }, [staffMembers, search, employmentFilter, screeningFilter]);

  const hasFilters =
    search !== "" || employmentFilter !== "all" || screeningFilter !== "all";

  // Loading state
  if (!user || staffMembers === undefined) {
    return <LoadingScreen message="Loading staff members..." />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header currentPage="compliance" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Staff Members
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Manage staff screening, certifications and compliance
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              aria-label="Add a new staff member"
            >
              + Add Staff Member
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          role="region"
          aria-label="Staff statistics"
        >
          <StatCard
            title="Total Staff"
            value={stats?.total ?? staffMembers.length}
            color="blue"
          />
          <StatCard
            title="Active"
            value={stats?.active ?? staffMembers.filter((s) => s.isActive !== false).length}
            color="green"
          />
          <StatCard
            title="Expiring Soon"
            value={
              stats?.expiringSoon ??
              staffMembers.filter((s) => hasAnyScreeningWithStatus(s, "expiring_soon")).length
            }
            color="yellow"
          />
          <StatCard
            title="Expired Checks"
            value={
              stats?.expired ??
              staffMembers.filter((s) => hasAnyScreeningWithStatus(s, "expired")).length
            }
            color="red"
          />
        </div>

        {/* Filters */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
          role="search"
          aria-label="Filter staff members"
        >
          <div>
            <label htmlFor="staff-search" className="sr-only">
              Search staff
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                id="staff-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or position..."
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
              />
            </div>
          </div>
          <div>
            <label htmlFor="staff-emp-filter" className="sr-only">
              Filter by employment type
            </label>
            <select
              id="staff-emp-filter"
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
            >
              <option value="all">All Employment Types</option>
              {EMPLOYMENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="staff-screening-filter" className="sr-only">
              Filter by screening status
            </label>
            <select
              id="staff-screening-filter"
              value={screeningFilter}
              onChange={(e) => setScreeningFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:border-teal-600 transition-colors"
            >
              <option value="all">All Screening Status</option>
              <option value="current">All Current</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">
              Showing {filtered.length} of {staffMembers.length} staff members
            </span>
            <button
              onClick={() => {
                setSearch("");
                setEmploymentFilter("all");
                setScreeningFilter("all");
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Staff Grid */}
        {staffMembers.length === 0 ? (
          <EmptyState
            title="No Staff Members"
            description="Add your first staff member to start tracking screening and certifications."
            secondaryAction={{
              label: "+ Add Staff Member",
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No Matching Staff"
            description="No staff members match your current filters."
            isFiltered
            secondaryAction={{
              label: "Clear Filters",
              onClick: () => {
                setSearch("");
                setEmploymentFilter("all");
                setScreeningFilter("all");
              },
            }}
          />
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Staff members list"
          >
            {filtered.map((member) => (
              <div key={member._id} role="listitem">
                <StaffCard member={member} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Staff Modal */}
      {showAddModal && user && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}

// ── Exported Page ────────────────────────────────────────────────────────────

export default function StaffPage() {
  return (
    <RequireAuth allowedRoles={["admin"]}>
      <StaffContent />
    </RequireAuth>
  );
}
