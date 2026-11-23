# Proposal: map-list-formatters

## Why

On DqZakenKaart each row of the map's numbered list shows "address · case number" and the case type and status as
pills. The list could only fill templates and pills from fields on the row. A case carries its type as a UUID and no
address text at all (the address lives in a `case-location` record), so dossiq showed the case number only and no
pills. With a page of located cases the list also pushed the card for the rows without a place below the fold, where
the board draws it under the list.

## What changes

- `mapConfig.list` pills take `formatter`, an app formatter (`cnFormatters`) that turns the raw value into the label.
- A template token whose format is not a built-in one (`{id|caseAddress}`) runs the app formatter of that name.
- `sub` may be a list of templates; the first that fills is shown.
- The list scrolls inside the side column; its rows and the card for the rows without a place keep their height.
