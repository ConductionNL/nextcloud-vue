---
kind: code
---

# Proposal: board-settings-single-field-width

## Summary

The boards draw a field on its own row at most 560px wide (NcBeheerInstellingen text and select rows); live a one-column settings card stretched every field across the card (r29 DqBeheerGeavanceerd Financiële integratie, Storeregister: 1070px fields). In the board look a single-line field in a one-column grid is now at most 560px; text areas, notes and switches still span the card.

## Scope

- `src/css/look-board.css`, a css test.
