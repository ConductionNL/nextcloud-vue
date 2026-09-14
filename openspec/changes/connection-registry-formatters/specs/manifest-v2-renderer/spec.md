## ADDED Requirements

### Requirement: Built-in connection registry formatters

The `cnFormatters` registry (`BUILT_IN_FORMATTERS` in `builtInFormatters.js`) SHALL provide `connectionStatus` and `connectionSettingsLabel`, resolvable by a column's `formatter` name. Both SHALL translate through the library's own slug (`nextcloud-vue`) at call time, and SHALL NOT throw on any input.

- `connectionStatus(value)` SHALL render `configured` as "Configured", `unconfigured` as "Not configured", `simulated` as "Simulated", `unavailable` as "Not available" and `error` as "Error". Any other value SHALL pass through as `String(value)`. Null and undefined SHALL render as an empty string.
- `connectionSettingsLabel(value)` SHALL render "Open settings" when `value` is a non-empty string, and an empty string otherwise.
- A consumer formatter registered under the same name SHALL override the built-in.

#### Scenario: A connection status column renders the label

- **WHEN** a column declares `{ key: "status", formatter: "connectionStatus" }` and a row carries `status: "simulated"`
- **THEN** the cell SHALL render "Simulated", or "Gesimuleerd" for a Dutch reader

#### Scenario: An unknown status passes through

- **WHEN** the `connectionStatus` formatter receives `"degraded"`
- **THEN** it SHALL return `"degraded"` unchanged

#### Scenario: A connection without a settings section offers no link text

- **WHEN** the `connectionSettingsLabel` formatter receives an empty `settingsUrl`
- **THEN** it SHALL return an empty string

#### Scenario: An app copy keeps winning

- **WHEN** an app passes `formatters: { connectionStatus: appFn }` to `CnAppRoot`
- **THEN** the provided `cnFormatters.connectionStatus` SHALL be `appFn`, and `connectionSettingsLabel` SHALL still be the built-in
