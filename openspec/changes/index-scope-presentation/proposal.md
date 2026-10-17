# Proposal: index-scope-presentation

## Why

The dossiq and pipelinq boards draw one list page per kind of record: DqWooVerzoeken and DqKlachten are
`/cases?caseType=<id>`, PqOrganisaties is `Clients ?type=organization`, PqContactmomenten is
`Tickets ?ticketType=interaction`. Each needs its own title, count line, add label, header buttons, breadcrumb, note and
cards under the table. A query preset could set some of these, a folder scope only its columns, sort and search. And the
query that chose the preset showed as a removable filter chip ("Soort klant: organization").

## What changes

- A query preset may also set `addLabel`, `headerButtons`, `breadcrumb`, `headerMeta` and `afterList`.
- A folder scope (a `folderSidebar` entry, or the `x-index` block of the row a register-derived folder comes from) may
  carry every presentation key a preset sets, under the same names. The scope's value wins over the page config a
  preset produced.
- An index page takes `afterList`: widget definitions drawn as cards after the list, in order, the counterpart of
  `statRow` above it (PqSocial).
- The route query pairs that chose a preset are passed as `fixedFilters` and show no removable active-filter chip.
- Schema: `config.entitySource` also accepts `flowRuns`, `endpoint`, `search` and `users` (the named sources the library
  registers; the enum had only `flows` and `tasks`, so pages using the newer sources failed validation), and
  `config.sourceConfig` is described (`url`, `rowsPath`, `kinds`, `term`, `termQuery`, `defaultGroup`; still open).
- Without these keys nothing changes.
