# Proposal: board-workspace-filter-form

## Why

The boards draw a workspace filter form's field and load button 40px tall, the button 16px in at both sides
(DqTermijnen "Jaar" with "Rapport laden", "Kwartaal (JJJJ-Qn)" with "Audit laden"). CnWorkspaceFilterWidget's input
form drew Nextcloud's 34px, the button 12px in (COMPDIFF r22 `h 40>34`, `paddingLeft 16>12`, nc-vue 2.124).

## What changes

In the board look the form's field takes the 40px control height as its minimum, and its button the control height
and 16px side padding, its label without NcButton's own inset.

## Scope

Board-only, `look-board.css`.
