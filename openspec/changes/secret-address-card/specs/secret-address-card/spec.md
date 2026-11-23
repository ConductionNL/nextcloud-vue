# secret-address-card Delta: secret-address-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [secret-address-card](../../)

## Purpose

Make, show once, copy, reset and revoke an address with a secret token, over the app's own endpoints.

## ADDED Requirements

### Requirement: A secret address is made, shown once, reset and revoked

CnSecretAddressCard SHALL read from `statusUrl` whether an address exists. A create SHALL call `createUrl` and show the
address at `addressPath` once, with a notice that it is shown once, a copy button and the `extraLinks` whose scheme is
http(s), mailto, a same-origin path or webcal(s). While an address exists the create button SHALL read as a reset. A
revoke SHALL ask for a confirm before it calls `revokeUrl`, and then say the address stopped working. `{objectId}` in a
url SHALL be the `objectId` prop. A refusal SHALL show the server's words. With `dialog` the card SHALL draw its own
dialog named `title` and emit `close` when it closes.

#### Scenario: A user subscribes to their timetable

- **GIVEN** a user without a calendar address
- **WHEN** they make one
- **THEN** the address and its webcal link are shown once, with a copy button

#### Scenario: A leaked address is reset

- **GIVEN** a user with an address
- **WHEN** they reset it
- **THEN** a new address is shown and the server stops answering the old one
