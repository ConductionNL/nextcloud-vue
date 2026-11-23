## ADDED Requirements

### Requirement: A file column can require another app

A declared CnFilesBrowser column with `requiredApp` SHALL be part of the
browser's columns only while at least one named app is enabled for the user
(`isAppInstalled`). A column without `requiredApp` SHALL be unaffected.

#### Scenario: no virus scanner
- GIVEN a column `{ key: "scanVerdict", requiredApp: "files_antivirus" }`
- AND files_antivirus is not enabled
- THEN the table and the Columns chooser leave the column out

#### Scenario: a scanner is enabled
- GIVEN the same column and files_antivirus enabled
- THEN the column is declared as before

#### Scenario: a list of apps
- GIVEN `requiredApp: ["files_antivirus", "other_scanner"]`
- WHEN only other_scanner is enabled
- THEN the column is kept
