---
kind: code
---

# Proposal: screens-table-footer-and-system-dates-parity

## Summary

Two table gaps from the pipelinq lane in round 6
(round6/pipelinq/library-gaps.md):

1. Every index page prints its count as "14 of 14" in Dutch: the board reads
   "14 van 14". The table footer's count (`{shown} of {total}`) and the
   compact pagination (`{from}–{to} of {total}`) go through the library's
   translations, but the catalogue has no entry for them; the board count
   line under the title defaults to the same text through the app's label
   lookup, which does not know it either.
2. A column cannot show an object's system date. The PqKassabonnen board has a
   column "Aangemaakt" (created); `created` is not a schema property, so the
   cell renders as plain text at best. OpenRegister keeps it in the object's
   `@self` block.

This change:

1. Adds `{shown} of {total}` and `{from}–{to} of {total}` to the English and
   Dutch catalogues, and sends the default board count line through the
   library's translations (a page's own `countText` stays the app's).
2. Lets a column take `@self.created`, `@self.updated`, `@self.published` or
   `@self.depublished` as its key: the value is read from `@self` and renders
   as a date-time, unless the column names its own `type` or `format`.

The count fix applies in both looks (it is a translation); the system date
columns change nothing for a page that does not declare one.
