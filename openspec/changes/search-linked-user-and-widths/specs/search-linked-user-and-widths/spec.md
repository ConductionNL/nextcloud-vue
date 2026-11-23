## ADDED Requirements

### Requirement: The search names a linked user and sizes its columns

A search kind with `linkedUser: true` SHALL show the display name of the user its Linked value names, keeping the id
when the user is unknown; `sourceConfig.columnWidths` SHALL set the width of each column it names.

#### Scenario: A case handled by Pieter
- GIVEN the cases kind with linkedField assignee and linkedUser true
- THEN the Gekoppeld cell reads "Pieter Jansen"
