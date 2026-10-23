## ADDED Requirements

### Requirement: A started run can open where the inspector stopped

With `content.startAt` set to `firstOpen`, the checklist-run widget SHALL open at the page holding the first question without an answer, and at the last page when every question has one. It SHALL position the page once per record, so a reload after saving keeps the current page. Without `startAt` the widget SHALL open at the first page.

#### Scenario: a run with the first question answered
- **GIVEN** a run of three questions, one per page, whose first question has an answer
- **AND** `startAt` is `firstOpen`
- **WHEN** the widget opens
- **THEN** it SHALL show "Question 2 of 3"

#### Scenario: no startAt
- **GIVEN** the same run without `startAt`
- **WHEN** the widget opens
- **THEN** it SHALL show "Question 1 of 3"
