# Proposal: sections-child-visible-when

## Why

Board PqContactmoment draws the contact moment's Overview as one panel: Contactgegevens, Gespreksnotities and Over dit
verzoek as sections with a rule between them. That is the `sections` widget. "Over dit verzoek" only shows when the
contact moment belongs to a request (`visibleWhen` on `parentTicket`). A widget in a tab stack follows its own
`visibleWhen` on a detail page (tab-stack-child-visible-when), but a section did not, so its heading and footnote
would show on a contact moment with no request.

## What changes

- On a detail page a section of a `sections` widget follows its widget's locally decidable `visibleWhen` against the
  record, through the same evaluator as grid and tab-stack widgets (`detailWidgetVisible`).
- Without a record and for conditions that need a request, nothing changes.
