## ADDED Requirements

### Requirement: The conversation subtitle keeps its 14px under a paragraph theme

CnConversationThread SHALL render its subtitle in an element a paragraph theme rule does not match, at 14px with the normal line height.

#### Scenario: thematiq on
- GIVEN a theme that sizes every paragraph with !important
- THEN "Oudste bovenaan, met het kanaal per bericht" is 14px
