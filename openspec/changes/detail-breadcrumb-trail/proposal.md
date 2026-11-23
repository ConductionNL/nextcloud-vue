# Proposal: detail-breadcrumb-trail

## Why

Some record pages sit two levels deep. DqZaaktype reads "Instellingen / Zaaktypen / Omgevingsvergunning regulier" and
DqTenant "Instellingen / Organisaties / Gemeente Waterland". A record page's breadcrumb names only one crumb before the
record, so the first level is lost.

## What changes

CnDetailPage takes `breadcrumb` as one crumb or a list, as a list page already does. Each crumb of a list is drawn before
the record, which stays the current crumb. `currentField` and `separator` may sit on any crumb; the last one that sets
it wins. One crumb works as before.

## Scope

nextcloud-vue only. The manifest schema already accepts a list for `config.breadcrumb`, so there is no schema change.
dossiq uses it on the case type and organisation pages (DQ-ADMIN).
