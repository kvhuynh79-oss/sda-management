import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

// Re-export the built-in pagination validator for use in queries
export const paginationArgs = {
  paginationOpts: paginationOptsValidator,
};

// Default page size
export const DEFAULT_PAGE_SIZE = 25;

// Standard pagination result type
export interface PaginatedResult<T> {
  page: T[];
  isDone: boolean;
  continueCursor: string;
  totalCount?: number;
}

// Validator for cursor-based pagination (manual implementation for complex queries)
export const cursorPaginationArgs = {
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
};

// Helper to apply offset-limit pagination to an array (for client-side pagination of complex queries)
export function applyOffsetPagination<T>(
  items: T[],
  offset: number = 0,
  limit: number = DEFAULT_PAGE_SIZE
): { items: T[]; hasMore: boolean; totalCount: number } {
  const totalCount = items.length;
  const paginatedItems = items.slice(offset, offset + limit);
  const hasMore = offset + limit < totalCount;

  return {
    items: paginatedItems,
    hasMore,
    totalCount,
  };
}
