# Proposal: header-meta-count-entity-source

## Why

DqTenant's header line ends in "een van 6 organisaties op deze omgeving". CnDetailPage already counts a
`headerMetaCounts` entry that names an entity source (`{ entitySource: "organisations" }`), but the v2 manifest schema
accepted only register + schema there, so a manifest using it failed validate-manifest (dossiq b63 dropped the head).

## What changes

A `headerMetaCounts` entry is either `{ register, schema, filter? }` or `{ entitySource }`, the source one of the named
entity sources a page can read. Schema 2.167.0.

## Scope

app-manifest-v2 schema only; the runtime already reads both.
