# store-page

## ADDED Requirements

### Requirement: A card says where its item is installed

When the store search answers with `installed`, a card whose item is installed into one or more targets SHALL read
"Installed in" followed by those targets' labels, or their ids where no label is known. An install without target
SHALL add no line. A whole install SHALL add its target to the card at once. Without `installed`, or with a malformed
one, no card SHALL show the line.

#### Scenario: a skill tree installed into one world

- GIVEN targets "De Zuiderlanden" (w1) and "Nevelkust" (w2)
- AND the search answers `installed: { skills: ["w1"] }`
- THEN the skills card reads "Installed in De Zuiderlanden"

#### Scenario: a second install adds its world at once

- GIVEN the skills card reads "Installed in De Zuiderlanden"
- WHEN the administrator installs it into Nevelkust and every part installs
- THEN the card reads "Installed in De Zuiderlanden, Nevelkust"

#### Scenario: an engine that does not report installs

- WHEN the search answers without `installed`
- THEN no card shows an "Installed in" line
