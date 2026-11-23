## ADDED Requirements

### Requirement: A run can open where the inspector last answered

With `content.startAt` set to `lastAnswered`, the checklist-run widget SHALL open at the page holding the last question, in question order, that has an answer, and at the first page when no question has one. It SHALL position the page once per record, as `firstOpen` does.

#### Scenario: questions 1 to 4 answered, two per page
- **GIVEN** a run of six questions, two per page, whose first four questions have an answer
- **AND** `startAt` is `lastAnswered`
- **WHEN** the widget opens
- **THEN** it SHALL show "Question 3 of 6"

#### Scenario: nothing answered
- **GIVEN** the same run without answers
- **WHEN** the widget opens
- **THEN** it SHALL show "Question 1 of 6"

### Requirement: An answer that rules out the photo hides its control

A question whose photo rule is `{ whenAnswer }` SHALL show no photo control while its answer is another value and it holds no photo, stored or attached. Unanswered, or answered with `whenAnswer`, or holding a photo, it SHALL keep its control.

#### Scenario: a "ja" under a photo rule for "nee"
- **GIVEN** a question with the rule `{ whenAnswer: "nee" }` answered "ja" without a photo
- **THEN** the page shows no photo control for it
- **WHEN** the inspector changes the answer to "nee"
- **THEN** its photo control appears
