---
kind: code
---

# Proposal: screens-reports-page-board-look

## Summary

CnReportsPage had no board look: under `look: "board"` decidiq's Rapportages still drew the Nextcloud page (a category
select over one grid of small cards). Board DcRapportages draws a 28px title over a muted lead, one section per
category headed at 18px, and two-up cards (padding 18px 20px, radius 12px) with the report's icon in a 44px tile, the
title at 17px bold and the description at 14px muted.

## Scope

- `src/components/CnReportsPage/CnReportsPage.vue`: `useLook`, the `look` prop, `boardSections`, the board template.
- `src/css/look-board-reports.css` (imported by `src/css/index.css`), scoped under `.cn-look-board` with the page guard.
- `docs/components/cn-reports-page.md`.
- No manifest schema change: `cards[].icon` and `look` already exist.

## Not in this change

- The board's header buttons (Downloaden and the buildiq square): a reports page has no header buttons to configure.
