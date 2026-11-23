## ADDED Requirements

### Requirement: A self-titled library widget stands in a card on a card surface

The detail widget host SHALL draw a library widget whose registry entry owns its title and asks for `chrome: "card"` inside an untitled card on a card surface (a tab stack, the side column). In bare chrome and in a body grid cell it SHALL draw it bare.

#### Scenario: retention in a tab stack
- **GIVEN** a tab stack whose first widget is `retention`
- **WHEN** the tab opens
- **THEN** the retention widget SHALL stand in a card without a second title row
