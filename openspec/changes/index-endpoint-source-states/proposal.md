# An endpoint index says when it was refused, searches on the server and shows a note from the answer

## Why

A list over an app endpoint that guards its rows by a role (a mail intake log)
must tell a reader without that role that they may not read it, not show an
empty list they could read as "nothing came in". The same list searches by a
named parameter (`sender`) and shows a line the server answers beside the rows
(the order its filters ran in). Without these the page stayed hand-written.

## What changes

- `sourceConfig.searchParam`: the page's search term goes to the endpoint as
  that parameter, and a new term reloads from the first page.
- A refused load (403) shows the endpoint's `message`, else
  `sourceConfig.refusedText`, else a library sentence, instead of the rows, the
  search and the tabs. Another failed load shows the error state, not an empty list.
- `sourceConfig.notePath` with `noteText`: a value read off the answer, said in
  the page's sentence, above the rows.
