## ADDED Requirements

### Requirement: The shipped configuration section says each seeded object's state and offers its newer version

`CnShippedConfigurationSection` SHALL list `GET {endpoint}/{schema}` with each object's state in words, its set and version, and a button to take a newer version only where `updateAvailable` holds and the object is not removed. Taking it over a local change SHALL say so on the button and post `acceptLocalChangeLoss: true`. A refusal's `reason` SHALL be shown. An empty ledger beside a register that holds objects SHALL say how many it holds.

#### Scenario: A changed case type has a newer version

- **WHEN** a row is `{ state: "changed", updateAvailable: true, latestVersion: "1.1" }`
- **THEN** it reads "Shipped, changed here" and offers "Take 1.1 and lose your change"
