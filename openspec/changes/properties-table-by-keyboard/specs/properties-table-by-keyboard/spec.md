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

### Requirement: A detail page's widgets are in the tab order

A CnDetailGridCell that holds its content back until it nears the viewport SHALL mount it on the first Tab key press,
so a keyboard user reaches every widget's controls, including those below the fold.

#### Scenario: an officer withdraws from the publication status widget

- **GIVEN** OpenCatalogi's publication detail page, whose publication status widget sits below the fold
- **WHEN** the officer tabs through the page
- **THEN** the widget's Withdraw button is reached
