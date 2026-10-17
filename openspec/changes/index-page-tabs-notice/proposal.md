# Proposal: index-page-tabs-notice

## Why

DqPrivacy and DqContracten draw a strip of sibling pages above the toolbar with their counts ("AVG-verzoeken 12 |
Datalekken 2", "Contracten 38 | Leveranciers 21 | Portaalaccounts 9") and a band under the table that explains the list.
Only a named source could supply page tabs, and an index page had no notice.

## What changes

- `config.pageTabs`: `[{ id?, label, route?, params?, query?, href?, countFrom?: { register, schema, filter? } }]`. Drawn
  with the page-tab strip a named source already uses; the current route's tab is marked and `countFrom` adds the count
  of that list (one list request each). The manifest's tabs win over a source's.
- `config.notice`: `{ text, variant?: 'info' | 'success' | 'warning' }`, an NcNoteCard under the list, the text through
  the host translate.
- Without these keys nothing changes. No manifest schema change: page config is open.
