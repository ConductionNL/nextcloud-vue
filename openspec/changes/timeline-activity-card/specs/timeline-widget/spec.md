# timeline-widget

## ADDED Requirements

### Requirement: The read view can draw its events as a feed

With `layout: 'feed'` each event SHALL be one row: a round icon (the event's icon, else a generic one), a meta line of the moment, the kind and the author separated by " · ", and the text. The moment SHALL name day and short month, the time unless the source value is a calendar day, and the year only when it is not the current year. A detail that differs from the text SHALL stand under it. Type chips SHALL be pills; the chosen one filled and pressed.

#### Scenario: a contact moment in the client's activity
- **GIVEN** a contact moment on 2 October at 09:30 by Fatma Yildiz
- **THEN** its row reads "2 okt, 09:30 · contactmoment · Fatma Yildiz" above the text

### Requirement: The read view can take a note

With `composer` (`{ placeholder, label, submitLabel }`) and a known record, the read view SHALL draw a note box with a submit button above the list. Submitting SHALL write the text as an OpenRegister note on the record, empty the box, announce `cn:timeline:changed` and read the timeline again. A note that is not saved SHALL keep its text and say so. An empty box SHALL not submit. The read view SHALL read again when `cn:timeline:changed` names its record from elsewhere.

#### Scenario: an internal note on a client
- **WHEN** the user types a note and presses "Notitie toevoegen"
- **THEN** the note is posted to `/objects/{register}/{schema}/{id}/notes` and the feed reads again

### Requirement: An email can be linked from a card header

A widget header action SHALL dispatch with the record as token context, so a `navigate` target fills `@object.<field>` inside its URL. `CnEmailLinkDialog` (`register`, `schema`, `objectId`) SHALL open the Mail picker and link the picked message to the record; an already linked message counts as linked. After a link it SHALL announce `cn:timeline:changed` and close; a failed link SHALL say so and stay open.

#### Scenario: Compose in Mail
- **GIVEN** a header action `navigate` to `/index.php/apps/mail/compose?uri=mailto:@object.email`
- **WHEN** the user presses it on a client with e-mail s.devries@example.nl
- **THEN** Mail opens its composer to that address
