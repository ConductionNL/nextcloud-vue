# A column aggregate read from the host app's endpoint

## Why

DqOrganisaties draws "Open tickets" per organisation. The tickets live in
pipelinq, joined to dossiq's organisation by master entity, which no
OpenRegister query on the organisation can follow. The host app can answer it,
so the table needs a way to ask the host app for one value per row, and to
leave the column out when the app behind it is not installed.

## What changes

- `aggregate: { endpoint, key, requiresApp? }`: one GET of `endpoint` with
  `keys` (each visible row's `key` field) answered by
  `{ available, values: { key: value } }`. A row the answer does not name, or
  a row with no key, counts 0 (`zeroLabel` applies).
- The column is not drawn while `requiresApp` is not installed (nothing is
  asked), or once the endpoint answers `available: false`.
