---
kind: code
---

# Proposal: index-row-list-cells

## Summary

Board DqTeamwachtrij draws the team queue as headerless rows: the age ("6 dagen", red when old), the title with a meta line ("2026-0076 · Dagblad Drechtsteden · Ontvangen · prioriteit hoog"), the case type badge, the due text ("nog 4 dagen") and the row menu. The index page's `list` view (CnObjectList / CnObjectRow) had a title, a subtitle field and one badge. List rows now take `leading` and `trailing` cells rendered by CnCellRenderer, the same widgets a table column uses (`age`, `badge`, `date` with `due`), and a `subtitleTemplate`.

## Scope

- `src/components/CnObjectRow/CnObjectRow.vue`: `config.leading`, `config.trailing`, `config.subtitleTemplate`.
- No change to CnIndexPage: its `listConfig` already reaches the rows in the `list` view mode, with the row actions.
- Manifest: `listConfig.leading`, `listConfig.trailing` and `listConfig.subtitleTemplate` are new keys; the batch integration adds them to the schema.
