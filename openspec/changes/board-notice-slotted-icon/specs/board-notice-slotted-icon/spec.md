# board-notice-slotted-icon Delta

## ADDED Requirements

### Requirement: A side notice's slotted icon is 18px

In the board look, a side notice's icon SHALL be 18px, whether NcNoteCard wraps it in `notecard__icon` or renders it as a
slotted material icon, so that the text starts 44px into the notice.

#### Scenario: DqSociaalDomein

- **GIVEN** the case "Melding Jeugdwet gezin Oosthaven" with special categories of data
- **THEN** "Bijzondere persoonsgegevens: gezondheid." starts 44px into the notice
