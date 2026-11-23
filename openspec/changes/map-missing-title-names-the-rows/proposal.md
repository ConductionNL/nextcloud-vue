# Proposal: map-missing-title-names-the-rows

## Why

Board DqZakenKaart titles the card under the map list "8 zaken zonder adres"; the library wrote "8 zonder adres" and
an app had no way to name what it counts.

## What changes

`mapConfig.list.missingTitle` (`{ singular, plural }` with `{total}`) titles that card through the app's plural forms.
Without it the library's line stands.
