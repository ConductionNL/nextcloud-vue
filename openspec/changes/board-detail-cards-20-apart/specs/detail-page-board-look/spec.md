# detail-page-board-look Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: Board detail cards stand 20px apart

In the board look CnDetailPage SHALL build its body grid with 8px under each item and the grid margin (12px) on the
other sides, so a card stacked under another stands 20px below it, as the boards draw it. Without the look the grid
SHALL keep one margin on every side.

#### Scenario: DqHandhaving

- **GIVEN** the LHS advice page in the board look, "De overtreding" stacked under the matrix card
- **THEN** "De overtreding" starts 20px under the matrix card, not 24px

#### Scenario: Nextcloud look

- **GIVEN** a detail page without the board look
- **THEN** its body grid gets no `marginBottom`
