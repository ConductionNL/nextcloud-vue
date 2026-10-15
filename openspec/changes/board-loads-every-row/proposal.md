---
kind: code
---

# Proposal: board-loads-every-row

## Summary

A self-fetching index page in board view asked for one table page (20 rows), so dossiq's Werkbord showed 20 of 284 open cases. The app's own board asked for 500. Swapping the app board for the library board would hide cases.

The board view now asks for 500 rows (`BOARD_PAGE_SIZE`; OpenRegister serves up to 1000 per request). Past that it counts what it holds of what matches ("Toont 500 van 612") and offers "Meer laden", which adds the next batch after the rows already on the board instead of replacing them. Leaving the board gives the table its own page size back.

## Scope

- `src/store/useObjectStore.js`: `fetchCollection(type, params, { append, isCurrent })` adds a page after the stored rows; a page that no longer follows the stored rows, or whose query changed meanwhile, is dropped.
- `src/composables/useListView.js`: `loadMore()`.
- `src/components/CnIndexPage/`: the board page size on entering board view (and on a page that opens in it), the board footer, "Show N more" on a column loads the next batch.
- A host-fed page (`objects` + `pagination` props) is unchanged: the host still gets `page-changed`.
- No schema change.
