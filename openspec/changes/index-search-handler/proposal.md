---
kind: code
---

# Proposal: index-search-handler

## Summary

An index page sends what is typed in its search box to OpenRegister as `_search`, unchanged. Some searches mean something else: in pipelinq a KCC agent types a caller's number as `06 1234 5678`, while the ticket stores it normalised as `+31612345678` (`phoneE164`), so a text search finds nothing. The page config can now name a handler from the app's registry that reads the term before it is sent and answers how to search instead: other text, extra filters and a note for the page. pipelinq's Tickets list is the first consumer (change `contact-moments-phone-lookup`, task 1.6): a phone number becomes a `phoneE164` filter with the note "Searching by phone number".

## Scope

- `src/composables/useListView.js`: option `searchInterpreter(term)`, asked once per term before a fetch; its `{ search?, filters?, note? }` replaces `_search`, adds the filters and exposes `searchNote`.
- `src/components/CnIndexPage/useSelfFetchList.js`, `CnIndexPage.vue`: prop `searchHandler` (manifest `config.searchHandler`) resolved from the app's registry; the note shows above the list as a status line.
- `src/schemas/app-manifest-v2.schema.json` 2.170.0: `searchHandler` on page config.
- `src/components/CnIndexPage/CnIndexPage.md`.
