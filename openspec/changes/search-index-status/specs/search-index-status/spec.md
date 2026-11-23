## ADDED Requirements

### Requirement: The search index panel shows OpenRegister's figures and names the commands

`CnSearchIndexStatus` SHALL show the tables in scope, the indexes on them, the last run (or "Never") and whether a rebuild locks the table, read live, and name the `occ` command that acts on them. A failed read SHALL be shown as the failure, not as zeroes.

#### Scenario: Maintenance never ran

- **WHEN** OpenRegister answers `lastRun: []`
- **THEN** Last run reads "Never"
