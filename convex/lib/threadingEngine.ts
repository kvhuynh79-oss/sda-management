/**
 * Threading Engine - Smart Auto-Threading for Communications
 *
 * Implements fuzzy matching algorithms to automatically group related
 * communications into conversation threads based on contact similarity,
 * subject matching, time proximity, and communication type.
 *
 * @module threadingEngine
 */

/**
 * Calculates Levenshtein distance between two strings.
 * Returns a similarity score from 0 (completely different) to 1 (identical).
 *
 * Used for fuzzy contact name matching (threshold: 0.85)
 * Examples:
 * - "John Smith" vs "Jon Smith" → 0.91 (match)
 * - "John Smith" vs "Jane Doe" → 0.10 (no match)
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score (0-1)
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  // Normalize inputs
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();

  // Handle edge cases
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  // Create distance matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  // Convert distance to similarity (0-1)
  const maxLength = Math.max(a.length, b.length);
  const distance = matrix[b.length][a.length];
  return 1 - (distance / maxLength);
}

/**
 * Calculates Jaccard similarity between two strings using word tokens.
 * Returns a similarity score from 0 (no overlap) to 1 (identical).
 *
 * Used for fuzzy subject matching (threshold: 0.7)
 * Examples:
 * - "NDIS Plan Review" vs "Re: NDIS Plan Review" → 0.75 (match)
 * - "NDIS Plan Review" vs "Incident Report" → 0.0 (no match)
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score (0-1)
 */
export function jaccardSimilarity(str1: string, str2: string): number {
  // Normalize and tokenize
  const tokens1 = normalizeSubject(str1).split(/\s+/).filter(t => t.length > 0);
  const tokens2 = normalizeSubject(str2).split(/\s+/).filter(t => t.length > 0);

  // Handle edge cases
  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  // Create sets for comparison
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  // Calculate intersection
  const intersection = new Set([...set1].filter(x => set2.has(x)));

  // Calculate union
  const union = new Set([...set1, ...set2]);

  // Jaccard index = |intersection| / |union|
  return intersection.size / union.size;
}

/**
 * Normalizes a subject line by removing common prefixes, stopwords,
 * and standardizing format for better matching.
 *
 * @param subject - Raw subject line
 * @returns Normalized subject string
 */
export function normalizeSubject(subject: string | undefined): string {
  if (!subject) return "";

  let normalized = subject.toLowerCase().trim();

  // Remove email reply/forward prefixes
  normalized = normalized.replace(/^(re|fwd|fw|forward):\s*/gi, "");

  // Remove multiple spaces and normalize
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Remove common stopwords (but keep important NDIS terms)
  const stopwords = ["the", "a", "an", "about", "for", "with", "and", "or"];
  const words = normalized.split(" ");
  const filtered = words.filter(word => !stopwords.includes(word));

  return filtered.join(" ");
}

/**
 * Normalizes a contact name for better matching.
 * Handles variations in formatting, titles, and whitespace.
 *
 * @param name - Raw contact name
 * @returns Normalized name string
 */
export function normalizeContactName(name: string | undefined): string {
  if (!name) return "";

  let normalized = name.toLowerCase().trim();

  // Remove common titles
  normalized = normalized.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/gi, "");

  // Remove multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Thread matching thresholds
 */
export const THREADING_THRESHOLDS = {
  /** Contact name similarity (Levenshtein) */
  CONTACT_NAME: 0.85,
  /** Subject similarity (Jaccard) */
  SUBJECT: 0.7,
  /** Overall thread matching score */
  THREAD_MATCH: 0.6,
  /** Thread suggestion score (lower for manual review) */
  SUGGESTION: 0.5,
  /** Time window for auto-threading (milliseconds) */
  TIME_WINDOW_MS: 12 * 60 * 60 * 1000, // 12 hours
} as const;

/**
 * Scoring weights for thread matching algorithm
 */
export const SCORING_WEIGHTS = {
  /** Contact name match weight */
  CONTACT: 0.40,
  /** Subject match weight */
  SUBJECT: 0.30,
  /** Time proximity weight */
  TIME: 0.20,
  /** Same communication type weight */
  TYPE: 0.10,
} as const;

/**
 * Communication data structure for thread matching
 */
export interface CommunicationForThreading {
  _id: string;
  contactName: string;
  subject?: string;
  communicationType: string;
  communicationDate: string;
  communicationTime?: string;
  createdAt: number;
  threadId?: string;
  participantId?: string;
}

/**
 * Result of findOrCreateThread operation
 */
export interface ThreadMatchResult {
  /** Thread ID (existing or newly generated) */
  threadId: string;
  /** True if a new thread was created */
  isNewThread: boolean;
  /** Match score (0-1) if matched to existing thread */
  matchScore: number;
  /** Reason for match/new thread */
  reason: string;
}

