---
kind: code
---

# Proposal: screens-chart-canvas-fits

## Summary

Three charts on pipelinq's Rapportage were 4 to 7px taller inside than their canvas box and drew a vertical scrollbar
(measured on :8080, read-only). The canvas had `overflow-x: hidden`, which turns the other axis into `auto`, and the
chart's SVG was an inline box, which adds the line's descender space under it. The canvas no longer scrolls and the
SVG is a block.

## Scope

- `src/components/CnChartWidget/CnChartWidget.vue` styles only. No prop or manifest change.
