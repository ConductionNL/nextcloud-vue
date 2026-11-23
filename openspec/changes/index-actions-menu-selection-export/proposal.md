---
kind: code
depends_on: [screens-index-header-actions-menu]
---

# Proposal: index-actions-menu-selection-export

## Summary

The board DqZaaktypen draws two entries in the case type list's Actions menu
that the library cannot offer:

1. "Selectie exporteren als JSON": export the rows the person selected, as one
   file. The menu has `export` (the whole filtered list) and `copy-selected` /
   `delete-selected`, but no export of the selection.
2. "Sjablonen opnieuw laden": an administrator's action. A header action shows
   to everyone who sees the page; the server refuses a non-admin, but the entry
   should not be offered to them.

## What changes

- A built-in `export-selected` entry for the Actions menu `items`. It is
  disabled until a row is selected, reads "Export selection as JSON", and
  downloads OpenRegister's JSON export of the page's register and schema with
  the selected ids as `_ids` (openregister `export-honours-selected-ids`). No
  manifest schema change: `items` already takes any string.
- A header action may set `adminOnly: true`. It is then left out of the header
  actions for anyone Nextcloud does not report as an administrator. This only
  decides what is drawn; the endpoint the action calls enforces its own access.
