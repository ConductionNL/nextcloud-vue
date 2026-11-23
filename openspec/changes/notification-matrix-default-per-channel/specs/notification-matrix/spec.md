# notification-matrix Delta: notification-matrix-default-per-channel

## ADDED Requirements

### Requirement: An event's default can differ per channel

CnNotificationMatrix SHALL read an event's `appDefault` as the default for every channel when it is a boolean, and as each channel's own default when it is an object keyed by channel id.

#### Scenario: Opt-in e-mail
- GIVEN appDefault { nc-notification: true, email: false } and no value set
- THEN the In Nextcloud cell is checked and the e-mail cell is not
