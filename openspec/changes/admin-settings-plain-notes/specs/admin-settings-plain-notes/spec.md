# admin-settings-plain-notes

## ADDED Requirements

### Requirement: An admin shell can draw its cards' notes plain

In the board look a CnAdminSettingsShell with `plainNotes` SHALL draw the notes in its cards without an icon, and a warning note on the board's peach ground with its own edge.

#### Scenario: KCC-werkplek-integratie
- GIVEN dossiq's Geavanceerd tab with `plainNotes`
- THEN the KCC scope note shows its text without the info icon

#### Scenario: a warning note
- GIVEN the Financiële integratie card without a callback secret
- THEN its warning note has a #fff4e5 ground and a #f0c987 edge, no icon
