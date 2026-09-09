import {
  columnFilteringFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/angular-table';

/**
 * TanStack Table v9 is opt-in: only the features listed here ship in the bundle.
 * Defined at module scope because `injectTable` re-evaluates its initializer on
 * every signal read inside it — this must stay a stable reference.
 */
export const zenTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
});

export type ZenTableFeatures = typeof zenTableFeatures;
