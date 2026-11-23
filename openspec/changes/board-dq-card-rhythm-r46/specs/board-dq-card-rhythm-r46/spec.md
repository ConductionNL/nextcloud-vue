# board-dq-card-rhythm-r46 Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dq-card-rhythm-r46](../../)

## Purpose

The dossiq detail cards keep the rhythm the boards draw for feeds, side paragraphs, the reply box, footnotes, notes
and linked mail.

## ADDED Requirements

### Requirement: A ruled feed starts 12px under the title

In the board look a page card's ruled feed (`presentation: feed`, `ruleAbove`) SHALL start its rule 12px under the
title, as a ruled list does.

#### Scenario: DqContact "Laatste contactmomenten"

- **GIVEN** the feed of the contact's latest moments
- **THEN** the first moment's text is 25px under the title

### Requirement: A side card of running text reads as one paragraph

In the board look a side CnFactsWidget that holds only text entries SHALL set them at 14px on a 1.5 line height
with no gap between them, so they read as one paragraph, 10px under the card's title.

#### Scenario: DqTaak "Wat deze taak tegenhoudt"

- **GIVEN** the next status sentence and the "waiting since" sentence
- **THEN** both read as one three-line paragraph and the card is 133px tall, as drawn

### Requirement: The reply box's head is set on the normal line

In the board look the conversation reply box's label and hint SHALL be set on the normal line height, the label at
14px.

#### Scenario: DqZaakContact "Antwoord aan de inwoner"

- **GIVEN** the reply box under the conversation
- **THEN** its head is 17px tall and the conversation card is as tall as drawn

### Requirement: A card's footnote and foot link are set on the normal line

In the board look a data card's footnote, a history card's footnote and the calendar card's "Openen in Agenda" link
SHALL be set on the normal line height.

#### Scenario: DqSociaalDomein "Historie"

- **GIVEN** the history card with its "Kenmerk" footnote
- **THEN** the footnote is 15px tall and the Status card under it sits where drawn

### Requirement: A note row is as tall as its two lines

In the board look a note in a page card SHALL be as tall as its note and its meta line, with no minimum height of
the list item; the meta line SHALL be 13px, 2px under the note, and another author's initials SHALL be in the soft
ink.

#### Scenario: DqZaakEmail "Notities"

- **GIVEN** two notes on the case
- **THEN** each row is 60px tall, its rule included

### Requirement: A linked mail's sender line wraps on the case card

In the board look the sender line of a mail linked on the case's E-mail card SHALL wrap instead of being cut off.

#### Scenario: DqZaakEmail "Aanvulling op Woo-verzoek"

- **GIVEN** a sender line longer than the row
- **THEN** it runs on to a second line and the row is 75px tall
