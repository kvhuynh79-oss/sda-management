import { useState, useCallback, useMemo } from "react";

/**
 * Task 6B.6: useBulkSelection Hook
 *
 * Set-based selection management for bulk operations on communications.
 * Supports toggle, select all, deselect all, and shift+click range selection.
 *
 * @template T - Type of item ID (typically string)
 */
export interface UseBulkSelectionReturn<T> {
  /** Set of currently selected item IDs */
  selectedIds: Set<T>;
  /** Number of selected items */
  selectedCount: number;
  /** Whether any items are selected */
  hasSelection: boolean;
  /** Whether all visible items are selected */
  isAllSelected: boolean;
  /** Check if a specific item is selected */
  isSelected: (id: T) => boolean;
  /** Toggle selection of a single item */
  toggle: (id: T) => void;
  /** Select a range of items (for shift+click) */
  selectRange: (fromId: T, toId: T, allIds: T[]) => void;
  /** Select all items from a provided list */
  selectAll: (allIds: T[]) => void;
  /** Deselect all items */
  deselectAll: () => void;
  /** Get selected IDs as an array */
  getSelectedArray: () => T[];
}

export function useBulkSelection<T = string>(
  visibleIds: T[] = []
): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  const isSelected = useCallback(
    (id: T) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectRange = useCallback((fromId: T, toId: T, allIds: T[]) => {
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1) return;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    setSelectedIds(prev => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(allIds[i]);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: T[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedArray = useCallback(
    () => [...selectedIds],
    [selectedIds]
  );

  return useMemo(
    () => ({
      selectedIds,
      selectedCount,
      hasSelection,
      isAllSelected,
      isSelected,
      toggle,
      selectRange,
      selectAll,
      deselectAll,
      getSelectedArray,
    }),
    [selectedIds, selectedCount, hasSelection, isAllSelected, isSelected, toggle, selectRange, selectAll, deselectAll, getSelectedArray]
  );
}
