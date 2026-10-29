# board-conversation-lines-as-drawn Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-conversation-lines-as-drawn](../../)

## Purpose

A conversation's messages and reply field keep the line heights DqZaakContact draws.

## ADDED Requirements

### Requirement: A board message's subject and note sit at the normal line height

In the board look CnConversationThread SHALL set a message's subject line and its note at the normal line height.
The message text SHALL keep line height 1.5.

#### Scenario: DqZaakContact

- **GIVEN** Sanne de Vries's mail with the subject "Onderwerp: Aanvulling op Woo-verzoek 2026-0110" and the note
  "Binnengekomen op het Woo-postvak, 1 bijlage"
- **THEN** the subject line is 18px and the note 15.6px tall, and the bubble is as tall as the board draws it

## MODIFIED Requirements

### Requirement: The board reply field is two normal lines

In the board look the reply field SHALL have 10px 12px of padding and 15px text at the normal line height, with room
for two lines (58px). This replaces the 1.5 line height and 67px of board-conversation-reply-box.

#### Scenario: DqZaakContact

- **GIVEN** the reply box under the conversation
- **THEN** the field "Antwoord aan de inwoner" is 58px tall
