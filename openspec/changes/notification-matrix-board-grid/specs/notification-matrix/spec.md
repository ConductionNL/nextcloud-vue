## ADDED Requirements

### Requirement: the notification matrix draws the board's grid in the board look

In the board look, CnNotificationMatrix MUST draw the event and channel headers without the per-channel controls and a centred checkbox per cell. It MUST offer the per-channel bundling, bundling time and test send, and an unusable channel's reason, in a disclosure below the grid. Each cell's source line MUST stay available to assistive technology through the checkbox's description, and MUST stay visible for a locked cell. The Nextcloud look MUST be unchanged.

#### Scenario: personal notification settings in the board look
- GIVEN the matrix with channels "In Nextcloud" and "Per e-mail" in the board look
- THEN the channel headers hold only the channel names
- AND the bundling select, time and test send for each channel sit in the disclosure below the grid

#### Scenario: a cell an administrator forced
- GIVEN a forced cell in the board look
- THEN its checkbox is disabled and its reason is visible beside it

#### Scenario: the Nextcloud look
- GIVEN the matrix in the Nextcloud look
- THEN the channel headers hold the bundling select and the test send, as before
