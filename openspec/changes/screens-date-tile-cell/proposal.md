---
kind: code
---

# Proposal: screens-date-tile-cell

## Summary

On board DcVergaderingen the "Datum en tijd" column draws a 46px tile with the day number (17px, bold) over the short
month (12px, muted). Beside it are the weekday (600) and a muted time range "09.30 tot 12.00 uur" that ends at a
second field. CnCellRenderer's `date` widget drew one line ("6 okt 2026 09:30").

The `date` widget now takes `widgetProps.layout: "block"` and `widgetProps.endField`.

## Scope

- `src/components/CnCellRenderer/CnCellRenderer.vue`: `dateBlock`, the block markup and its styles.
- `l10n/en.json`, `l10n/nl.json`: "{start} to {end}" ("{start} tot {end} uur"). The time of day reuses the existing
  "{hours}:{minutes}" string through `formatTimeOfDay`.
- No schema change: column objects and `widgetProps` are open in the v2 manifest schema.
