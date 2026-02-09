"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FormInput, FormSelect, FormTextarea, Button } from "../forms";
import type {
  Lead,
  LeadStatus,
  SdaCategory,
  UrgencyLevel,
  ReferrerType,
  LeadSource,
} from "./LeadsView";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadFormData {
  // Referrer
  referrerType: ReferrerType;
  referrerName: string;
  referrerPhone: string;
  referrerEmail: string;
  referrerOrganization: string;
  referrerEntityId: string;
  // Participant
  participantName: string;
  ndisNumber: string;
  participantAge: string;
  participantGender: string;
  // Housing needs
  sdaCategory: SdaCategory | "";
  preferredAreas: string[];
  preferredState: string;
  specificRequirements: string;
  budgetNotes: string;
  // Tracking
  source: LeadSource | "";
  urgency: UrgencyLevel | "";
  notes: string;
}

const EMPTY_FORM: LeadFormData = {
  referrerType: "ot",
  referrerName: "",
  referrerPhone: "",
  referrerEmail: "",
  referrerOrganization: "",
  referrerEntityId: "",
  participantName: "",
  ndisNumber: "",
  participantAge: "",
  participantGender: "",
  sdaCategory: "",
  preferredAreas: [],
  preferredState: "",
  specificRequirements: "",
  budgetNotes: "",
  source: "",
  urgency: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Option constants
// ---------------------------------------------------------------------------

const REFERRER_TYPE_OPTIONS = [
  { value: "ot", label: "Occupational Therapist" },
  { value: "sc", label: "Support Coordinator" },
  { value: "other", label: "Other" },
];

const SDA_CATEGORY_OPTIONS = [
  { value: "high_physical_support", label: "High Physical Support (HPS)" },
  { value: "robust", label: "Robust" },
  { value: "fully_accessible", label: "Fully Accessible (FA)" },
  { value: "improved_liveability", label: "Improved Liveability (IL)" },
];

const SOURCE_OPTIONS = [
  { value: "phone", label: "Phone Call" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const STATE_OPTIONS = [
  { value: "", label: "Any state" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

// ---------------------------------------------------------------------------
// Area Tag Input
// ---------------------------------------------------------------------------

function AreaTagInput({
  areas,
  onChange,
}: {
  areas: string[];
  onChange: (areas: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
        e.preventDefault();
        const newArea = inputValue.trim();
        if (!areas.includes(newArea)) {
          onChange([...areas, newArea]);
        }
        setInputValue("");
      } else if (e.key === "Backspace" && inputValue === "" && areas.length > 0) {
        onChange(areas.slice(0, -1));
      }
    },
    [inputValue, areas, onChange]
  );

  const handleRemove = useCallback(
    (area: string) => {
      onChange(areas.filter((a) => a !== area));
    },
    [areas, onChange]
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Preferred Areas
      </label>
      <div
        className="flex flex-wrap gap-1.5 p-2 bg-gray-700 border border-gray-600 rounded-lg min-h-[2.5rem] cursor-text focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-teal-600 transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {areas.map((area) => (
          <span
            key={area}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-600 text-gray-200 rounded-md border border-gray-500"
          >
            {area}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(area);
              }}
              className="text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-600 rounded"
              aria-label={`Remove ${area}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={areas.length === 0 ? "Type suburb and press Enter..." : "Add more..."}
          className="flex-1 min-w-[8rem] bg-transparent text-white text-sm placeholder-gray-400 outline-none"
          aria-label="Add preferred area"
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Type a suburb name and press Enter to add it as a tag.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Form Component
// ---------------------------------------------------------------------------

interface LeadFormProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  editLead?: Lead | null;
  onSubmit?: (data: LeadFormData) => Promise<void>;
}

export function LeadForm({ userId, isOpen, onClose, editLead, onSubmit }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Query OTs and SCs from database for dropdown
  const ots = useQuery(
    api.occupationalTherapists.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const scs = useQuery(
    api.supportCoordinators.getAll,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  // Mutation for creating/updating leads
  const createLead = useMutation(api.leads.create);
  const updateLead = useMutation(api.leads.update);

  // Populate form when editing
  useEffect(() => {
    if (editLead) {
      setFormData({
        referrerType: editLead.referrerType,
        referrerName: editLead.referrerName,
        referrerPhone: editLead.referrerPhone || "",
        referrerEmail: editLead.referrerEmail || "",
        referrerOrganization: editLead.referrerOrganization || "",
        referrerEntityId: editLead.referrerEntityId || "",
        participantName: editLead.participantName,
        ndisNumber: editLead.ndisNumber || "",
        participantAge: editLead.participantAge ? String(editLead.participantAge) : "",
        participantGender: editLead.participantGender || "",
        sdaCategory: editLead.sdaCategory,
        preferredAreas: [...editLead.preferredAreas],
        preferredState: editLead.preferredState || "",
        specificRequirements: editLead.specificRequirements || "",
        budgetNotes: editLead.budgetNotes || "",
        source: editLead.source,
        urgency: editLead.urgency,
        notes: editLead.notes || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setErrors({});
  }, [editLead, isOpen]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus first input
    setTimeout(() => firstInputRef.current?.focus(), 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Build entity dropdown options
  const entityOptions = useMemo(() => {
    if (formData.referrerType === "ot" && ots) {
      return ots.map((ot: any) => ({
        value: ot._id,
        label: `${ot.firstName} ${ot.lastName}${ot.organization ? ` - ${ot.organization}` : ""}`,
      }));
    }
    if (formData.referrerType === "sc" && scs) {
      return scs.map((sc: any) => ({
        value: sc._id,
        label: `${sc.firstName} ${sc.lastName}${sc.organization ? ` - ${sc.organization}` : ""}`,
      }));
    }
    return [];
  }, [formData.referrerType, ots, scs]);

  // Auto-fill when selecting an existing OT/SC
  const handleEntitySelect = useCallback(
    (entityId: string) => {
      setFormData((prev) => {
        const updated = { ...prev, referrerEntityId: entityId };

        if (entityId) {
          // Find the entity and auto-fill
          if (prev.referrerType === "ot" && ots) {
            const ot = ots.find((o: any) => o._id === entityId);
            if (ot) {
              updated.referrerName = `${(ot as any).firstName} ${(ot as any).lastName}`;
              updated.referrerPhone = (ot as any).phone || "";
              updated.referrerEmail = (ot as any).email || "";
              updated.referrerOrganization = (ot as any).organization || "";
            }
          } else if (prev.referrerType === "sc" && scs) {
            const sc = scs.find((s: any) => s._id === entityId);
            if (sc) {
              updated.referrerName = `${(sc as any).firstName} ${(sc as any).lastName}`;
              updated.referrerPhone = (sc as any).phone || "";
              updated.referrerEmail = (sc as any).email || "";
              updated.referrerOrganization = (sc as any).organization || "";
            }
          }
        }

        return updated;
      });
    },
    [ots, scs]
  );

  // Handle referrer type change - reset entity selection
  const handleReferrerTypeChange = useCallback((type: string) => {
    setFormData((prev) => ({
      ...prev,
      referrerType: type as ReferrerType,
      referrerEntityId: "",
      referrerName: "",
      referrerPhone: "",
      referrerEmail: "",
      referrerOrganization: "",
    }));
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.participantName.trim()) {
      newErrors.participantName = "Participant name is required";
    }
    if (!formData.referrerName.trim()) {
      newErrors.referrerName = "Referrer name is required";
    }
    if (!formData.sdaCategory) {
      newErrors.sdaCategory = "SDA category is required";
    }
    if (!formData.source) {
      newErrors.source = "Source is required";
    }
    if (!formData.urgency) {
      newErrors.urgency = "Urgency is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);
      try {
        // Map frontend referrerType to backend values
        const referrerTypeMap: Record<string, string> = {
          ot: "occupational_therapist",
          sc: "support_coordinator",
          other: "other",
        };

        // Map frontend gender to backend values (non_binary not in backend schema, map to other)
        const genderMap: Record<string, string> = {
          male: "male",
          female: "female",
          non_binary: "other",
          prefer_not_to_say: "prefer_not_to_say",
        };

        if (editLead) {
          // Update existing lead
          await updateLead({
            userId: userId as Id<"users">,
            leadId: editLead._id as Id<"leads">,
            referrerType: referrerTypeMap[formData.referrerType] as any,
            referrerId: formData.referrerEntityId || undefined,
            referrerName: formData.referrerName,
            referrerPhone: formData.referrerPhone || undefined,
            referrerEmail: formData.referrerEmail || undefined,
            referrerOrganization: formData.referrerOrganization || undefined,
            participantName: formData.participantName,
            participantNdisNumber: formData.ndisNumber || undefined,
            participantAge: formData.participantAge ? parseInt(formData.participantAge) : undefined,
            participantGender: formData.participantGender && genderMap[formData.participantGender]
              ? (genderMap[formData.participantGender] as any)
              : undefined,
            sdaCategoryNeeded: formData.sdaCategory as any,
            preferredAreas: formData.preferredAreas,
            preferredState: formData.preferredState || undefined,
            specificRequirements: formData.specificRequirements || undefined,
            budgetNotes: formData.budgetNotes || undefined,
            urgency: formData.urgency as any,
            source: formData.source as any,
            notes: formData.notes || undefined,
          });
        } else {
          // Create new lead
          await createLead({
            userId: userId as Id<"users">,
            referrerType: referrerTypeMap[formData.referrerType] as any,
            referrerId: formData.referrerEntityId || undefined,
            referrerName: formData.referrerName,
            referrerPhone: formData.referrerPhone || undefined,
            referrerEmail: formData.referrerEmail || undefined,
            referrerOrganization: formData.referrerOrganization || undefined,
            participantName: formData.participantName,
            participantNdisNumber: formData.ndisNumber || undefined,
            participantAge: formData.participantAge ? parseInt(formData.participantAge) : undefined,
            participantGender: formData.participantGender && genderMap[formData.participantGender]
              ? (genderMap[formData.participantGender] as any)
              : undefined,
            sdaCategoryNeeded: formData.sdaCategory as any,
            preferredAreas: formData.preferredAreas,
            preferredState: formData.preferredState || undefined,
            specificRequirements: formData.specificRequirements || undefined,
            budgetNotes: formData.budgetNotes || undefined,
            urgency: formData.urgency as any,
            source: formData.source as any,
            notes: formData.notes || undefined,
          });
        }

        if (onSubmit) {
          await onSubmit(formData);
        }
        onClose();
        setFormData(EMPTY_FORM);
      } catch (error) {
        console.error("Failed to save lead:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, onSubmit, onClose, createLead, updateLead, editLead, userId]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={editLead ? "Edit Lead" : "New Lead"}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl mx-4 my-4 sm:my-8"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-bold text-white">
            {editLead ? "Edit Lead" : "New Lead"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Referrer */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Referrer Information
            </legend>
            <div className="space-y-3">
              <FormSelect
                ref={firstInputRef}
                label="Referrer Type"
                value={formData.referrerType}
                onChange={(e) => handleReferrerTypeChange(e.target.value)}
                options={REFERRER_TYPE_OPTIONS}
                required
                placeholder=""
              />

              {/* Entity dropdown for OT/SC */}
              {(formData.referrerType === "ot" || formData.referrerType === "sc") && (
                <FormSelect
                  label={formData.referrerType === "ot" ? "Select OT from Database" : "Select SC from Database"}
                  value={formData.referrerEntityId}
                  onChange={(e) => handleEntitySelect(e.target.value)}
                  options={[
                    { value: "", label: "-- Manual entry --" },
                    ...entityOptions,
                  ]}
                  placeholder=""
                  helperText="Select from database to auto-fill details, or leave blank for manual entry."
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Name"
                  value={formData.referrerName}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerName: e.target.value }))}
                  required
                  error={errors.referrerName}
                  placeholder="Full name"
                />
                <FormInput
                  label="Organization"
                  value={formData.referrerOrganization}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerOrganization: e.target.value }))}
                  placeholder="Company / practice name"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormInput
                  label="Phone"
                  type="tel"
                  value={formData.referrerPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerPhone: e.target.value }))}
                  placeholder="04XX XXX XXX"
                  autoComplete="tel"
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={formData.referrerEmail}
                  onChange={(e) => setFormData((p) => ({ ...p, referrerEmail: e.target.value }))}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </fieldset>

          {/* Section 2: Participant */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Participant Details
            </legend>
            <div className="space-y-3">
              <FormInput
                label="Participant Name"
                value={formData.participantName}
                onChange={(e) => setFormData((p) => ({ ...p, participantName: e.target.value }))}
                required
                error={errors.participantName}
                placeholder="Full name of participant"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput
                  label="NDIS Number"
                  value={formData.ndisNumber}
                  onChange={(e) => setFormData((p) => ({ ...p, ndisNumber: e.target.value }))}
                  placeholder="Optional"
                />
                <FormInput
                  label="Age"
                  type="number"
                  value={formData.participantAge}
                  onChange={(e) => setFormData((p) => ({ ...p, participantAge: e.target.value }))}
                  placeholder="Optional"
                  min="0"
                  max="120"
                />
                <FormSelect
                  label="Gender"
                  value={formData.participantGender}
                  onChange={(e) => setFormData((p) => ({ ...p, participantGender: e.target.value }))}
                  options={GENDER_OPTIONS}
                  placeholder=""
                />
              </div>
            </div>
          </fieldset>

          {/* Section 3: Housing Needs */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Housing Needs
            </legend>
            <div className="space-y-3">
              <FormSelect
                label="SDA Category"
                value={formData.sdaCategory}
                onChange={(e) => setFormData((p) => ({ ...p, sdaCategory: e.target.value as SdaCategory }))}
                options={SDA_CATEGORY_OPTIONS}
                required
                error={errors.sdaCategory}
              />

              <AreaTagInput
                areas={formData.preferredAreas}
                onChange={(areas) => setFormData((p) => ({ ...p, preferredAreas: areas }))}
              />

              <FormSelect
                label="Preferred State"
                value={formData.preferredState}
                onChange={(e) => setFormData((p) => ({ ...p, preferredState: e.target.value }))}
                options={STATE_OPTIONS}
                placeholder=""
              />

              <FormTextarea
                label="Specific Requirements"
                value={formData.specificRequirements}
                onChange={(e) => setFormData((p) => ({ ...p, specificRequirements: e.target.value }))}
                placeholder="E.g. wheelchair accessible, ceiling hoists, sensory room, proximity to services..."
                rows={3}
              />

              <FormTextarea
                label="Budget Notes"
                value={formData.budgetNotes}
                onChange={(e) => setFormData((p) => ({ ...p, budgetNotes: e.target.value }))}
                placeholder="Any budget or funding details..."
                rows={2}
              />
            </div>
          </fieldset>

          {/* Section 4: Tracking */}
          <fieldset>
            <legend className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
              Tracking
            </legend>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormSelect
                  label="Source"
                  value={formData.source}
                  onChange={(e) => setFormData((p) => ({ ...p, source: e.target.value as LeadSource }))}
                  options={SOURCE_OPTIONS}
                  required
                  error={errors.source}
                />
                <FormSelect
                  label="Urgency"
                  value={formData.urgency}
                  onChange={(e) => setFormData((p) => ({ ...p, urgency: e.target.value as UrgencyLevel }))}
                  options={URGENCY_OPTIONS}
                  required
                  error={errors.urgency}
                />
              </div>

              <FormTextarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes about this lead..."
                rows={3}
              />
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmitting}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            >
              {editLead ? "Update Lead" : "Create Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LeadForm;
