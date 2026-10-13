---
kind: code
---

# Proposal: screens-stat-caption-source

## Summary

Boards PtDashboard and DqMijnWerk draw a KPI tile with a line under the number that counts something else: 3 open
requests, "1 wacht al 6 dagen" under it in the accent colour. A stat tile's caption could only repeat the tile's own
value (`{value}`) or read fields of an endpoint payload. This change gives the caption a count of its own
(`captionSource`), so the tile is manifest configuration.

## Scope

- `src/components/CnStatWidget/CnStatWidget.vue`: `content.captionSource`, the `{count}` token, the caption rule on
  that count, the zero text.
- No manifest schema change: widget `content` is free-form. A tile without `captionSource` renders exactly as before.
