# board-split-pane-side-column Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-split-pane-side-column](../../)

## Purpose

A record opened from a board list reads as the board's side card, beside the whole list column.

## ADDED Requirements

### Requirement: The open record is the board page's side card

In the board look, CnIndexPage SHALL draw an open split pane as the page's side column, as wide as
`splitView.paneWidth`, from the top of the chips and the toolbar, and the chips, the toolbar and the list SHALL take
the column beside it. The pane SHALL be a board card. A page with a side panel or a folder pane, the Nextcloud look,
and the full-page layout below the breakpoint SHALL keep the pane in the body.

#### Scenario: Board PqKassaAudit

- GIVEN the Pipelinq cash register audit log in the board look at 1440px, `splitView.paneWidth` 360px
- WHEN the user opens an audit row
- THEN the record is a 360px card at the right, its top level with the chips
- AND the chips, the toolbar and the table share the 740px column beside it
