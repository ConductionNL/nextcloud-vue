---
kind: code
---

# Proposal: screens-banner-actions-parity

## Summary

dossiq DqMijnWerk (round6/dossiq/library-gaps.md 23): the "Vandaag eerst"
attention card draws four actions. Three are secondary: "Alle zaken over
termijn" and "Naar het werkbord" are links, "Termijn opschorten" is a button.
The fourth, "Zaak openen", is the primary one and comes last. CnBannerWidget's
attention layout keeps the first two (`MAX_ACTIONS = 2`), so dossiq's
FirstTodayWidget passes only two.

## What changes

1. Under the board look the attention card shows up to four actions. Without
   the look it shows two, as before.
2. A `maxActions` prop overrides the default in either look. The widget reads
   `content.maxActions` too, for a stored blob.
3. An action marked `primary: true` keeps the primary style wherever it sits,
   so the board's order (secondary first, primary last) is the order the host
   passes.

## Schema

The manifest schema caps `content.actions` at two (`maxItems: 2`) and has no
`maxActions`. Raising that is a schema change and needs a version number, so it
is not in this change. dossiq renders the card from its own component and
passes the actions as a prop, which the schema does not see.
