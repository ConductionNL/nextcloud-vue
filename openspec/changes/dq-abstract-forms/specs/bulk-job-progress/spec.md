# bulk-job-progress Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A bulk act reports what it did, row by row

CnBulkJobProgress SHALL state the job's position in a sentence, draw a progress bar while it runs or after it stopped, and offer one count per outcome (applied, skipped, refused, failed), zero counts included, each opening a paged list of the rows with the reason each gave ("No reason recorded." when none). Skipped and refused SHALL stay separate in words and in what is read. Over an OpenRegister job it SHALL re-read the job every `pollInterval` ms while it runs and stop reading when unmounted, page members `pageSize` at a time, and commit, cancel and retry on `/api/bulk-jobs/{id}`, showing the server's own sentence when an act is refused. A `local` run SHALL read its rows from the host and hand commit, cancel and retry to the host as events. Every sentence SHALL be replaceable through `labels`.

#### Scenario: Twelve of four hundred did not move

- **GIVEN** a completed job of 400 rows with 12 skipped and 3 refused
- **WHEN** the reader opens "12 skipped"
- **THEN** the twelve rows are read with `outcome=skipped` and listed with their reasons, and "3 you may not write" is a separate count

### Requirement: A selection says which "all" it holds

CnSelectionScope SHALL say how many rows are selected and whether that is the page or the whole result, offer widening to the whole result only when the total is known and larger than the ticked rows, offer going back once widened, and emit `update:scope` rather than switching itself.

#### Scenario: Unknown total

- **GIVEN** two ticked rows and an unknown total
- **THEN** no "select all" is offered
