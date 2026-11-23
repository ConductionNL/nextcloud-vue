## ADDED Requirements

### Requirement: An index page can word its delete dialog

An index page with `deleteDialog` SHALL give its single-item delete dialog the declared `title`, `message` and
`description`, each through the app's translate, and SHALL keep the dialog's default for every key it leaves unset. The
dialog SHALL draw `description` as a line under the question and nothing when it is empty.

#### Scenario: deleting a publication
- **GIVEN** the Publications page with `deleteDialog.description` "The publication and its attachments leave the public page."
- **WHEN** a user deletes one publication
- **THEN** the dialog shows that line under the question
