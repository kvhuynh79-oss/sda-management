"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// BLS-SOP-001: Complaints Management & Resolution
// Official internal procedure document - Better Living Solutions
// Version 2026.1 | NDIS (Complaints Management and Resolution) Rules 2018
// ---------------------------------------------------------------------------

interface SOP001OverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    number: 1,
    title: "Receipt & Initial Triage",
    subtitle: "Immediate",
    timeframe: "Immediately upon receipt",
    color: "blue",
    content: [
      "When a complaint arrives via the website or phone, it is automatically/manually logged in MySDAManager.",
      "A unique Reference ID (CMP-YYYYMMDD-XXXX) is automatically generated for tracking.",
      'Risk Check: Staff must immediately determine if the complaint involves a "Reportable Incident" (abuse, neglect, exploitation, or serious injury).',
      "MANDATORY: If it is a Reportable Incident, the Director must notify the NDIS Commission within 24 hours.",
      "Assign initial severity (Low / Medium / High / Critical) and complaint category.",
    ],
    keyRef: "NDIS (Incident Management and Reportable Incidents) Rules 2018, Section 16",
    mandatory: 'If the complaint involves a Reportable Incident, the Director must notify the NDIS Commission within 24 hours via their online portal.',
  },
  {
    number: 2,
    title: "Acknowledgement",
    subtitle: "Within 24 Hours",
    timeframe: "Within 24 hours of receipt",
    color: "green",
    content: [
      "Contact the complainant via their preferred method (captured in the web form: phone, email, letter, or in person).",
      "Acknowledge receipt of the complaint and provide the Unique Reference Number.",
      "Give an estimated timeframe for resolution (target: 21 days).",
      "Advocacy: Remind the participant they have the right to use an advocate (like a family member or professional advocacy service) to help them.",
      "Record the acknowledgment date, method, and any advocacy details in MySDAManager.",
      "The 24-hour countdown timer in MySDAManager tracks this deadline automatically.",
    ],
    keyRef: "NDIS Practice Standards, Module 6 - Feedback and Complaints Management",
    mandatory: null,
  },
  {
    number: 3,
    title: "Investigation",
    subtitle: "Days 2-14",
    timeframe: "Days 2-14",
    color: "purple",
    content: [
      "Review relevant data in MySDAManager. If the complaint is about a property issue, consult MMZ Building Solutions records.",
      "Assign an investigator (must not be the subject of the complaint).",
      "Gather evidence: review property logs, communication threads, incident reports, and maintenance records in MySDAManager.",
      "Interview relevant parties: complainant, staff, participants, witnesses.",
      "Documentation: All conversations, site visits, and evidence must be uploaded to the complaint record in the app. Keep notes objective and factual.",
      "Keep the complainant informed of progress at regular intervals.",
      "If the investigation requires more than 21 days, notify the complainant and provide a revised timeline.",
    ],
    keyRef: "NDIS Practice Standards, Core Module 6.3 - Complaints Resolution",
    mandatory: null,
  },
  {
    number: 4,
    title: "Resolution & Outcome",
    subtitle: "Target: 21 Days",
    timeframe: "Within 21 days of receipt",
    color: "yellow",
    content: [
      'Decide on the Outcome (e.g., apology, repair, policy change). Options: Upheld, Partially Upheld, Not Upheld, or Withdrawn.',
      "Send a formal Outcome Letter to the complainant explaining the findings and any actions taken.",
      "Document corrective actions implemented (staff training, process changes, property repairs, etc.).",
      "MANDATORY: Every outcome letter must include instructions on how to contact the NDIS Quality and Safeguards Commission if they are dissatisfied with the result.",
      "Record whether the complainant is satisfied with the resolution.",
      "Identify if this is a systemic issue requiring broader organisational review.",
      "If escalation is needed: use the 'Escalate to NDIS Commission' function in MySDAManager.",
    ],
    keyRef: "NDIS Practice Standards, Core Module 6.4 - Complaints Outcomes",
    mandatory: 'Every outcome letter must include instructions on how to contact the NDIS Quality and Safeguards Commission (1800 035 544).',
  },
  {
    number: 5,
    title: "Closing & Learning",
    subtitle: "After Resolution Confirmed",
    timeframe: "After resolution confirmed",
    color: "gray",
    content: [
      "Close the record in MySDAManager. Confirm complainant satisfaction.",
      'Review: At the monthly management meeting, review the "Complaints Register" to identify patterns (e.g., repeated issues at a specific SDA property) that require a systemic fix.',
      "If systemic issue identified: escalate to management for policy/procedure review.",
      "Update staff training materials if knowledge gaps were identified.",
      "Ensure all documentation is complete for NDIS audit purposes (7-year retention).",
      "The Chain of Custody in MySDAManager provides a complete, tamper-proof audit trail of all actions taken.",
    ],
    keyRef: "NDIS Practice Standards, Core Module 6.5 - Continuous Improvement",
    mandatory: null,
  },
];

const STEP_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue: { bg: "bg-teal-950/30", border: "border-teal-700/40", text: "text-teal-500", badge: "bg-teal-700" },
  green: { bg: "bg-green-900/30", border: "border-green-600/40", text: "text-green-400", badge: "bg-green-600" },
  purple: { bg: "bg-purple-900/30", border: "border-purple-600/40", text: "text-purple-400", badge: "bg-purple-600" },
  yellow: { bg: "bg-yellow-900/30", border: "border-yellow-600/40", text: "text-yellow-400", badge: "bg-yellow-600" },
  gray: { bg: "bg-gray-800/50", border: "border-gray-600/40", text: "text-gray-300", badge: "bg-gray-600" },
};

