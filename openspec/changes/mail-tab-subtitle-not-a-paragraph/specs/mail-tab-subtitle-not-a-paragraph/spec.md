## ADDED Requirements

### Requirement: The mail tab description keeps its size under a paragraph theme

CnMailTab SHALL render its description and hint in elements a paragraph theme rule does not match.

#### Scenario: thematiq on
- GIVEN a theme that sizes every paragraph with !important
- THEN the E-mail card's description is 14px in the board look
