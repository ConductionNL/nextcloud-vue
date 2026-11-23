---
kind: code
---

# Proposal: side-notice-card

## Summary

Board DqSociaalDomein draws a warning in the case's side column: one amber box with an icon, "**Bijzondere persoonsgegevens: gezondheid.** Elke inzage wordt gelogd met het doel." A `banner` there renders a Nextcloud note card inside the side column's notice box (two boxes), ignores a title, and takes one tone whatever its variant. Widget type `notice` (CnNoticeWidget) draws the board's box: variant tone and icon, bold title and text through the host translate. The surfaces already apply `visibleWhen`.

## Scope

- New `src/components/CnNoticeWidget/`, exported, and built-in widget type `notice` (`BUILT_IN_WIDGETS`, `LIBRARY_WIDGET_KEYS`).
- No change to CnDetailPage: its side column renders a built-in type through CnDetailWidgetHost and gates it by `visibleWhen`.
- Manifest schema: `notice` joins the widget type list the batch integration bumps.