/**
 * Finds an existing thread for the communication or creates a new one.
 *
 * Auto-threading algorithm:
 * 1. Search communications from last 12 hours with same participant
 * 2. Score each candidate thread:
 *    - Contact name match (Levenshtein): 40%
 *    - Subject match (Jaccard): 30%
 *    - Time proximity (recent = higher): 20%
 *    - Same communication type: 10%
 * 3. If best score > 0.6, add to existing thread
 * 4. Otherwise, create new thread ID
 *
 * @param newComm - Communication to thread
 * @param recentComms - Recent communications (12-hour window, same participant)
 * @returns Thread match result
 */
export function findOrCreateThread(
  newComm: CommunicationForThreading,
  recentComms: CommunicationForThreading[]
): ThreadMatchResult {
  // If no recent communications, create new thread
  if (recentComms.length === 0) {
    return {
      threadId: generateThreadId(),
      isNewThread: true,
      matchScore: 0,
      reason: "No recent communications found - new thread created"
    };
  }

  // Group communications by threadId to score each thread
  const threadGroups = new Map<string, CommunicationForThreading[]>();
  for (const comm of recentComms) {
    if (comm.threadId) {
      if (!threadGroups.has(comm.threadId)) {
        threadGroups.set(comm.threadId, []);
      }
      threadGroups.get(comm.threadId)!.push(comm);
    }
  }

  // If no threads found in recent communications, create new thread
  if (threadGroups.size === 0) {
    return {
      threadId: generateThreadId(),
      isNewThread: true,
      matchScore: 0,
      reason: "No existing threads in window - new thread created"
    };
  }

  // Score each thread
  let bestMatch: { threadId: string; score: number; reason: string } | null = null;

  for (const [threadId, threadComms] of threadGroups.entries()) {
    // Use the most recent communication in the thread as the comparison point
    const referenceComm = threadComms.sort((a, b) => b.createdAt - a.createdAt)[0];

    const score = calculateThreadMatchScore(newComm, referenceComm);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        threadId,
        score,
        reason: `Matched to existing thread (contact: ${(score * SCORING_WEIGHTS.CONTACT).toFixed(2)}, subject: ${(score * SCORING_WEIGHTS.SUBJECT).toFixed(2)})`
      };
    }
  }

  // If best score meets threshold, add to existing thread
  if (bestMatch && bestMatch.score >= THREADING_THRESHOLDS.THREAD_MATCH) {
    return {
      threadId: bestMatch.threadId,
      isNewThread: false,
      matchScore: bestMatch.score,
      reason: bestMatch.reason
    };
  }

  // Create new thread
  return {
    threadId: generateThreadId(),
    isNewThread: true,
    matchScore: bestMatch?.score || 0,
    reason: `Score ${(bestMatch?.score || 0).toFixed(2)} below threshold ${THREADING_THRESHOLDS.THREAD_MATCH} - new thread created`
  };
}

/**
 * Calculates match score between two communications.
 *
 * Scoring breakdown:
 * - Contact name (40%): Levenshtein similarity
 * - Subject (30%): Jaccard similarity
 * - Time proximity (20%): Exponential decay over 12 hours
 * - Same type (10%): Boolean match
 *
 * @param comm1 - First communication
 * @param comm2 - Second communication
 * @returns Match score (0-1)
 */
function calculateThreadMatchScore(
  comm1: CommunicationForThreading,
  comm2: CommunicationForThreading
): number {
  // Contact name score (40%)
  const contactScore = levenshteinSimilarity(
    normalizeContactName(comm1.contactName),
    normalizeContactName(comm2.contactName)
  );

  // Subject score (30%)
  const subjectScore = jaccardSimilarity(
    comm1.subject || "",
    comm2.subject || ""
  );

  // Time proximity score (20%)
  // Exponential decay: 1.0 at 0 hours, 0.5 at 6 hours, 0.0 at 12 hours
  const timeDiff = Math.abs(comm1.createdAt - comm2.createdAt);
  const timeScore = Math.max(0, 1 - (timeDiff / THREADING_THRESHOLDS.TIME_WINDOW_MS));

  // Same communication type score (10%)
  const typeScore = comm1.communicationType === comm2.communicationType ? 1.0 : 0.0;

  // Weighted total
  const totalScore =
    (contactScore * SCORING_WEIGHTS.CONTACT) +
    (subjectScore * SCORING_WEIGHTS.SUBJECT) +
    (timeScore * SCORING_WEIGHTS.TIME) +
    (typeScore * SCORING_WEIGHTS.TYPE);

  return totalScore;
}

/**
 * Generates a unique thread ID using timestamp and random string.
 * Format: thread_{timestamp}_{random}
 *
 * @returns Unique thread ID
 */
function generateThreadId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `thread_${timestamp}_${random}`;
}
