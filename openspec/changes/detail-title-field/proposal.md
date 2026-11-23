---
kind: code
---

# Proposal: detail-title-field

## Summary

The shillinq invoice page shows "Debiteurenfactuur" as its heading: OpenRegister puts the schema title in the
invoice's `@self.name`, and the detail page names a record by its display name. The board names the invoice by its
number. A page could already name its breadcrumb by a field (`breadcrumb.currentField`), but not its heading.

A detail page now takes `titleField` (manifest `config.titleField`, a dotted path). When the record's value there is
filled, it is the record's name: the heading, the current breadcrumb crumb and the type eyebrow (shown because the
name now differs from the type label) all follow. An empty or missing value falls back to the display name.

## Scope

- `src/components/CnDetailPage/CnDetailPage.vue`: prop `titleField`, `objectDisplayName`.
- Manifest schema (version assigned by the coordinator): page `config.titleField` already exists for wiki pages; its
  description now also covers type='detail'. No new key, so a manifest valid before stays valid.
- Without `titleField` nothing changes.
