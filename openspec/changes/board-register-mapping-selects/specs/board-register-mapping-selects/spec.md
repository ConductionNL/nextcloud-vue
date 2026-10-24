# board-register-mapping-selects

## ADDED Requirements

### Requirement: The board register selects are as wide as the board and carry no clear button

In CnRegisterMapping's board `selects` layout the register select SHALL fill its half-width cell and each schema select SHALL have no clear button. Other layouts SHALL be unchanged.

#### Scenario: Configuratie
- GIVEN dossiq's System tab in the board look
- THEN the Register select spans half the card and "Zaak", "Zaaktype" … show no "×"
