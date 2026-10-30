# data-table Delta

## ADDED Requirements

### Requirement: A board avatar cell draws the initials chip

In the board look an avatar cell SHALL draw the person's initials chip, never the Nextcloud avatar picture, sized by
`widgetProps.size` and toned light primary, or grey with `widgetProps.tone: "neutral"`. A grey chip of 28px or less
SHALL set its initials at 12px, a larger one at 13px. The Nextcloud look SHALL keep the avatar picture.

#### Scenario: DqTaken

- **GIVEN** a task held by pieter (Pieter Jansen), in the board look
- **THEN** the Behandelaar cell reads a "PJ" chip and "Pieter Jansen", with no avatar picture

#### Scenario: PqLeads owner

- **GIVEN** the leads list in the board look, its owner column a grey 28px chip
- **THEN** the owner "JB" chip sets its initials at 12px
