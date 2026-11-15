## ADDED Requirements

### Requirement: A write made offline is sent once there is a connection

An offline queue SHALL keep every enqueued write with an idempotency key, SHALL send the writes in the order they were
made when the device is online, SHALL drop a write only after a 2xx or a 409 answer, and SHALL keep a write that did not
go through and the writes after it.

#### Scenario: a timer stopped on the train
- **GIVEN** the device is offline
- **WHEN** the person stops the timer
- **THEN** the write waits and `pendingCount` is 1
- **AND** once the device is online the write is sent once and `pendingCount` is 0
