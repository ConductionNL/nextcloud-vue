# Design: screens-dashboard-greeting-header

## Component and surface

`CnDashboardPage` (header subtitle, switch row, Actions menu), manifest
schema (page config `greeting`, `viewLinks`, `showActionsMenu`).

## D1. Greeting in the subtitle

Same wording and thresholds as CnHeaderWidget's greeting (before 12: morning,
before 18: afternoon, else evening; the `nextcloud-vue` catalogue already
carries "Good afternoon, {name}"), the first word of the display name unless
`"full"`. The date is `Intl.DateTimeFormat(getCanonicalLocale(), { weekday:
'long', day: 'numeric', month: 'long', year: 'numeric' })`, so Dutch reads
"maandag 5 oktober 2026". The description, translated, is the last part. A
page that sets `greeting` no longer needs a greeting header widget on its grid.

## D2. The switch row

Rendered under the header (inside the `showHeader` contract) when the board
look moves the view switch there, or when `viewLinks` has an entry. Order in
the DOM is the visual order: switch, spacer, pills (WCAG 1.3.2). A pill is a
`router-link` for `route` (a name or a location) and an `a` for `href`. The
icon is a CnWidgetIcon at 14px. Colours from Nextcloud tokens:
`--color-primary-element-light` / `--color-primary-element-light-text`.

## D3. Without the board look

The view switch stays among the header actions; `viewLinks` still draws the
row (pills only), since an app that sets the key asks for it.
