---
kind: code
---

# Proposal: record-list-dot-flags

## Summary

Board DqZaaktypeOverzicht lists a case type's statuses with a colour dot before each name and a muted flag at the end ("Start", "Termijn opgeschort", "Eind"). A record-list row had no dot and no conditional end text. `dot` and `flags` add them.

## Scope

- `src/components/CnRecordListWidget/CnRecordListWidget.vue`: `dot`, `flags` on both row variants.
- Manifest: `dot` and `flags` are new record-list content keys; the batch integration adds them to the schema.
