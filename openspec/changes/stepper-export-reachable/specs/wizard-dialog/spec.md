## ADDED Requirements

### Requirement: The stepper can reach ahead to a step already filled in

CnStepper SHALL be exported. With `allowJumpBack` and a `reachableIndex`, every step up to `reachableIndex` other than
the current one SHALL be a button that emits `jump` with its id; a step past `reachableIndex` SHALL NOT be a button.

#### Scenario: back to the audience after filling in delivery
- **GIVEN** a six-step wizard where step 4 (Delivery) was reached and the user went back to step 2
- **WHEN** the stepper renders with `currentIndex` 1 and `reachableIndex` 3
- **THEN** steps 1, 3 and 4 are buttons, step 2 is the current step, steps 5 and 6 are not buttons
