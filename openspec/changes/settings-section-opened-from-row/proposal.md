# Proposal: settings-section-opened-from-row

## Why

DqInstellingen draws the integrations tab as one Koppelingen table and, under it, only the card of the connection whose
row was opened: "Kadaster (BRK) en WOZ instellen", "Geopend vanuit de rij Kadaster (BRK) en WOZ". Live draws every
connection's card at once under the table. Each connection row already links to its card (`settingsUrl`, `#<card id>`).

## What changes

- CnSettingsSection and CnSettingsFieldsSection take `openedFrom` (the row's label, translated). Such a card shows only
  while the page's hash names its `id`, follows `hashchange`, and reads "Opened from the row {row}" under its title in
  place of its description. Without `openedFrom` nothing changes.

## Scope

CnSettingsSection, CnSettingsFieldsSection, l10n en/nl. No schema change. The card stays reachable from its row.
