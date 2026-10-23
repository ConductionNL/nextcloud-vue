# Proposal: header-meta-last-change

## Why

DqZaaktype's header reads "laatst gewijzigd 2 okt door Lars de Koning". The `|user` token already names a user id, but
an OpenRegister object does not record who changed it last; only its audit trail does.

## What changes

CnDetailPage takes `headerMetaLastChange`. With it on, the page reads the record's newest `create` or `update` audit entry
(`GET /api/objects/{register}/{schema}/{id}/audit-trails`, one row, newest first) and offers it to `headerMeta` as
`_lastChange`: `{_lastChange.userName}`, `{_lastChange.user|user}`, `{_lastChange.created|date}`. A trail that cannot be
read leaves those tokens empty, so the meta line drops them and their separator.

## Scope

nextcloud-vue only. Page config is open: no schema change. dossiq uses it on the case type page (DQ-ADMIN).
