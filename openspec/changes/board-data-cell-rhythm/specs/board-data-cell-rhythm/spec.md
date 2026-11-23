## ADDED Requirements

### Requirement: A data card's label and value sit 3px apart on the normal line height

In the board look, a CnObjectDataWidget cell SHALL put 3px between its label and value, both on the normal line height.

#### Scenario: the receipt card
- GIVEN DqZaakContact's Ontvangstbevestiging card
- THEN "Ontvangen op" and its date stand 3px apart without extra leading
