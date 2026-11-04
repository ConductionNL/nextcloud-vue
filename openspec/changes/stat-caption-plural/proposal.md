---
kind: code
---

# Proposal: stat-caption-plural

## Summary

Dossiq's start page tile "Due this week" carries the caption "{count} ends today". In Dutch that reads "2 loopt
vandaag af", because a stat caption has one form for every count.

`content.caption` can now be `{ singular, plural }`. The caption's own count picks the form (`captionSource`), or the
tile's number when the caption has none. Each form is translated on its own, so "1 loopt vandaag af" and "2 lopen
vandaag af" both read right. A string caption works as before.

## Scope

- `src/components/CnStatWidget/CnStatWidget.vue`: `captionSourceText` picks the form; `resolvedCaption` reads it.
- `docs/components/cn-stat-widget.md`: the plural caption.
- No manifest schema change: a stat widget's `content` keeps additional keys.
