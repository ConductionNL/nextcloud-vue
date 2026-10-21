# register-mapping Delta: register-mapping-board-look

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [register-mapping-board-look](../../)

## Purpose

The register configuration looks like the drawn board and loads only what it shows.

## ADDED Requirements

### Requirement: The board look draws one open group and compact rows

In the board look `CnRegisterMapping` SHALL draw one group open: its name as a level-3 heading, a status chip, the register select labelled above, and a table with the columns "Soort object" and "Schema" where a configured type shows a check icon before its schema. The table SHALL list `boardRowLimit` types (default 4, 0 lists all) and count the rest in a line with a button that lists them all. Every other group SHALL be a row button with a chevron, its name, its type count and a status chip; the button SHALL open that group. The chip SHALL read "Alle soorten ingesteld" on the open group and "Ingesteld" on a row when every type is set, "Niet ingesteld" when none is, and "N van M ingesteld" otherwise. The save button SHALL sit at the end of the section, not in its header. The default look SHALL render as before.

#### Scenario: Pipelinq's admin page

- **GIVEN** pipelinq's mapping in the board look with Pipelinq Objects fully set and Projects not set
- **THEN** Pipelinq Objects is open with "Alle soorten ingesteld", four rows and "En nog 10 soorten in deze groep, allemaal ingesteld."
- **AND** Projects is a row reading "3 soorten" and "Niet ingesteld"
- **WHEN** the administrator activates the Projects row
- **THEN** Projects is the open group and Pipelinq Objects becomes a row

### Requirement: Only mapped registers have their schemas fetched

`CnRegisterMapping` SHALL list the registers without expanding their schemas, and SHALL fetch schemas only for the register ids the configuration maps, through `registers/{id}/schemas`, falling back to `registers/{id}?_extend[]=schemas` on a 404. A register id that appears in a later configuration, or is chosen in the select, SHALL have its schemas fetched then. Each register's schemas SHALL be fetched at most once at a time.

#### Scenario: A busy instance

- **GIVEN** 56 registers and a configuration mapping register 18
- **WHEN** the mapping mounts
- **THEN** it requests `registers` without `_extend` and `registers/18/schemas`, and no other register's schemas
