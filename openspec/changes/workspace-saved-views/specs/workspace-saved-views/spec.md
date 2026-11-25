## ADDED Requirements

### Requirement: A dashboard saves and applies its workspace filters as views

The `saved-views` widget with `content.workspace.keys` SHALL save, list, apply and delete the dashboard page's own saved
views. "Save view" (`CnSavedViewsControl`) MUST open the save dialog and save the current values of the named workspace
keys as the view's filters, under `content.scope`, through OpenRegister's Views API; an empty value is not stored. The
list MUST show the reader's views of that scope (with `own: false` also those shared with them). Clicking a view MUST
write every named key into the page workspace: the view's value, or the empty value for a key the view does not hold.
An own view MUST offer a delete button that deletes it after a confirmation. A refused save MUST keep the dialog open
with the reason.

#### Scenario: Save the current filters
- **GIVEN** a dashboard page whose workspace holds `lens: leads` and `priority: urgent`
- **WHEN** the reader saves the view as "Urgent leads"
- **THEN** OpenRegister stores a view with filters `{ lens: leads, priority: urgent }` under the page's scope
- **AND** "Urgent leads" is listed

#### Scenario: Apply a view
- **GIVEN** a saved view with filters `{ lens: tickets, priority: urgent }`
- **WHEN** the reader clicks it
- **THEN** the workspace holds `lens: tickets`, `priority: urgent` and an empty Show completed, and keys the widget does not name keep their value

#### Scenario: Delete a view
- **GIVEN** an own saved view
- **WHEN** the reader deletes it and confirms
- **THEN** it is deleted through the Views API and gone from the list
- **AND** a colleague's shared view offers no delete

### Requirement: A workspace view shows how many items it holds

With `showCounts`, the widget SHALL count each listed view through `content.workspace.countSource`, an endpoint source
whose `@workspace` tokens are filled with the view's values. An array answer MUST count its entries; a number, or an
object's `total`, MUST be used as it is. A view whose count fails MUST show its name only.

#### Scenario: Counted views
- **GIVEN** a view whose values make the endpoint answer three items
- **WHEN** the widget lists it
- **THEN** it reads "Urgent tickets (3)"
