## ADDED Requirements

### Requirement: The timeline stands in a card on a card surface

The `timeline` widget SHALL be registered as owning its title and asking for `chrome: "card"`, so the detail widget host
draws it in an untitled card in a tab stack or the side column, and bare in a body grid cell or bare chrome.

#### Scenario: case history in a tab stack
- **GIVEN** a tab stack holding a manage timeline and its note form card
- **WHEN** the tab opens
- **THEN** each SHALL stand in a card without a second title row

### Requirement: The note form card titles itself

In `composer: "only"` the manage timeline SHALL draw a title row with `content.title` (default "Add note") and
`content.subtitle` (default "Goes on the timeline above, internal unless you make it visible") above the form, when the
reader may manage the timeline.

#### Scenario: note form card with a configured title
- **GIVEN** `composer: "only"` and `content.title` "Add a note to the case"
- **WHEN** the reader may manage the timeline
- **THEN** the card SHALL show "Add a note to the case" as its title
