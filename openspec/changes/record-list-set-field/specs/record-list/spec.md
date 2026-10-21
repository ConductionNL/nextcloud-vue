# record-list

## ADDED Requirements

### Requirement: A row can set a field of the page record

A record list `rowActions` entry of `type: "set-field"` SHALL draw a button on each row that opens nothing, named by `ariaLabel` filled from the row when given. Pressing it SHALL PATCH the page's record with `{ [field]: value }`, `value` filled from the row, then hand the saved record to the page through `cnObjectContext.setObject` and read the list again. A row whose filled `value` equals the record's `field` SHALL show `doneLabel` instead of the button. A refusal SHALL show the server's sentence and keep the list. A `set-field` entry SHALL NOT appear in the row's actions menu.

#### Scenario: Assign a suggested colleague
- **GIVEN** a list of suggested colleagues on ticket t-1 whose assignee is bram
- **THEN** bram's row shows "Assigned" and anna's row shows "Assign"
- **WHEN** the user presses Assign on anna's row
- **THEN** t-1 is patched with `{ assignee: "anna" }` and the page shows the saved ticket

### Requirement: A footnote can read another part of the answer

A record list `footnote` of the form `{ path, text }` SHALL read `path` of the answer of the list's `endpointSource` without a second request, fill `{value}` into `text`, and show it also when the list has no rows. It SHALL NOT show when the value is empty, zero or false.

#### Scenario: Colleagues at capacity
- **GIVEN** the suggestions endpoint answers `{ suggestions: [...], atCapacity: 2 }`
- **THEN** the footnote reads "2 matching colleagues at capacity"
