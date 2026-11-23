# board-facts-notice-tinted

## ADDED Requirements

### Requirement: A facts card's notice is a tinted box in its tone

In the board look a facts card's `error`, `warning` or `success` notice MUST be drawn as a box in the tone's light ground with the text and icon in the tone's ink, an 8px radius and no edge bar.

#### Scenario: a cash difference outside the margin

- GIVEN a detail page in the board look with a facts card whose `notice` has `variant: "error"`
- WHEN the notice shows
- THEN it has the light red ground, the error ink, an 8px radius and no left bar
