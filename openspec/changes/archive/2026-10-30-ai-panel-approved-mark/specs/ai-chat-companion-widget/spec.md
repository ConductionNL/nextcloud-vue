# ai-chat-companion-widget Delta: ai-panel-approved-mark

## ADDED Requirements

### Requirement: The assistant panel draws the approved mark from thematiq

`CnAiChatPanel` SHALL render a footer row with the organisation's approved
mark when thematiq reports it as enabled. The panel SHALL call
`GET /apps/thematiq/api/assistant-mark` only when thematiq is installed for
the user, at most once per page load across all panel instances. On
`{"enabled": true, "label", "organisation", "logo"}` the row SHALL show the
logo as an image with the response's `logo.alt` as its alternative text, and
the `label` text exactly as received, without passing it through translation.
When `logo` is `null` the row SHALL show the label alone.

#### Scenario: The mark is on

- **GIVEN** thematiq is installed and the endpoint answers `{"enabled": true, "label": "Approved by Gemeente Voorbeeld", "organisation": "Gemeente Voorbeeld", "logo": {"url": "/apps/thematiq/img/logos/voorbeeld.svg", "alt": "Gemeente Voorbeeld logo"}}`
- **WHEN** the user opens the assistant panel
- **THEN** the footer SHALL show an image with alt "Gemeente Voorbeeld logo" and the text "Approved by Gemeente Voorbeeld"

#### Scenario: No logo

- **GIVEN** the endpoint answers enabled with `logo: null`
- **WHEN** the panel opens
- **THEN** the footer SHALL show the label and no image

#### Scenario: One request for the page

- **GIVEN** an app that opens and closes the panel three times on one page
- **WHEN** the panel renders each time
- **THEN** exactly one request to `/apps/thematiq/api/assistant-mark` SHALL have been made

#### Scenario: The label is not translated again

- **GIVEN** a Dutch user and the endpoint answering label "Goedgekeurd door Gemeente Voorbeeld"
- **WHEN** the panel renders
- **THEN** the footer SHALL show "Goedgekeurd door Gemeente Voorbeeld" unchanged

@e2e include With thematiq installed and the mark switched on, open the assistant panel in a Conduction app; assert the logo alt and the label in the footer; switch the mark off, reload, open the panel, assert no footer row.

### Requirement: The panel shows nothing when there is no mark

The footer row SHALL NOT be rendered when thematiq is not installed, when the
endpoint answers `{"enabled": false}`, when the request fails for any reason,
or when the answer is malformed or carries an empty `label`. In none of these
cases SHALL the panel show an error or make a second attempt on the same page.

#### Scenario: The mark is off

- **GIVEN** the endpoint answers `{"enabled": false}`
- **WHEN** the panel opens
- **THEN** no footer row SHALL exist in the DOM

#### Scenario: Thematiq is not installed

- **GIVEN** an instance where thematiq is not enabled for the user
- **WHEN** the panel opens
- **THEN** no request to `/apps/thematiq/api/assistant-mark` SHALL be made and no footer row SHALL exist

#### Scenario: The request fails

- **GIVEN** the endpoint answers 500
- **WHEN** the panel opens
- **THEN** no footer row SHALL exist and no error toast SHALL appear

### Requirement: The mark is readable and announced once

The label SHALL use `--color-main-text` on `--color-main-background`, which
meets 4.5:1 contrast in Nextcloud's light and dark themes. The logo SHALL be
at most 24px high. The row SHALL carry `role="note"` and SHALL be present in
the chat view and in the history view of the panel.

#### Scenario: Dark mode contrast

- **GIVEN** a user on Nextcloud's dark theme with the mark on
- **WHEN** the footer renders
- **THEN** the label's computed colour against the footer background SHALL have a contrast ratio of at least 4.5:1

#### Scenario: History view keeps the mark

- **GIVEN** the mark is on and the panel shows the chat view
- **WHEN** the user switches to the history view
- **THEN** the footer row SHALL still be shown
