# Design: screens-stat-tile-parity

## Component and surface

`CnStatWidget` (layout default, `iconPlacement`, state tone) and
`src/css/kpi-card.css` (badge, no underline).

## D1. The board default layout is stacked

`cardLayout` returns `stacked` in the board look when `content.layout` is
absent. Every dashboard board (Dq, Oc, Kq, Pl, Pt, Bq, Lr, Fq, Hm) draws its
tiles as label, value, caption on three lines, so the horizontal card has
no board counterpart. An explicit `horizontal` or `vertical` is respected.

## D2. Icon at the end

`content.iconPlacement: "end"` (default: today's placement). The boards draw
three placements: an 18px glyph before the label (Oc, Kq, Pl), a tinted
square before the label (Bq, Lr), and a 32px circle at the end of the
label row (Dq; Fq draws the same at radius 8). Only the end circle is needed
for the gap, so only `end` is added; the key leaves room for more values.

The circle is drawn whether or not the tile links: an author who asks for it
gets it. The glyph-before-label rule (only on a link tile) is unchanged.

## D3. State tone

The badge tone is derived from the same `variantColor` the value uses, by
reverse lookup in the variant map: `success`, `warning`, `error` (also for
`danger`), else `primary`. Board values: primary light/deep, error #fcedec on
#a30000, success #e7f3ea on #1e6b2a. Mapped to Nextcloud tokens:
`--color-primary-element-light` / `-light-text`, and for a status the
library's status text token (`--color-text-error`, `--color-text-success`,
`--color-element-warning`) on a 10-12% `color-mix` with the main background.

## D4. Value colour

The value already takes `variantColor` as an inline style, which beats the
board stylesheet. The spec now says so: a state colours the value, success
included. The caption keeps the warning-only rule of `screens-dashboard-parity`.

## Left out

Label weight: DqDashboard draws the label at 600, PtDashboard and most
others at 400. The board look keeps 400 (`--cn-kpi-stacked-title-weight`).
