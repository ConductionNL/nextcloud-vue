## ADDED Requirements

### Requirement: A person can switch web push on for this device

The web push switch SHALL NOT ask for notification permission until the person switches it on. Switching on SHALL ask
permission, subscribe with OpenRegister's VAPID key and register the subscription with OpenRegister; switching off SHALL
unsubscribe and remove the registration. When it cannot switch, it SHALL say why.

#### Scenario: no prompt on page load
- **WHEN** Mijn HR opens with the switch on the page
- **THEN** no permission prompt appears, and the switch shows whether this device is subscribed

#### Scenario: blocked notifications
- **GIVEN** the browser blocks notifications for the site
- **WHEN** the person switches on
- **THEN** the switch stays off and says the notifications are blocked
