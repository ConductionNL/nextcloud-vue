# Design: screens-index-toolbar-parity

## Why one unit, and no fixed row for Filter

The DqZaken board does not put Filter on a row of its own on purpose: its row
1 is one wrapping flex line (`chips, flex:1 spacer, Save view, Filter,
switch`) and at 1440px the six chips plus Save view leave no room, so Filter
and the switch wrap to the start of line 2. On PqTickets, PqLeads and
PtPortals the same line has room, so they stay at its end.

The library drew Filter and the switch as two separate flex items. The switch
wrapped alone and Filter stayed at the far right of line 1, which is what
dossiq reported. Wrapping them in one `cn-actions-bar__view-controls` element
(`flex: 0 0 auto`, `nowrap`) reproduces the board on every width without a
manifest key: the unit is either at the end of line 1 or at the start of
line 2.

The free space before Save view (or before the unit when there is no Save
view) stays a `margin-inline-start: auto`, the board's spacer. After Save
view the unit's margin is 0, so when it wraps it starts the new line, as the
board draws.

## Save view

The trigger is an `NcActions` menu button, which brings Nextcloud's button
border and a 34px icon box. Under the board look the trigger loses the
border, takes padding 0 12px, a 6px gap and a 14px icon, and does not wrap.

The English came from the catalogue: "Save view", "Active:", "Filter" and the
other strings of the three toolbar components were missing from
`l10n/nl.json`. They are added (and to `en.json` as identity entries).

## The placeholder

`CnIndexPage.searchPlaceholder` already existed and a manifest page config
already reached it (config keys are props), but the schema did not list the
key and the value was printed as written. The page now runs it through
`cnTranslate`, so an app writes an English key and keeps the Dutch in its
catalogue, the same rule as `countText` and `footerNote`.
