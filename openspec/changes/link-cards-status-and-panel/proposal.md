---
kind: code
screens: [PqGeavanceerdHub]
---

# Proposal: link-cards-status-and-panel

## Summary

A link card on a `links` page can carry a status pill under its description, and the page can close with a panel.
The status pill reads, for example, "7 actief, 2 gepauzeerd" or "1 koppeling heeft een fout". The panel holds a badge,
a paragraph, a link, and a titled list of facts. Board PqGeavanceerdHub draws both: a status on every card, and the
menu structure an administrator set, in a panel at the end.

## What changes

- `card.status`: a string or `{ text, tone }`, with the tone neutral, error, warning or success. The text is translated.
  `{name}` placeholders are then filled from `card.statusValues`, and `{runtime.<path>}` from the manifest's `runtime`.
- `card.statusValues`: per placeholder, either an OpenRegister aggregate descriptor or `{ url, path?, params? }`. The
  second is a GET whose JSON holds the number at `path`. A status that waits on a value, or whose value could not be
  read, is not shown.
- `config.panel`: `{ label?, badge?, text?, link?, title?, subtitle?, facts?, permission?, visibleIf? }`. A fact is
  `{ label, value?, note?, visibleIf? }`. Every string is translated, then `{runtime.<path>}` is filled.
- Schema 2.158.0.
