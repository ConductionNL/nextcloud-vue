## ADDED Requirements

### Requirement: The record task table sorts and filters from its heads

With `content.sortable` a task table head SHALL sort the rows by its column, ascending then descending, the deadline by date. With `content.filterable` a head SHALL offer the column's values and keep the rows with the chosen ones.

#### Scenario: tasks of one handler
- **GIVEN** a case with tasks for Pieter and for Lars
- **WHEN** the handler ticks Lars under "Behandelaar"
- **THEN** only Lars's tasks remain
