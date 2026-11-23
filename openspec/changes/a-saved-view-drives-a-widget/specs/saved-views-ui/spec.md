## ADDED Requirements

### Requirement: a saved view drives a dashboard widget

The widget catalogue SHALL carry a `saved-view` type whose configuration is
one saved view id and a row limit.

The widget SHALL read the register, the schema, the filter, the order and
the columns from the view at render time. It SHALL NOT copy any of them into
its own configuration or into a stored layout, because a copy stops
answering the reader's question the first time they edit the view and
nothing on the card says so.

#### Scenario: the widget lists what the view selects

- GIVEN a saved view over cases assigned to the reader's district
- WHEN the reader adds a `saved-view` widget bound to it
- THEN the card lists the cases that view selects

#### Scenario: the widget follows an edited view

- GIVEN a dashboard carrying a `saved-view` widget
- WHEN the reader edits that view on the index page and reloads the
  dashboard
- THEN the card shows the edited view's rows

---

### Requirement: a saved-view widget is the one data widget a user may add

The `saved-view` type SHALL declare `userAddable: true`, so
`listUserAddableWidgetTypes()` offers it.

Every other data widget asks for a register and a schema, which a user does
not have in front of them, so offering one offers a widget they cannot
finish and the failure arrives as a blank card rather than a refusal. A
saved view carries both, which is what makes this type safe to offer.

#### Scenario: a reader adds a widget without naming a register

- GIVEN a reader on a dashboard with `userLayout` enabled
- WHEN they open the add-widget modal
- THEN `saved-view` is offered
- AND choosing a view finishes the configuration with no register or schema
  asked for

#### Scenario: a reader with no views sees an empty state

- GIVEN a reader who has saved no views and can see no public ones
- WHEN they open the `saved-view` configuration
- THEN an empty state names that there are no views yet
- AND no blank select is rendered

---

### Requirement: a view that cannot be read is refused, not emptied

When the view a widget names cannot be read, whether it was deleted or its
scope was narrowed, the widget SHALL render a refusal naming the view.

An empty card and a view that went away look identical, and only one of them
is somebody's problem.

#### Scenario: a deleted view is named

- GIVEN a dashboard widget bound to a view that has since been deleted
- WHEN the dashboard renders
- THEN the card names the missing view
- AND does not render the empty-result state

#### Scenario: an empty result is still an empty result

- GIVEN a readable view that currently selects no rows
- WHEN the dashboard renders
- THEN the card renders the empty-result state and not a refusal
