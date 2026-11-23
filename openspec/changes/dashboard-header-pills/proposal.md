# Proposal: dashboard-header-pills

## Why

Board PqWerkplekKlant opens the line under the title with two pills while a call is on: "Telefoon, inkomend" and
"Geïdentificeerd". A dashboard's description is one line of text, so a page cannot mark its state there.

## What changes

- A dashboard takes `config.headerPills`: `[{ label, variant?, when? }]`. Each pill whose `when` workspace condition
  holds (or that has none) draws as a small status badge at the start of the line under the title, before the
  description. `label` goes through the host translate; `variant` is a status badge variant (default `primary`).
- A page without pills draws its description as before.
