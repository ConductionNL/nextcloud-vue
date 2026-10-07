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

### Requirement: REQ-WALK-AUD-002 A paused tour stays hidden until the user continues

A tour paused with the X, ESC or the dim SHALL be stored as paused with its step. On
the next page load it SHALL NOT show on its own. "Continue" (in the user settings or
the app's tour entry) SHALL show it at the saved step and clear the paused mark.
"Start over" SHALL begin at step 1.

#### Scenario: Reload after pausing

- **GIVEN** the user paused the tour on step 2
- **WHEN** the user reloads the app
- **THEN** the tour SHALL stay hidden

#### Scenario: Continue after a reload

- **GIVEN** the user paused the tour on step 2 and reloaded
- **WHEN** the user picks "Continue where you left off"
- **THEN** the tour SHALL show step 2
