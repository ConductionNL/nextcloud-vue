## ADDED Requirements

### Requirement: A frame can take its title from a record

A frame with `titleFrom: { source: { register, schema, filter, sort? }, field }` SHALL show as its title the value of `field` on the first record that matches `filter` (tokens such as `@me` resolved), read under the reader's rights. Without a match, or while a token is unresolved, it SHALL show its configured `title`.

#### Scenario: the inspection underway
- **GIVEN** a frame `{ title: "Checklist", titleFrom: { source: { register: "dossiq", schema: "fieldInspection", filter: { inspectorRef: "@me", status: "in_progress" } }, field: "location" } }`
- **AND** the reader has an inspection in progress at "Kerkplein 7"
- **THEN** the frame is titled "Kerkplein 7"

#### Scenario: nothing underway
- **GIVEN** the same frame and no inspection in progress
- **THEN** the frame is titled "Checklist"

### Requirement: The offline status can name the last synchronisation

With `status.syncedFrom: { source: { register, schema, filter }, field }` the widget SHALL read the newest value of `field` among the matching records. While the device is offline and a time is known, the status line SHALL read `offlineSyncedText` with `{time}` replaced by that time as hours and minutes; otherwise it SHALL read `offlineText`. Online it SHALL read `onlineText`.

#### Scenario: synchronised this morning
- **GIVEN** `syncedFrom` over the outbox entries with status `synced`, the newest at 07:42
- **AND** `offlineSyncedText` "Offline · synchronised at {time}"
- **WHEN** the device is offline
- **THEN** the status reads "Offline · synchronised at 07:42"
