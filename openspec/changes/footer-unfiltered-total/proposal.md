# Proposal: footer-unfiltered-total

## Why

The board PqEvenement ends the event's registrations list with "5 van 11 met Lindelaan · 73 aanmeldingen in totaal": the narrowed count, then the whole list's size. The footer note is fixed text, and `countValues` count only under the user's active filters, so the footer could not name the whole list.

## What changes

- A `countValues` entry with `unfiltered: true` reads its aggregation under the page's own `filter` only, not the user's lens, search or filters.
- The footer note (`footerNote`, `footerNoteByView`) fills `countValues` tokens as the count line does: `"{allRegistrations} registrations in total"`.

## Not changed

- Entries without `unfiltered` keep following the active filters.
- The manifest schema already accepts any object per `countValues` entry; no schema change.
