# Design: screens-cell-pill-parity

## Tones

The board uses seven pill tones (LqTokens draws them in a row). Five have a
Nextcloud colour role and map onto the existing variants; two do not.

| Board tone | Board colours | Variant | Colours used |
|---|---|---|---|
| light primary ("Verzoek", "Nieuw") | primary-light / primary-deep | `primary` | `--color-primary-element-light` / board look: `--color-primary-element-light-text` |
| purple ("In behandeling") | #e8e6f6 / #4a3f8f | `purple` (new) | `--cn-status-purple-bg` / `--cn-status-purple-text` |
| warning ("Wacht op klant") | #fff4de / #7a4f00 | `warning` | unchanged Nextcloud warning colours |
| success ("Opgelost") | #e7f3ea / #1e6b2a | `success` | unchanged |
| error ("Klacht") | #fcedec / accent-deep | `error` | unchanged |
| teal ("Omgezet naar een zaak") | #e3f1f3 / #1d5e66 | `teal` (new) | `--cn-status-teal-bg` / `--cn-status-teal-text` |
| neutral ("Nieuw" lead) | chip / work-text | `default` | unchanged |

The two new tones are hue names rather than roles: the board uses purple for
"work in progress" on one board and "test" on another, so a role name would
be wrong half the time. Their colours are tokens defined once on `:root` in
`badge.css` with the board hex values, so a theme (nldesign) can redefine
them; nothing else hard-codes a colour. The variant list lives in one module,
`src/utils/badgeVariants.js`, used by `CnStatusBadge` and the board card pill
(`CnBoardView`), and the manifest schema's three tone enums (`headerPill`
`colorMap` and `variant`, `cardRoles.pillColors`) list the same eight names.

Only the primary tone differs between the default look and the board: the
default draws primary text in `--color-primary-element`, the board in the
deep primary. That one rule is scoped to `.cn-look-board` with the usual
`:not(.cn-look-nextcloud *)` guard, so an app without the look renders as
today.

## Where the colours are declared

A manifest column may carry `colorMap: { rawValue: tone }`. `CnDataTable`
merges it into the property it hands `CnCellRenderer` (`columnProperty`), so
the existing enum path, which already looks the colour up by the RAW value
(`colorKey`) while it shows the translated label, picks it up. The column map
wins over the schema property's own `colorMap` / `x-color-map`; an array or
any non-object is ignored. Alternatives considered:

- `widget: "badge"` with `widgetProps.colorMap`: already possible, but the
  badge widget resolves the colour by the formatted label, so a Dutch label
  ("In behandeling") misses a map keyed on `in_progress`, and it bypasses the
  per-key enum translation. Rejected.
- Only the schema `x-color-map`: works today, but a colour is presentation
  and belongs to the page, and two pages may colour the same enum differently
  (PqTickets draws "Nieuw" in primary, PqLeads draws its own "Nieuw" grey).

## Manifest schema

2.74.0: the tone enums gain `purple` and `teal`; the `config.columns`
description names `colorMap`. Column objects stay free-form, so no manifest
that validated before is refused.
