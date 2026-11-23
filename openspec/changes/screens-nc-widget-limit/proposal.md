---
kind: code
---

# Proposal: screens-nc-widget-limit

## Summary

A Nextcloud dashboard widget on a board dashboard (launchpad's activity widget) drew all its items and scrolled
inside its cell: a 411px list in a 172px body. `content.limit` caps the list so the widget fits its cell, with a
"Show all" link to the rest when the widget names a page (or `showAllUrl` is set).

## Scope

- `src/components/CnNcWidgetWidget/CnNcWidgetWidget.vue`: `limit`, `showAllUrl`, `showAllLabel`.
- No manifest schema change: widget `content` is free-form. Without `limit` the widget is what it was.
