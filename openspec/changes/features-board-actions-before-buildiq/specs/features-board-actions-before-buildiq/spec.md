# features-board-actions-before-buildiq Delta

## ADDED Requirements

### Requirement: The features board header follows the board's button order

The features board SHALL draw its header buttons in the order Documentation, Actions menu, buildiq, Suggest feature,
leaving out the ones the page turns off.

#### Scenario: dossiq's roadmap page

- **GIVEN** a roadmap page without tabs, with documentation and the Actions menu
- **THEN** the header reads Documentation, Actions, then the buildiq square
