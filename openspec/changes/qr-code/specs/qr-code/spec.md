# qr-code Delta: qr-code

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [qr-code](../../)

## Purpose

A user scans a code, or types it in, and sees how long it still holds.

## ADDED Requirements

### Requirement: The drawn code says the value

`CnQrCode` SHALL draw `value` in the browser as an SVG with `role="img"` and an accessible name, black on white with a quiet zone of four modules in
every theme. A separate decoder SHALL read it back as `value`. An empty `value` SHALL draw no code. A `value` too long to encode SHALL draw no code
and SHALL say so with `role="alert"`. `code` SHALL show as text in a polite live region.

#### Scenario: A wallet offer

- **GIVEN** an `openid-credential-offer://` address as `value`
- **THEN** the decoded symbol equals the address, and every block holds under its error correction

#### Scenario: Too long

- **GIVEN** a `value` of 667 bytes
- **THEN** there is no image, and an alert says the text is too long

### Requirement: A code changes on a timer

With `refreshUrl` and `refreshSeconds` the component SHALL read the address on mount and then every `refreshSeconds`, or sooner when the answer's
`secondsLeft` runs out first. It SHALL count down from a deadline, not from ticks, and SHALL emit `refreshed` with the whole response. A failed read SHALL
keep the last code, replace the countdown with a notice in `role="alert"`, emit `refresh-error` and try again after `refreshSeconds`. An answer arriving
after unmount SHALL be dropped. Without `refreshUrl` it SHALL emit `expired` once when `refreshSeconds` has passed, and start over on a new `value`.

#### Scenario: Board LqLes "verandert over 18 s"

- **GIVEN** an answer with `code` "K7QM4RTA" and `secondsLeft` 18
- **THEN** the component shows the code and "Changes in 18 s"

#### Scenario: A throttled tab

- **GIVEN** a 30 second countdown
- **WHEN** 13 seconds pass and only one timer tick arrives
- **THEN** the countdown says 17

#### Scenario: The read fails

- **WHEN** a read fails
- **THEN** the last code stays and an alert says it may no longer work
- **WHEN** the next read succeeds
- **THEN** the alert is gone
