## ADDED Requirements

### Requirement: An endpoint index says a refusal, searches on the server and shows a note from the answer

An index page with `entitySource: "endpoint"` SHALL send its search term as `sourceConfig.searchParam` when one is declared. A load the endpoint refuses with 403 SHALL show the endpoint's `message` (else `refusedText`, else a library sentence) in place of the rows, the search and the quick filters. Any other failed load SHALL show the error state. A declared `notePath` SHALL be read off the answer and shown above the rows in the `noteText` sentence.

#### Scenario: A reader without the role opens the log

- **WHEN** the endpoint answers 403 with `{ "message": "You do not have the intake role" }`
- **THEN** the page shows that sentence and no table, search or tabs

#### Scenario: Search by sender

- **WHEN** `sourceConfig.searchParam` is `sender` and the reader types `a@b.nl`
- **THEN** the endpoint is asked with `sender=a@b.nl`

#### Scenario: The order the filters ran in

- **WHEN** `notePath` is `filterOrder`, `noteText` is `Filters run in this order: {value}` and the answer holds `["blocked-sender", "auto-reply"]`
- **THEN** the page shows "Filters run in this order: blocked-sender, auto-reply" above the rows
