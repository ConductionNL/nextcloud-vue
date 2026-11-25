# properties-table-by-keyboard Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A property row opens from the keyboard

In CnPropertiesTab, the name of every row that can be edited inline SHALL be a button in the tab order. Activating it with
Enter or Space SHALL open the row for editing and move focus into its input, as a click on the row does. A row that
cannot be edited SHALL have no such button.

#### Scenario: an officer fills a title by keyboard

- **GIVEN** OpenCatalogi's Create Publication dialog
- **WHEN** the officer tabs to "Title" and presses Enter
- **THEN** the title input has focus and takes what the officer types
