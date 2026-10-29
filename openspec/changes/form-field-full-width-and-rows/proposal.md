---
kind: code
---

# Proposal: form-field-full-width-and-rows

## Summary

Board PqTicketBewerken draws the ticket edit dialog in two columns with Titel
across both columns, a three-line Omschrijving and a two-line "Bericht aan de
klant". CnFormDialog spans only multi-line widgets over both columns and draws
every textarea four rows high, so a consumer cannot ask for either. Two opt-in
field override keys close that: `width: 'full'` and `rows`. Without them the
form draws as before.
