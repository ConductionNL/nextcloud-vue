---
kind: code
---

# Proposal: screens-titled-grid-item-fits

## Summary

On a detail page a bare `custom` widget gets its heading from the page (an `<h3>` in the grid item). The grid item
was 100% of its cell and the widget under the heading took 100% too, so every titled custom card overflowed its cell
by the heading's height, 31px, whatever the cell's `gridHeight` (dossiq's case type cards "Statuses" and "Portal").
The heading and the widget now share the cell.

## Scope

- `src/css/detail-page.css` only. Grid items without a page-drawn heading, and `sizeToContent` items, are unchanged.