export default function SOP001Overlay({ isOpen, onClose }: SOP001OverlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap + close on Escape
  useEffect(() => {
    if (!isOpen) return;

    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="BLS-SOP-001: Complaints Management & Resolution"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 w-full max-w-4xl mx-4 my-8 rounded-xl shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 rounded-t-xl px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-0.5 bg-teal-700/20 text-teal-500 text-xs font-mono rounded">
                BLS-SOP-001
              </span>
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs font-mono rounded">
                v2026.1
              </span>
              <span className="text-gray-400 text-xs">
                INTERNAL PROCEDURE
              </span>
            </div>
            <h1 className="text-xl font-bold text-white">
              Complaints Management & Resolution
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Better Living Solutions | NDIS Compliance
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 shrink-0"
            aria-label="Close procedure document"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Document metadata */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Document ID</p>
              <p className="text-white font-mono">BLS-SOP-001</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Version</p>
              <p className="text-white">2026.1</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Entity</p>
              <p className="text-white">Better Living Solutions</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Classification</p>
              <p className="text-white">Internal Use Only</p>
            </div>
          </div>
        </div>

        {/* Section 1: Purpose */}
        <div className="px-6 py-5 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
            1. Purpose
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            To ensure all complaints regarding Better Living Solutions are handled fairly, quickly,
            and in compliance with the <strong className="text-white">NDIS (Complaints Management and Resolution) Rules 2018</strong>.
            This procedure applies to all BLS staff, contractors, and management involved in the delivery
            of Specialist Disability Accommodation (SDA) services. All complaints must be logged in
            MySDAManager to maintain a complete, auditable chain of custody.
          </p>
        </div>

        {/* Key Timeframes */}
        <div className="px-6 py-4 bg-teal-950/10 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-teal-500 mb-3">Key Compliance Timeframes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-red-400 font-bold text-sm">24h</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Acknowledge</p>
                <p className="text-gray-400 text-xs">Contact complainant</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-yellow-400 font-bold text-sm">21d</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Resolution</p>
                <p className="text-gray-400 text-xs">Written outcome</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
              <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-purple-400 font-bold text-sm">24h</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Reportable</p>
                <p className="text-gray-400 text-xs">NDIS Commission</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-lg">
              <div className="w-10 h-10 bg-gray-600/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-gray-300 font-bold text-sm">7yr</span>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Retention</p>
                <p className="text-gray-400 text-xs">Audit records</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 5-Step Resolution Lifecycle */}
        <div className="px-6 py-6 space-y-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            2. The 5-Step Resolution Lifecycle
          </h2>

          {STEPS.map((step) => {
            const colors = STEP_COLORS[step.color];
            return (
              <div
                key={step.number}
                className={`${colors.bg} border ${colors.border} rounded-lg overflow-hidden`}
              >
                {/* Step header */}
                <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-700/50">
                  <div className={`w-8 h-8 ${colors.badge} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold">
                      Step {step.number}: {step.title}
                    </h3>
                    <p className={`text-sm ${colors.text}`}>{step.subtitle}</p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-800/60 px-2 py-1 rounded whitespace-nowrap">
                    {step.timeframe}
                  </span>
                </div>

                {/* Step content */}
                <div className="px-5 py-4">
                  <ul className="space-y-2">
                    {step.content.map((item, idx) => {
                      const isMandatory = item.startsWith("MANDATORY:");
                      return (
                        <li key={idx} className={`flex items-start gap-2 text-sm ${isMandatory ? "text-red-300 font-medium" : "text-gray-300"}`}>
                          <span className={`mt-0.5 shrink-0 ${isMandatory ? "text-red-400" : "text-gray-500"}`}>
                            {isMandatory ? "!" : "\u2022"}
                          </span>
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Mandatory callout */}
                  {step.mandatory && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                      <p className="text-xs text-red-300 font-medium flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {step.mandatory}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-700/30">
                    <p className="text-xs text-gray-400">
                      <span className="font-medium text-gray-300">Reference:</span> {step.keyRef}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 3: Compliance Contacts */}
        <div className="px-6 py-5 bg-gray-800/50 border-t border-gray-700">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            3. Compliance Contacts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-700/40 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">NDIS Quality and Safeguards Commission</p>
              <p className="text-white text-lg font-bold font-mono">1800 035 544</p>
              <a
                href="https://www.ndiscommission.gov.au/participants/complaints"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-500 text-xs hover:text-teal-400 underline mt-1 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
              >
                www.ndiscommission.gov.au
              </a>
            </div>
            <div className="p-4 bg-gray-700/40 rounded-lg">
              <p className="text-gray-400 text-xs mb-1">Internal Escalation</p>
              <p className="text-white text-lg font-bold">Director, Better Living Solutions</p>
              <p className="text-gray-400 text-xs mt-1">
                All reportable incidents and unresolved complaints
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 rounded-b-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-400">
              <p>
                <strong className="text-gray-300">Approved by:</strong> Director, Better Living Solutions
              </p>
              <p className="mt-0.5">
                <strong className="text-gray-300">Regulatory basis:</strong> NDIS Act 2013,
                NDIS (Complaints Management and Resolution) Rules 2018,
                NDIS Practice Standards (July 2021)
              </p>
              <p className="mt-0.5">
                <strong className="text-gray-300">Retention:</strong> 7 years from complaint closure (NDIS records requirement)
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 shrink-0"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
