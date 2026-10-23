# Proposal: record-list-footer-link

## Why

Several boards end a list card with a text link under the rows: DqDagAfsluiten "Morgen eerst" ends with "Naar Mijn
werk", DqDashboard "Zaken die u volgt" and "Recent geopend" end with "Alles bekijken". A record list could put a link
in its card header (`headerLink`) or a button under the rows (`footerAction`), but not a text link under the rows.

## What changes

`footerLink` (`{ label, route, params?, query? }` or `{ label, href }`, the same shape as `headerLink`, `{total}` filled
and tokens resolved) draws a text link under the rows. It is not drawn while the list has no rows or failed.

## Scope

CnRecordListWidget. No schema change.
