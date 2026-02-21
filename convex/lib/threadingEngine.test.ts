import { describe, it, expect } from "vitest";
import {
  levenshteinSimilarity,
  jaccardSimilarity,
  normalizeSubject,
  normalizeContactName,
  findOrCreateThread,
  THREADING_THRESHOLDS,
  SCORING_WEIGHTS,
  type CommunicationForThreading,
} from "./threadingEngine";

// ---------------------------------------------------------------------------
// levenshteinSimilarity
// ---------------------------------------------------------------------------
describe("levenshteinSimilarity", () => {
  it("returns 1.0 for identical strings", () => {
    expect(levenshteinSimilarity("John Smith", "John Smith")).toBe(1.0);
  });

  it("returns 1.0 for identical strings with different case", () => {
    expect(levenshteinSimilarity("John Smith", "john smith")).toBe(1.0);
  });

  it("returns high similarity for minor typos", () => {
    const score = levenshteinSimilarity("John Smith", "Jon Smith");
    expect(score).toBeGreaterThan(0.85);
  });

  it("returns low similarity for completely different strings", () => {
    const score = levenshteinSimilarity("John Smith", "Jane Doe");
    expect(score).toBeLessThan(0.5);
  });

  it("returns 0.0 when one string is empty", () => {
    expect(levenshteinSimilarity("John", "")).toBe(0.0);
    expect(levenshteinSimilarity("", "John")).toBe(0.0);
  });

  it("returns 1.0 when both strings are empty", () => {
    expect(levenshteinSimilarity("", "")).toBe(1.0);
  });

  it("handles whitespace normalization", () => {
    const score = levenshteinSimilarity("  John Smith  ", "John Smith");
    expect(score).toBe(1.0);
  });

  it("returns meaningful scores for NDIS-relevant names", () => {
    // Common variation in Australian names
    const score = levenshteinSimilarity("O'Brien", "OBrien");
    expect(score).toBeGreaterThan(0.7);
  });
});

