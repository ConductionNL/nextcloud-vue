---
kind: code
---

# Proposal: screens-stats-block-tile-box

## Summary

A stats-block with `layout: "grid"` draws its tiles as parts of one card, without a box (screens-stats-block-grid),
as board PqMijnWerk draws "Je week tot nu toe". Board DcRapportages draws the figures of "Vergaderingen en
efficiëntie" each on a grey tile of its own: padding 14px 16px, radius 10px, the work ground as background, 12px apart.
One app needs the box and the other must not get it, so the box is an opt-in on the widget: `content.tiles: "box"`.

## Scope

- `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue`: the `tiles` prop, the `--tiles-box` class and its rules.
- `src/components/CnDashboardPage/CnDashboardPage.vue`: `getStatsBlockProps` forwards `content.tiles`.
- `docs/components/cn-stats-block-widget.md`.
- No manifest schema change: a stats-block's `content` is free-form, as `layout` and `columns` are.

## Not in this change

- decidiq's manifest: the `efficiency` widget on the Reports page adds `"tiles": "box"` in an app PR.
