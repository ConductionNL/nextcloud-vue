# board-status-card-flat Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-status-card-flat](../../)

## Purpose

The Status card draws its lines on the card itself, as the boards do.

## ADDED Requirements

### Requirement: The status explainer is flat in the board look

In the board look the status explainer SHALL paint no background and have no radius or padding. Its explanation line
SHALL be 15px bold in the main text colour, and its dwell line SHALL be 13px in the muted text colour unless the dwell
is breached. An attention flag inside a detail page's sections card SHALL have a 1px hairline above it and 10px between
the hairline and its heading. The Nextcloud look SHALL be unchanged.

#### Scenario: A case page in the board look

- GIVEN a case page in the board look whose Status card holds a status explainer and an attention flag
- WHEN the card renders
- THEN the explainer has no grey box
- AND the attention flag sits under a hairline