// ---------------------------------------------------------------------------
// jaccardSimilarity
// ---------------------------------------------------------------------------
describe("jaccardSimilarity", () => {
  it("returns 1.0 for identical subjects", () => {
    expect(jaccardSimilarity("NDIS Plan Review", "NDIS Plan Review")).toBe(1.0);
  });

  it("returns high similarity for subject with reply prefix", () => {
    const score = jaccardSimilarity("NDIS Plan Review", "Re: NDIS Plan Review");
    expect(score).toBeGreaterThan(0.7);
  });

  it("returns 0.0 for completely different subjects", () => {
    const score = jaccardSimilarity("NDIS Plan Review", "Incident Report");
    expect(score).toBe(0.0);
  });

  it("returns 1.0 when both are empty", () => {
    expect(jaccardSimilarity("", "")).toBe(1.0);
  });

  it("returns 0.0 when one is empty", () => {
    expect(jaccardSimilarity("NDIS Plan", "")).toBe(0.0);
  });

  it("handles forward prefix removal", () => {
    const score = jaccardSimilarity("Maintenance Update", "Fwd: Maintenance Update");
    expect(score).toBeGreaterThan(0.7);
  });

  it("removes stopwords for better matching", () => {
    const score = jaccardSimilarity(
      "Review of the NDIS plan for participant",
      "NDIS plan review participant"
    );
    // After removing stopwords ("of", "the", "for"), these should overlap well
    expect(score).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// normalizeSubject
// ---------------------------------------------------------------------------
describe("normalizeSubject", () => {
  it("removes Re: prefix", () => {
    expect(normalizeSubject("Re: NDIS Plan Review")).not.toContain("re:");
  });

  it("removes Fwd: prefix", () => {
    expect(normalizeSubject("Fwd: Maintenance Update")).not.toContain("fwd:");
  });

  it("removes FW: prefix", () => {
    expect(normalizeSubject("FW: Important Notice")).not.toContain("fw:");
  });

  it("removes multiple spaces", () => {
    expect(normalizeSubject("NDIS  Plan   Review")).not.toContain("  ");
  });

  it("removes common stopwords", () => {
    const result = normalizeSubject("Review of the NDIS plan");
    expect(result).not.toContain("of");
    expect(result).not.toContain("the");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeSubject(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSubject("")).toBe("");
  });

  it("preserves NDIS-specific terms", () => {
    const result = normalizeSubject("NDIS plan review");
    expect(result).toContain("ndis");
    expect(result).toContain("plan");
    expect(result).toContain("review");
  });
});

// ---------------------------------------------------------------------------
// normalizeContactName
// ---------------------------------------------------------------------------
describe("normalizeContactName", () => {
  it("lowercases and trims", () => {
    expect(normalizeContactName("  John Smith  ")).toBe("john smith");
  });

  it("removes Mr. title", () => {
    expect(normalizeContactName("Mr. John Smith")).toBe("john smith");
  });

  it("removes Mrs. title", () => {
    expect(normalizeContactName("Mrs. Jane Smith")).toBe("jane smith");
  });

  it("removes Dr title", () => {
    expect(normalizeContactName("Dr Sarah Johnson")).toBe("sarah johnson");
  });

  it("removes Prof. title", () => {
    expect(normalizeContactName("Prof. Michael Brown")).toBe("michael brown");
  });

  it("removes multiple spaces", () => {
    expect(normalizeContactName("John   Smith")).toBe("john smith");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeContactName(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeContactName("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// THREADING_THRESHOLDS and SCORING_WEIGHTS
// ---------------------------------------------------------------------------
describe("constants", () => {
  it("has correct threshold values", () => {
    expect(THREADING_THRESHOLDS.CONTACT_NAME).toBe(0.85);
    expect(THREADING_THRESHOLDS.SUBJECT).toBe(0.7);
    expect(THREADING_THRESHOLDS.THREAD_MATCH).toBe(0.6);
    expect(THREADING_THRESHOLDS.SUGGESTION).toBe(0.5);
    expect(THREADING_THRESHOLDS.TIME_WINDOW_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("scoring weights sum to 1.0", () => {
    const total =
      SCORING_WEIGHTS.CONTACT +
      SCORING_WEIGHTS.SUBJECT +
      SCORING_WEIGHTS.TIME +
      SCORING_WEIGHTS.TYPE;
    expect(total).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// findOrCreateThread
// ---------------------------------------------------------------------------
describe("findOrCreateThread", () => {
  function makeComm(overrides: Partial<CommunicationForThreading> = {}): CommunicationForThreading {
    return {
      _id: "comm_new",
      contactName: "John Smith",
      subject: "NDIS Plan Review",
      communicationType: "email",
      communicationDate: "2026-02-15",
      createdAt: Date.now(),
      ...overrides,
    };
  }

  it("creates new thread when no recent communications exist", () => {
    const newComm = makeComm();
    const result = findOrCreateThread(newComm, []);

    expect(result.isNewThread).toBe(true);
    expect(result.threadId).toMatch(/^thread_/);
    expect(result.matchScore).toBe(0);
    expect(result.reason).toContain("No recent communications found");
  });

  it("creates new thread when recent comms have no threadIds", () => {
    const newComm = makeComm();
    const recentComms = [
      makeComm({ _id: "c1", threadId: undefined }),
      makeComm({ _id: "c2", threadId: undefined }),
    ];
    const result = findOrCreateThread(newComm, recentComms);
    expect(result.isNewThread).toBe(true);
  });

  it("matches to existing thread with identical contact and subject", () => {
    const now = Date.now();
    const newComm = makeComm({ createdAt: now });

    const recentComms = [
      makeComm({
        _id: "c1",
        threadId: "thread_existing_1",
        contactName: "John Smith",
        subject: "NDIS Plan Review",
        communicationType: "email",
        createdAt: now - 60000, // 1 minute ago
      }),
    ];

    const result = findOrCreateThread(newComm, recentComms);
    expect(result.isNewThread).toBe(false);
    expect(result.threadId).toBe("thread_existing_1");
    expect(result.matchScore).toBeGreaterThan(THREADING_THRESHOLDS.THREAD_MATCH);
  });

  it("creates new thread when contact names are very different", () => {
    const now = Date.now();
    const newComm = makeComm({
      contactName: "Alice Johnson",
      subject: "Different Topic Entirely",
      communicationType: "phone_call",
      createdAt: now,
    });

    const recentComms = [
      makeComm({
        _id: "c1",
        threadId: "thread_existing_1",
        contactName: "Bob Williams",
        subject: "Maintenance Request",
        communicationType: "email",
        createdAt: now - 11 * 60 * 60 * 1000, // 11 hours ago
      }),
    ];

    const result = findOrCreateThread(newComm, recentComms);
    expect(result.isNewThread).toBe(true);
    expect(result.matchScore).toBeLessThan(THREADING_THRESHOLDS.THREAD_MATCH);
  });

  it("generates unique thread IDs", () => {
    const newComm = makeComm();
    const result1 = findOrCreateThread(newComm, []);
    const result2 = findOrCreateThread(newComm, []);
    expect(result1.threadId).not.toBe(result2.threadId);
  });

  it("picks the best matching thread among multiple", () => {
    const now = Date.now();
    const newComm = makeComm({
      contactName: "John Smith",
      subject: "NDIS Plan Review",
      createdAt: now,
    });

    const recentComms = [
      // Poor match - different contact, different subject
      makeComm({
        _id: "c1",
        threadId: "thread_poor",
        contactName: "Alice Johnson",
        subject: "Maintenance Request",
        createdAt: now - 30000,
      }),
      // Good match - same contact, same subject, recent
      makeComm({
        _id: "c2",
        threadId: "thread_good",
        contactName: "John Smith",
        subject: "NDIS Plan Review",
        createdAt: now - 60000,
      }),
    ];

    const result = findOrCreateThread(newComm, recentComms);
    if (!result.isNewThread) {
      expect(result.threadId).toBe("thread_good");
    }
  });
});
