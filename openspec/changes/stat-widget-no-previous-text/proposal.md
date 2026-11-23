---
kind: code
---

# Proposal: stat-widget-no-previous-text

## Summary

A stat tile that compares with an earlier period (`previousField`) shows no sublabel at all when there is no earlier period: the previous value is missing, not numeric or `0`, so no percentage can be computed. A reader cannot tell "no change" from "nothing to compare with".

`content.noPreviousText` names that case. When `previousField` is set, `deltaField` is not, the tile has loaded and the previous value is missing, not numeric or `0`, the tile shows that text, translated like its other texts, in the trend sublabel's place in a muted colour. Omitted, nothing changes.

## Scope

- `src/components/CnStatWidget/CnStatWidget.vue`: the `noPreviousText` computed and the `cn-stat-widget__trend--none` sublabel.
- `src/schemas/app-manifest-v2.schema.json`: `noPreviousText` on the stat widget content; version 2.187.0.
- `docs/components/cn-stat-widget.md`.
