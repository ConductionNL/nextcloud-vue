# record-notes-widget Delta

## ADDED Requirements

### Requirement: A text field saves as you type

A `record-notes` widget SHALL show a text field of the record in view and PATCH only that key a moment after the last keystroke, then say when it last saved. Without a record to save to it SHALL be read-only, and a failed save SHALL keep the text and say so.

#### Scenario: PqContactmoment Gespreksnotities

- **WHEN** the handler types in the notes
- **THEN** the notes are saved and the line reads "Wordt automatisch opgeslagen terwijl je typt. Laatst opgeslagen 09:19."

### Requirement: An outcome is saved with its own button

A `record-notes` widget with `outcome` SHALL offer the configured options in a select and save the chosen one only when its button is pressed.

#### Scenario: Uitkomst noteren

- **WHEN** the handler picks "Terugbellen afgesproken" and presses "Uitkomst noteren"
- **THEN** the record's outcome is callbackRequest

### Requirement: The label can be hidden under a heading that names the field

With `content.hideLabel: true` CnRecordNotesWidget SHALL keep the text field's label, tied to the field, for assistive
technology and SHALL NOT show it.

#### Scenario: Board PqContactmoment

- **GIVEN** the notes widget in a section headed "Gespreksnotities", with label "Gespreksnotities" and `hideLabel: true`
- **THEN** the heading is the only visible "Gespreksnotities"
- **AND** the text field is still labelled "Gespreksnotities"
