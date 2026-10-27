## ADDED Requirements

### Requirement: A message's channel can carry its icon

When the conversation widget names an icon for a channel (`channelIcons`), the thread SHALL draw that icon before the channel's name on each message of that channel; a channel without one SHALL show its name alone.

#### Scenario: a phone call in the thread
- GIVEN `channelIcons: { phone: "PhoneOutline" }` and a message on channel phone
- THEN its chip shows the phone icon, then "Telefoon"
