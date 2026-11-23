## ADDED Requirements

### Requirement: The walkthrough follows the board look
Under the board look CnWalkthrough SHALL name the step in words, SHALL draw one dot per step with the current dot wide, and SHALL open a step without a target as a wide card near the top of the page. The dots SHALL be hidden from assistive technology, because the counter already says the same.

#### Scenario: A tour opens under the board look
- GIVEN an app in the board look with a tour of six steps
- WHEN the tour opens on its first step
- THEN the card reads "Step 1 of 6" and draws six dots, the first one wide

#### Scenario: The default look is unchanged
- GIVEN an app without the board look
- WHEN the tour opens
- THEN the card reads "1 / 6" in the middle of the screen, without dots
