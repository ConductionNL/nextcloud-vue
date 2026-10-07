# cn-walkthrough: the X pauses the tour

## MODIFIED Requirements

### Requirement: REQ-WALK-AUD-001 The corner X pauses the tour

The corner close button SHALL pause the tour and keep its step, the same as ESC and a
click on the dim. Only finishing the last step (or a host-supplied Skip) SHALL complete
it. A replay SHALL continue an unfinished tour where the user was; "Start over" SHALL
begin at step 1.

#### Scenario: Closing the tour with the X

- **GIVEN** the user is on step 2 of a tour
- **WHEN** the user clicks the X
- **THEN** the tour SHALL hide, SHALL NOT be recorded as seen, and the saved step SHALL stay

#### Scenario: Restarting after the X

- **GIVEN** the user closed the tour with the X on step 2
- **WHEN** the user starts the tour again from a replay entry
- **THEN** the tour SHALL continue at step 2

#### Scenario: Start over

- **GIVEN** the user closed the tour with the X on step 3
- **WHEN** the user chooses "Start over" in the user settings
- **THEN** the tour SHALL begin at step 1
