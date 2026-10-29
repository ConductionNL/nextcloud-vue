# board-conversation-reply-box Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-conversation-reply-box](../../)

## Purpose

The reply box under a conversation reads as DqZaakContact draws it.

## ADDED Requirements

### Requirement: The reply option and buttons share a row

CnConversationThread SHALL draw the reply option and the reply buttons in one row, the option at the start and the
buttons at the end, wrapping when the width runs out. An error message SHALL sit above that row. The Send button
SHALL carry the send icon.

#### Scenario: DqZaakContact

- **GIVEN** a reply box with the option "Vastleggen als contactmoment op deze zaak"
- **THEN** the option and "Versturen" are in the same row, and "Versturen" shows the send icon

### Requirement: The board reply box

In the board look the reply box SHALL open with a `--cn-board-hairline` rule and 16px above it and keep 10px between
its parts. The field SHALL have 10px 12px of padding, 15px text at line height 1.5 and room for two lines (67px).
The option SHALL be 14px.

#### Scenario: DqZaakContact

- **GIVEN** the Contact tab in the board look
- **THEN** "Antwoord aan de inwoner" sits under a hairline and its field is 67px tall
