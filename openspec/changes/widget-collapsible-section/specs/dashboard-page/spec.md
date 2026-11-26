# dashboard-page Specification (delta)

## ADDED Requirements

### Requirement: A widget can fold to its header

A dashboard widget whose definition or layout entry says `collapsible: true` SHALL draw a button in its card header that
folds the card to its header and opens it again. The button MUST carry `aria-expanded` and `aria-controls` naming the
card body, and a label "Collapse {title}" or "Expand {title}". A folded card MUST NOT show its body or footer. A widget
without `collapsible` SHALL behave as before.

#### Scenario: Folding a side section
- **GIVEN** My work with the widget "Recent activity" declared `collapsible: true`
- **WHEN** the user clicks "Collapse Recent activity"
- **THEN** only the card's header shows, and the button reads "Expand Recent activity"

### Requirement: A folded widget stays folded for that user

On a dashboard page that keeps a per-user layout (`userLayout` or `layoutPanel`), folding or opening a collapsible
widget SHALL be stored with that user's layout record, and the page SHALL draw the widget folded when the record says
so. "Back to default" SHALL open every folded widget again. On a page without a per-user layout the fold SHALL last for
the visit only.

#### Scenario: Collapsed stays collapsed
- **GIVEN** the user folded "Recent activity" on My work
- **WHEN** the user reloads My work
- **THEN** "Recent activity" is still folded

#### Scenario: Back to default
- **GIVEN** the user folded "Recent activity"
- **WHEN** the user chooses Back to default
- **THEN** "Recent activity" is open again
