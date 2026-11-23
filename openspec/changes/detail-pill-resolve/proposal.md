# Proposal: detail-pill-resolve

## Why

A case's type pill read its `caseType` field, which holds the case type's uuid, so the dossiq case header showed a uuid
instead of "Woo-verzoek" (BLD-Dq-A, DqZaak boards).

## What changes

- `config.typePill` / `config.statusPill` take `resolve: { register, schema, labelField? }`. The pill's field value is
  looked up as a record of that schema and its label (the `labelField`, else `title` / `name`) is shown instead, and keys
  the colour map.
- The lookup is the reference-label resolver the index tables use (`createRefLabelResolver`), so a record already in the
  object store costs no request. A failed or empty lookup keeps the raw value.
- Schema: `headerPill.resolve`.
