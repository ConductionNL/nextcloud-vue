# Proposal: index-header-meta-from-endpoint

## Why
learniq's groups list (`enrolment-sync-classes-from-student-administration` 3.1, board `LqGroepen`) shows one line under the title: "Bijgewerkt uit Magister om 07.00, 3 wijzigingen". `headerMeta` takes static text, the list's counts and counts of other lists (`headerMetaCounts`), but nothing an app works out itself, such as the last sync time and its changes.

## What changes
- `config.headerMetaSource` on an index page: `{ url, method?, params?, responsePath? }`, the request grammar of a widget's `endpointSource`. Its answer (a string or number) fills `{source}` in `headerMeta`.
- While it reads, after a failed read or for an empty value, the note is left out, as for `{count:<name>}`.
- Manifest schema 2.199.0.
