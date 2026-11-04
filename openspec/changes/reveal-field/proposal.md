# Proposal: reveal-field

## Why

Board DqContact shows a person's BSN masked, "*****4001", with a "Tonen" button and the line "Het tonen van het BSN
wordt gelogd." The library had a type-to-confirm field and a purpose dialog for a whole page, but nothing that holds a
single protected value back until the user asks, and fetches it so the server can log each viewing.

## What changes

- New `CnRevealField`: a label, the masked value and a Show button.
- Show calls the host's `load(reason)` on every reveal and shows what it answers; Hide masks the value and drops it.
- `requireReason` asks why before fetching and passes the reason to `load`.
- `note` draws a line under the value, such as that showing it is logged.
- A failed or empty answer keeps the value masked and says so.

Covers gap 21 of the dossiq component-gap audit (decision 281).
