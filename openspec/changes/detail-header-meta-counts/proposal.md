# Proposal: detail-header-meta-counts

## Why

DqTenant's header line reads "een van 6 organisaties op deze omgeving". A list page's header line can count another list
(`headerMetaCounts`, `{count:<name>}`); a record page's cannot.

## What changes

CnDetailPage takes `headerMetaCounts` (`{ <name>: { register, schema, filter? } | { entitySource } }`). A register list
is read as one list total; a named source (such as `organisations`) is loaded and its rows counted. `{count:<name>}` in
`headerMeta` reads the count; while one is missing the line is left out.

## Scope

nextcloud-vue only. Page config is open: no schema change. dossiq uses it on the organisation page (DQ-ADMIN).
