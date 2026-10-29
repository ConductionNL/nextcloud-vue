# Proposal: expandable-row-entry-action

## Why

PL5-B measured PqPipelines: the board ends every stage in an open pipeline with a 32px round pencil button ("Fase
bewerken Nieuw"), and live draws none, so a stage can only be reached through the pipeline's Bewerken button.
CnExpandableRow's sub-table has header buttons and a footer action, but nothing per entry.

## What changes

`expandableRows.table.entryAction: { id, label, icon? }` ends every entry with an icon button named "{label} {entry}".
It runs the row action `id`, as a header button does, and the `action` event carries the entry. Without it the table
is unchanged.
