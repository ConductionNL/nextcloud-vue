# board-conversation Delta

## ADDED Requirements

### Requirement: A board message keeps a gutter opposite its avatar

In the board look a conversation message SHALL keep 64px free on the side away from its avatar: at the end for the
other side, at the start for ours. The line above the message SHALL be 13px in `--cn-board-text-soft` at line height
normal, its time in the same ink, and our bubble's text SHALL be in the main ink.

#### Scenario: DqZaakContact

- **GIVEN** the conversation with the resident in the board look
- **THEN** each bubble is 64px narrower than the thread and "Sanne de Vries" / "Pieter Jansen" stand in the soft ink
