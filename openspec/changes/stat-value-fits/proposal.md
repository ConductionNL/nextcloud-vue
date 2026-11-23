---
kind: code
---

# Proposal: stat-value-fits

## Summary

On pipelinq's operational dashboard at 1100 wide, the "Pipeline value" tile reads "€ 1.012.4": the number does not fit the 162px tile and the card's `overflow: hidden` cuts it mid-digit. #1621 let a tile grow in height, not the value in width. The container query that steps a narrow tile's number down to 1.25rem never reaches a stacked board tile, because the stacked rule is more specific.

`CnStatWidget` now fits its number. When the value row overflows, the number's font steps down by the share that overflows (measured on mount, on every value change and on every resize of the row), never below 14px, and at 14px a number that still does not fit wraps instead of clipping. A number that fits keeps its own size, so every tile that renders today keeps its pixels. A text value keeps its own wrap and clamp.

Also, CnRegisterMapping drew "Register" twice above its register select: a manual `<label>` and NcSelect's own `inputLabel`. The manual label is gone, so the one label is NcSelect's, wired to the input.

## Scope

- `src/components/CnStatWidget/CnStatWidget.vue`: `fitValue()`, a ResizeObserver on the value row, `fitFontSize` in `valueStyle`.
- `src/components/CnRegisterMapping/CnRegisterMapping.vue`: the manual register label and its CSS.
- No schema change.
