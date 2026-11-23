# Proposal: macros-per-record

## Why

A schema's macros are offered on every record of that schema. dossiq declares its macros on the shared case schema, so
"Woo-verzoek afronden" would be offered on an objection or a permit. The choice belongs to the case type, the way
`sideColumnFrom` lets a case type pick its side cards.

## What changes

The `macros` widget takes `content.macrosFrom`: a path on the record read like a `visibleWhen` field (the detail page's
`@context` records included, `@context.caseType.macros`), or an endpoint (`{ url, method?, params?, responsePath? }`,
the endpointSource block) whose answer is the list; a refused endpoint offers none. It shows the listed macro keys in the list's order. A record
that lists none shows none. Without `macrosFrom` every declared macro shows, as before. `pickMacros()` does the choosing.
