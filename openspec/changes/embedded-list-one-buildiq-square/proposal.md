---
kind: code
---

# Proposal: embedded-list-one-buildiq-square

## Summary

A list embedded in a detail page (`index-list` widget, CnIndexListWidget)
drew its own buildiq square in its toolbar, next to the one the page header
already draws, so the page carried two (board PqEvenement, the Aanmeldingen
tab). CnIndexPage gets `buildiqButton` (default true); the embedded list sets
it to false.
