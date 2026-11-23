# board-link-cards-page

## ADDED Requirements

### Requirement: The links page draws as the hub boards do (REQ-BLCP-001)
The links page SHALL title the page with an h1 and each group with an h2, and end every grid card with a trailing chevron or, for a card that opens a new tab, an open-in-new mark. In the board look it SHALL lay its cards in columns of at least 320px 16px apart, with the hairline border, 18px padding, a 40px icon tile, a 17px label, a 14px description and a status pill 21px tall.

#### Scenario: pipelinq's Geavanceerd hub
- **GIVEN** pipelinq's advanced page in the board look at 1440px
- **WHEN** the page is drawn
- **THEN** its title SHALL sit at y 96, its first caption at 188 and its first card at 215, 362.7px wide, as PqGeavanceerdHub draws them
- @e2e exclude {layout is measured by the screens compdiff run}
