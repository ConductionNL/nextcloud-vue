# Proposal: dashboard-placement-title

## Why

Board PqWerkplekKlant titles the in-call cards for the call: "Dit contactmoment", "Openstaande zaken" and "Eerder
contact". The same widgets carry their dashboard titles ("Nieuw contactmoment", "Klantverzoeken", "Recente
contactmomenten") on the page without a call. A title lives on the widget definition, so a page cannot title a card per
layout; the only per-placement title is `customTitle`, a person's own words, which is never translated.

## What changes

- A layout placement takes `title`: the manifest's title for the card in that placement, translated like the widget's
  own title. It comes after a person's `customTitle` and before the widget definition's `title`.
- `{count}` in a placement title fills as it does in a widget title.
