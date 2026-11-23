## ADDED Requirements

### Requirement: An index page finds a record by scanning its code

An index page with `scan.enabled` and `scan.field` SHALL show a scan field above the list, SHALL filter the list on that
field with the scanned or typed code, SHALL open the record when `onMatch` is `open` and exactly one record matches, and
SHALL say so when none does.

#### Scenario: scanning a device label
- **GIVEN** the devices page with `scan: { enabled: true, field: "serienummer", onMatch: "open" }`
- **WHEN** a technician scans the label of device SN-0042
- **THEN** that device's page opens
