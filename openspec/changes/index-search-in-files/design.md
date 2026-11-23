# Design: index-search-in-files

Read on openregister development and PR branch `spec/missing-parts` (#4452),
nextcloud-vue development `3eefb4f00`, on 7 October 2026. No board draws the
switch; it sits right of the search box, where the user decides what the
search covers.

## D1. Only with a term

`_content_search` widens a text search. Without a search term it does
nothing useful, so the key is sent only when the search box has a term; the
switch stays visible and keeps its state.

## D2. The file name, never file text

The row shows the name from `@self.matchedFile` and nothing from the file.
OpenRegister carries no chunk text onto the row (its disclosure rule), and the
library adds none. The name is plain text, not a link: the record's Files tab
is where the file opens, under the record's own access rules.

## D3. The cap is OpenRegister's

Content search caps candidates at 50. When the switch is on, the list's
footer says "File matches are limited to the best 50." so a user does not read
an empty page 3 as "no more files mention this".

## D4. Route state

`contentSearch=1` in the route query, following how the page keeps its search
and quick filter, so back, reload and a shared link agree.

## Files

- `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- `tests/components/CnIndexPageSearchInFiles.spec.js`, CnIndexPage reference docs
