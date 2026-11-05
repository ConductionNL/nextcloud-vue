---
kind: code
---

# Proposal: due-text-done-and-date

## Summary

Board DqZaak Adviezen draws "uiterlijk 8 mrt, 2 dagen over" on an open advice and "ontvangen 6 mrt, negatief" on a received one. The due text could count days but not name the date, and had no done state.

## Scope

- `src/utils/dueText.js`, `src/components/CnRecordListWidget/CnRecordListWidget.vue`, `tests/utils/dueTextDoneAndDate.spec.js`.

## Out of scope

- The server side and the app's manifest; this is the library half.
