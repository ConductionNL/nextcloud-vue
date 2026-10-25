## ADDED Requirements

### Requirement: The calendar and Deck cards draw ruled rows in the board look

On a detail page in the board look the calendar and Deck cards SHALL draw each item as a ruled row with its title, one meta line and its status or label at the end, and SHALL put the link to the app under the rows.

#### Scenario: a linked Deck card
- **GIVEN** the Deck card "Lakken offerte lantaarnpalen" on board "Woo en informatie", list "Deze week", for Lars de Koning
- **THEN** its row reads the title and "Bord Woo en informatie · lijst Deze week · Lars de Koning", and "Deck openen" follows the rows
