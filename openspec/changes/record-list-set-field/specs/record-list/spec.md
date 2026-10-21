# record-list

## ADDED Requirements

### Requirement: A row can set a field of the page record

A record list `rowActions` entry of `type: "set-field"` SHALL draw a button on each row that opens nothing, named by `ariaLabel` filled from the row when given. Pressing it SHALL PATCH the page's record with `{ [field]: value }`, `value` filled from the row, then hand the saved record to the page through `cnObjectContext.setObject` and read the list again. A row whose filled `value` equals the record's `field` SHALL show `doneLabel` instead of the button. A refusal SHALL show the server's sentence and keep the list. A `set-field` entry SHALL NOT appear in the row's actions menu.

#### Scenario: Assign a suggested colleague
- **GIVEN** a list of suggested colleagues on ticket t-1 whose assignee is bram
- **THEN** bram's row shows "Assigned" and anna's row shows "Assign"
- **WHEN** the user presses Assign on anna's row
- **THEN** t-1 is patched with `{ assignee: "anna" }` and the page shows the saved ticket
