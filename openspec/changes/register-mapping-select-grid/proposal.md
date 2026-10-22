# Proposal: register-mapping-select-grid

## Why

DqBeheerinstellingen draws Configuratie as a form: the register as a select, then the case, case type, status, role,
result, decision and status type schemas as selects three to a row, and Opslaan at the end. The board look of
CnRegisterMapping draws PqBeheer's table instead: an inner group card with a status chip, a type and schema table that
opens a select per row, and a "show all types" line, so dossiq's seven schemas read as four rows and a link.

## What changes

`boardLayout: "selects"` makes the board look draw, per group, the register select and a schema select per type in a
grid of three (one column on a narrow screen), with one save button at the end; a group title only when there is more
than one group. `table` stays the default, so PqBeheer is unchanged.

## Scope

nextcloud-vue CnRegisterMapping; dossiq's admin settings set it (R22-DASH). A component prop, no manifest schema change.
