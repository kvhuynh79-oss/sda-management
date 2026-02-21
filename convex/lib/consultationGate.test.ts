import { describe, it, expect } from "vitest";
import {
  checkConsultationGate,
  getGateTriggerSummary,
  type CommunicationForGate,
} from "./consultationGate";

function makeComm(overrides: Partial<CommunicationForGate> = {}): CommunicationForGate {
  return {
    _id: "comm_1",
    contactType: "staff",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkConsultationGate
// ---------------------------------------------------------------------------
describe("checkConsultationGate", () => {
  // -------------------------------------------------------------------------
  // Condition 1: Multi-stakeholder complexity
  // -------------------------------------------------------------------------
  describe("multi-stakeholder complexity", () => {
    it("triggers when 3+ unique stakeholder types exist in a thread", () => {
      const comm = makeComm({
        threadId: "thread_1",
        stakeholderEntityType: "support_coordinator",
      });

      const threadComms: CommunicationForGate[] = [
        makeComm({ _id: "c1", threadId: "thread_1", stakeholderEntityType: "participant" }),
        makeComm({ _id: "c2", threadId: "thread_1", stakeholderEntityType: "sil_provider" }),
      ];

      const result = checkConsultationGate(comm, threadComms);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toContain(
        expect.stringContaining("Multi-stakeholder complexity")
      );
    });

    it("does not trigger with fewer than 3 stakeholder types", () => {
      const comm = makeComm({
        threadId: "thread_1",
        stakeholderEntityType: "staff",
      });

      const threadComms: CommunicationForGate[] = [
        makeComm({ _id: "c1", threadId: "thread_1", stakeholderEntityType: "staff" }),
      ];

      const result = checkConsultationGate(comm, threadComms);
      // Only checks multi-stakeholder condition here - not triggered
      expect(result.reasons).not.toContain(
        expect.stringContaining("Multi-stakeholder complexity")
      );
    });

    it("does not check multi-stakeholder if no threadId", () => {
      const comm = makeComm({ stakeholderEntityType: "support_coordinator" });

      const threadComms: CommunicationForGate[] = [
        makeComm({ _id: "c1", stakeholderEntityType: "participant" }),
        makeComm({ _id: "c2", stakeholderEntityType: "sil_provider" }),
      ];

      const result = checkConsultationGate(comm, threadComms);
      expect(result.reasons).not.toContain(
        expect.stringContaining("Multi-stakeholder complexity")
      );
    });

    it("falls back to contactType if stakeholderEntityType is not set", () => {
      const comm = makeComm({
        threadId: "thread_1",
        contactType: "ndia",
      });

      const threadComms: CommunicationForGate[] = [
        makeComm({ _id: "c1", threadId: "thread_1", contactType: "advocate" }),
        makeComm({ _id: "c2", threadId: "thread_1", contactType: "guardian" }),
      ];

      const result = checkConsultationGate(comm, threadComms);
      expect(result.triggered).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Condition 2: Non-routine compliance category
  // -------------------------------------------------------------------------
  describe("non-routine compliance category", () => {
    it("triggers for non-routine compliance category", () => {
      const comm = makeComm({ complianceCategory: "incident_related" });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toContain(
        expect.stringContaining("Non-routine compliance category")
      );
    });

    it("triggers for complaint category", () => {
      const comm = makeComm({ complianceCategory: "complaint" });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
    });

    it("triggers for safeguarding category", () => {
      const comm = makeComm({ complianceCategory: "safeguarding" });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
    });

    it("does not trigger for routine category", () => {
      const comm = makeComm({ complianceCategory: "routine" });
      const result = checkConsultationGate(comm);
      expect(result.reasons).not.toContain(
        expect.stringContaining("Non-routine compliance category")
      );
    });

    it("does not trigger for 'none' category", () => {
      const comm = makeComm({ complianceCategory: "none" });
      const result = checkConsultationGate(comm);
      expect(result.reasons).not.toContain(
        expect.stringContaining("Non-routine compliance category")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Condition 3: Documentation or time-sensitive flags
  // -------------------------------------------------------------------------
  describe("compliance flags", () => {
    it("triggers for requires_documentation flag", () => {
      const comm = makeComm({ complianceFlags: ["requires_documentation"] });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toContain("Documentation requirements flagged");
    });

    it("triggers for time_sensitive flag", () => {
      const comm = makeComm({ complianceFlags: ["time_sensitive"] });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toContain("Time-sensitive communication flagged");
    });

    it("triggers for both flags simultaneously", () => {
      const comm = makeComm({
        complianceFlags: ["requires_documentation", "time_sensitive"],
      });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toHaveLength(2);
    });

    it("does not trigger for other flags", () => {
      const comm = makeComm({ complianceFlags: ["ndia_reportable"] });
      const result = checkConsultationGate(comm);
      expect(result.reasons).not.toContain("Documentation requirements flagged");
      expect(result.reasons).not.toContain("Time-sensitive communication flagged");
    });
  });

  // -------------------------------------------------------------------------
  // Condition 4: Participant + regulatory contact
  // -------------------------------------------------------------------------
  describe("participant + regulatory contact", () => {
    it("triggers for NDIA contact with participant involvement", () => {
      const comm = makeComm({
        contactType: "ndia",
        isParticipantInvolved: true,
      });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
      expect(result.reasons).toContain(
        expect.stringContaining("Participant-involved regulatory contact")
      );
    });

    it("triggers for advocate contact with participantId", () => {
      const comm = makeComm({
        contactType: "advocate",
        participantId: "participant_123",
      });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
    });

    it("triggers for guardian contact", () => {
      const comm = makeComm({
        contactType: "guardian",
        isParticipantInvolved: true,
      });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(true);
    });

    it("does not trigger for non-regulatory contact with participant", () => {
      const comm = makeComm({
        contactType: "staff",
        isParticipantInvolved: true,
      });
      const result = checkConsultationGate(comm);
      expect(result.reasons).not.toContain(
        expect.stringContaining("Participant-involved regulatory contact")
      );
    });

    it("does not trigger for regulatory contact without participant", () => {
      const comm = makeComm({
        contactType: "ndia",
        isParticipantInvolved: false,
      });
      const result = checkConsultationGate(comm);
      expect(result.reasons).not.toContain(
        expect.stringContaining("Participant-involved regulatory contact")
      );
    });
  });

  // -------------------------------------------------------------------------
  // Priority and due date calculations
  // -------------------------------------------------------------------------
  describe("priority and due date calculations", () => {
    it("sets high priority and 24hr due date for incident_related", () => {
      const comm = makeComm({ complianceCategory: "incident_related" });
      const result = checkConsultationGate(comm);
      expect(result.recommendedPriority).toBe("high");
      expect(result.recommendedDueDateOffset).toBe(24 * 60 * 60 * 1000);
    });

    it("sets medium priority and 5-day due date for complaint", () => {
      const comm = makeComm({ complianceCategory: "complaint" });
      const result = checkConsultationGate(comm);
      expect(result.recommendedPriority).toBe("medium");
      expect(result.recommendedDueDateOffset).toBe(5 * 24 * 60 * 60 * 1000);
    });

    it("sets medium priority and 48hr due date for safeguarding", () => {
      const comm = makeComm({ complianceCategory: "safeguarding" });
      const result = checkConsultationGate(comm);
      expect(result.recommendedPriority).toBe("medium");
      expect(result.recommendedDueDateOffset).toBe(48 * 60 * 60 * 1000);
    });

    it("sets medium priority and 3-day due date for time_sensitive flag", () => {
      const comm = makeComm({ complianceFlags: ["time_sensitive"] });
      const result = checkConsultationGate(comm);
      expect(result.recommendedPriority).toBe("medium");
      expect(result.recommendedDueDateOffset).toBe(3 * 24 * 60 * 60 * 1000);
    });

    it("defaults to normal priority and 7-day due date", () => {
      const comm = makeComm({
        complianceFlags: ["requires_documentation"],
      });
      const result = checkConsultationGate(comm);
      expect(result.recommendedPriority).toBe("normal");
      expect(result.recommendedDueDateOffset).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  // -------------------------------------------------------------------------
  // Not triggered
  // -------------------------------------------------------------------------
  describe("not triggered", () => {
    it("does not trigger for routine communication", () => {
      const comm = makeComm({
        contactType: "staff",
        complianceCategory: "routine",
      });
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it("does not trigger for communication with no special attributes", () => {
      const comm = makeComm();
      const result = checkConsultationGate(comm);
      expect(result.triggered).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// getGateTriggerSummary
// ---------------------------------------------------------------------------
describe("getGateTriggerSummary", () => {
  it("returns summary when triggered", () => {
    const result = {
      triggered: true,
      reasons: ["Non-routine compliance category: incident_related"],
      recommendedPriority: "high" as const,
      recommendedDueDateOffset: 24 * 60 * 60 * 1000,
    };
    const summary = getGateTriggerSummary(result);
    expect(summary).toContain("Consultation Gate triggered");
    expect(summary).toContain("incident_related");
  });

  it("returns not triggered message when not triggered", () => {
    const result = {
      triggered: false,
      reasons: [],
      recommendedPriority: "normal" as const,
      recommendedDueDateOffset: 7 * 24 * 60 * 60 * 1000,
    };
    const summary = getGateTriggerSummary(result);
    expect(summary).toContain("not triggered");
  });
});
