## ADDED Requirements

### Requirement: A record list avatar can draw two letters for one word

A record list SHALL draw the first `avatar.letters` letters of a one-word avatar name, and the first and last initial of a name of two words or more. Without `letters` a one-word name SHALL give one letter. When `avatar.text` lists templates, the first that fills SHALL name the avatar.

#### Scenario: a related case of one-word type
- **GIVEN** a list with `avatar: { text: "{caseTypeTitle}", letters: 2 }`
- **WHEN** it draws a case of type Adviesaanvraag
- **THEN** the avatar SHALL read "AD"

#### Scenario: a planned row without a case type
- **GIVEN** `avatar: { text: ["{caseTypeTitle}", "{plannedKind}"], letters: 2 }`
- **WHEN** a row has no case type and its kind reads "Reeks"
- **THEN** the avatar SHALL read "RE"
