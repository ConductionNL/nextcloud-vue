# Proposal: retention-recompute-header

## Why

Board DqZaakArchivering puts "Nominatie herberekenen" at the end of the archiving card's header. The widget drew a
reason field and a button in the card's body, which put a form on a card that is for reading.

## What changes

The retention widget's header holds "Recompute nomination" (with a refresh icon). Clicking it opens a small dialog that
asks why; the reason stays required and is posted with the recompute. Someone without the archivist role sees the button
disabled, with the reason as its tooltip and description.
