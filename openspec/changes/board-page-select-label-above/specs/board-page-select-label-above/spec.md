## ADDED Requirements

### Requirement: A labelled select in a board page card carries its label above

In the board look, an NcSelect with a visible label inside a page card SHALL show its label above the control at 14px, weight 600, on the normal line height, with the control 40px high and 21px of room above it.

#### Scenario: the mail template field
- GIVEN the E-mail card on a case page in the board look
- THEN "E-mailsjabloon" stands above the field, 6px over its 40px edge
- AND "Concept openen uit sjabloon" stands beside it, level with the field

#### Scenario: an unlabelled filter select
- GIVEN a select labelled only for assistive technology
- THEN it keeps its height and margins
