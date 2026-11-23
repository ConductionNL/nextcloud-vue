## ADDED Requirements

### Requirement: Module and list cards set their text on the normal line

A module card SHALL set its title, its pages line and its page links on the normal line, and its Open button SHALL never be underlined. A list card SHALL set its title on the normal line.

#### Scenario: PqModules
- GIVEN pipelinq's Modules page
- WHEN it renders its module cards and its list cards
- THEN "Verkoop" and "Ook in Pipelinq" are 17px titles on a 20.4px line
- AND the "Open" button has no underline
