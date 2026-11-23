---
kind: code
---

# Proposal: stat-caption-ratio

## Summary

Board ShDebiteurenbeheer puts a share under each age tile: "EUR 14.320,00, 15% van open". A stat caption could carry
its own count (`captionSource`, `{count}`), but not a share of a total, so shillinq's tiles read "{count} facturen".

`captionSource.kind: "ratio"` makes the caption a share: the `numerator` over the `denominator`, times 100. The parts
have the shape of the parts of a tile's own `ratio` source (`{ metric?, field?, filter?, via? }`). Without a
`numerator` the tile's own value is the numerator, so a bucket tile divides its own sum by the open total with one
extra request. `{ratio}` (and `{count}`) in the caption is the share, rounded to `decimals` (0 by default) in the
reader's locale.

## Scope

- `src/components/CnStatWidget/CnStatWidget.vue`: `isCaptionRatio`, `captionCount`, `formatCaptionRatio`;
  `fetchCaptionValue` reads the parts. `captionVariantWhen` tests the share for a ratio caption.
- `docs/components/cn-stat-widget.md`: the ratio caption.
- No manifest schema change: a stat widget's `content` keeps additional keys.
- A `captionSource` without `kind` counts as before.
