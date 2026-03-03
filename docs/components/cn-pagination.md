---
sidebar_position: 13
---

# CnPagination

Full pagination with page numbers, first/prev/next/last navigation, and page size selector. Shows up to 7 page numbers with ellipsis for large datasets.

**Wraps**: NcButton, NcSelect

![CnPagination showing item count and page navigation controls](/img/screenshots/cn-pagination.png)

![CnPagination showing item count "Showing 5 of 5" and page navigation controls](/img/screenshots/cn-pagination.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | Number | `1` | 1-based page number |
| `totalPages` | Number | `1` | |
| `totalItems` | Number | `0` | |
| `currentPageSize` | Number | `20` | |
| `pageSizeOptions` | Array | `[10, 20, 50, 100, 250, 500, 1000]` | |
| `minItemsToShow` | Number | `10` | Min items before showing pagination |
| `firstLabel` | String | `'First'` | |
| `previousLabel` | String | `'Previous'` | |
| `nextLabel` | String | `'Next'` | |
| `lastLabel` | String | `'Last'` | |
| `itemsPerPageLabel` | String | `'Items per page:'` | |
| `pageInfoFormat` | String | `'Page \{current\} of \{total\}'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `page-changed` | `pageNum` | Page number changed |
| `page-size-changed` | `size` | Page size changed |

## Usage

```vue
<CnPagination
  :current-page="pagination.currentPage"
  :total-pages="pagination.totalPages"
  :total-items="pagination.totalItems"
  :current-page-size="pagination.pageSize"
  @page-changed="onPageChanged"
  @page-size-changed="onPageSizeChanged" />
```
