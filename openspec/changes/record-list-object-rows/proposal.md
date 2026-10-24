# Proposal: record-list-object-rows

## Why

dossiq's Onderzoek tab (DqSociaalDomein, "Onderzoek 2") lists the
investigation steps of a social domain case. Ruben decided they live in the
case type: a list-of-records answer `onderzoeksstappen`, sensitive, so stored
in `case.sensitiveProperties[{ name, value }]` with the rows as a JSON string,
and returned by OpenRegister only to readers allowed to see it. No widget could
list rows the page's record holds, and no tab could count them.

## What changes

- `objectRows` on a record list: `{ path, where?, valuePath? }`. The rows are
  the list at `path` on the page record, narrowed to the entry matching `where`,
  its `valuePath` taken; a JSON string is decoded. Nothing is read from the
  server: the record is the one the page read, as the reader, so its read rules
  already apply.
- `countObjectRows` on a tab: the same declaration, counted for the tab's pill.
