/**
 * Consultation Gate - Smart Workflow Trigger for Complex Communications
 *
 * Automatically identifies communications requiring follow-up coordination
 * based on NDIS compliance complexity, stakeholder involvement, and urgency.
 *
 * Trigger Conditions:
 * 1. Multi-stakeholder complexity (3+ unique stakeholder types in thread)
 * 2. Non-routine compliance category
 * 3. Documentation or time-sensitive flags
 * 4. Participant involved + NDIA/advocate/guardian contact
 *
 * @module consultationGate
 */

/**
 * Communication data required for gate evaluation
 */
export interface CommunicationForGate {
  _id: string;
  threadId?: string;
  complianceCategory?: string;
  complianceFlags?: string[];
  isParticipantInvolved?: boolean;
  contactType: string;
  stakeholderEntityType?: string;
  participantId?: string;
}

/**
 * Result of consultation gate check
 */
export interface ConsultationGateResult {
  /** Whether the gate was triggered */
  triggered: boolean;
  /** Reason(s) why gate was triggered */
  reasons: string[];
  /** Recommended priority for follow-up task */
  recommendedPriority: "high" | "medium" | "normal";
  /** Recommended due date offset (milliseconds from now) */
  recommendedDueDateOffset: number;
}

/**
 * Checks if a communication should trigger the Consultation Gate.
 *
 * Gate triggers when communication complexity requires coordination:
 * - Multi-stakeholder involvement (3+ types)
 * - Non-routine compliance matters
 * - Documentation/time-sensitive requirements
 * - Participant + regulatory contact (NDIA/advocate/guardian)
 *
 * @param communication - Communication to evaluate
 * @param threadCommunications - All communications in the same thread (for stakeholder counting)
 * @returns Gate evaluation result with trigger status and reasons
 */
export function checkConsultationGate(
  communication: CommunicationForGate,
  threadCommunications: CommunicationForGate[] = []
): ConsultationGateResult {
  const reasons: string[] = [];
  let triggered = false;

  // CONDITION 1: Multi-stakeholder complexity (3+ unique stakeholder types in thread)
  if (communication.threadId && threadCommunications.length > 0) {
    // Include current communication in stakeholder analysis
    const allComms = [...threadCommunications, communication];

    // Count unique stakeholder types
    const stakeholderTypes = new Set<string>();
    for (const comm of allComms) {
      if (comm.stakeholderEntityType) {
        stakeholderTypes.add(comm.stakeholderEntityType);
      } else {
        // Fallback to contactType if stakeholderEntityType not set
        stakeholderTypes.add(comm.contactType);
      }
    }

    if (stakeholderTypes.size >= 3) {
      triggered = true;
      reasons.push(`Multi-stakeholder complexity: ${stakeholderTypes.size} stakeholder types detected`);
    }
  }

  // CONDITION 2: Non-routine compliance category
  const complianceCategory = communication.complianceCategory;
  if (complianceCategory && complianceCategory !== "routine" && complianceCategory !== "none") {
    triggered = true;
    reasons.push(`Non-routine compliance category: ${complianceCategory}`);
  }

  // CONDITION 3: Documentation or time-sensitive flags
  const complianceFlags = communication.complianceFlags || [];
  if (complianceFlags.includes("requires_documentation")) {
    triggered = true;
    reasons.push("Documentation requirements flagged");
  }
  if (complianceFlags.includes("time_sensitive")) {
    triggered = true;
    reasons.push("Time-sensitive communication flagged");
  }

  // CONDITION 4: Participant involved + regulatory contact (NDIA/advocate/guardian)
  const isParticipantInvolved = communication.isParticipantInvolved || !!communication.participantId;
  const regulatoryContactTypes = ["ndia", "advocate", "guardian"];
  if (isParticipantInvolved && regulatoryContactTypes.includes(communication.contactType)) {
    triggered = true;
    reasons.push(`Participant-involved regulatory contact: ${communication.contactType}`);
  }

  // CALCULATE RECOMMENDED PRIORITY & DUE DATE
  let recommendedPriority: "high" | "medium" | "normal" = "normal";
  let recommendedDueDateOffset = 7 * 24 * 60 * 60 * 1000; // Default: 7 days

  if (complianceCategory === "incident_related") {
    recommendedPriority = "high";
    recommendedDueDateOffset = 24 * 60 * 60 * 1000; // 24 hours
  } else if (complianceCategory === "complaint" || complianceCategory === "safeguarding") {
    recommendedPriority = "medium";
    if (complianceCategory === "complaint") {
      recommendedDueDateOffset = 5 * 24 * 60 * 60 * 1000; // 5 days
    } else {
      recommendedDueDateOffset = 48 * 60 * 60 * 1000; // 48 hours
    }
  } else if (complianceFlags.includes("time_sensitive")) {
    recommendedPriority = "medium";
    recommendedDueDateOffset = 3 * 24 * 60 * 60 * 1000; // 3 days
  }

  return {
    triggered,
    reasons,
    recommendedPriority,
    recommendedDueDateOffset,
  };
}

/**
 * Get human-readable description of gate trigger
 *
 * @param result - Consultation gate result
 * @returns Human-readable summary
 */
export function getGateTriggerSummary(result: ConsultationGateResult): string {
  if (!result.triggered) {
    return "Consultation Gate not triggered - routine communication";
  }

  return `Consultation Gate triggered: ${result.reasons.join("; ")}`;
}
