## ADDED Requirements

### Requirement: Every diagnostics report names the app it came from

Every diagnostics report SHALL carry `appId`: the `appId` of the `CnAppRoot` whose store request or component produced it, or `null` when it cannot be told. A store request SHALL be attributed through the pinia the store belongs to, which `CnAppRoot` binds to its app id. A component report SHALL be attributed to the nearest `CnAppRoot` above the component. `CnAppRoot` SHALL hand its listener every report and SHALL stamp its `pageId` only on reports of its own app or of no known app. A report shown once per page visit SHALL be shown once per app.

#### Scenario: A preview's listener tells its own requests from the host's

- **GIVEN** a host `CnAppRoot` with app id `buildiq` and a preview `CnAppRoot` with app id `openbuild-preview` and its own pinia, both with a diagnostics listener
- **WHEN** the host's store and the preview's store each make a request
- **THEN** the preview's listener receives both reports, the host's with `appId: "buildiq"` and no preview `pageId`, its own with `appId: "openbuild-preview"` and the preview's `pageId`

#### Scenario: A request outside any app is not attributed

- **GIVEN** a diagnostics listener
- **WHEN** code calls `trackedFetch` without a store
- **THEN** the report carries `appId: null`
