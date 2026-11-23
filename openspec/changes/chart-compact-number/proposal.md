# Proposal: chart-compact-number

## Why

pl4 on board PqVerkoopoverzicht: "Open pijplijn per fase", "Omzet per bron" and "Grootste klanten op omzet" draw a
labelled bar per row with a short figure at its end ("38k", "13k"). The bar list can only write a value in full or as
a currency ("€ 38K"), so the board's short number cannot be configured.

## What changes

- A chart `valueFormat` can be `compact`: the value written short with no currency sign (38000 as "38K"), in the
  reader's locale. The object form `{ name: "compact", decimals }` sets the fraction digits (default 0).
- A value that is not a number passes through unchanged, as for every other format.
