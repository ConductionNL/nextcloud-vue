# board-facts-card-actions-34

## ADDED Requirements

### Requirement: A facts card's action buttons are 34px in every card

In the board look the action buttons of a facts card MUST be 34px high, in a main-column card as well as in the side column.

#### Scenario: a payment card's reverse button

- GIVEN a detail page in the board look with a facts card in the main column
- AND the card declares an `error-outline` action
- WHEN the page renders
- THEN the action button is 34px high, not the header's 40px
