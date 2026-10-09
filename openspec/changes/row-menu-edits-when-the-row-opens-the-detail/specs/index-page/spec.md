# Index page: the row menu edits when the row opens the detail

## ADDED Requirements

### Requirement: The row menu offers Edit, not View, when the row opens the detail page

When a click on a row of `CnIndexPage` navigates to that record's detail page
(`rowClickOpens` is true and `viewTo`, when set, returns a location for the
row), the row's action menu MUST NOT contain the built-in View action. The
built-in Edit action, labelled "Edit" (Dutch "Bewerken") with the pencil icon,
MUST remain when its toggle is on and the row's availability allows it. The
same list MUST apply to the right-click context menu. A row that has no detail
page (`rowClickOpens` false, or `viewTo` returns null for it) MUST keep View.
An action the page declares itself MUST NOT be removed by this rule. The rule
MUST apply in every look.

#### Scenario: A row that opens the detail page

- **GIVEN** a page with `rowClickToView` on and a `row-click` listener, and the default built-in actions
- **WHEN** the row menu renders
- **THEN** it MUST contain Edit with the pencil icon and MUST NOT contain View

#### Scenario: A row without a detail page

- **GIVEN** a page with no row-click listener, or a `viewTo` that returns null for the row
- **WHEN** the row menu renders
- **THEN** it MUST contain View

#### Scenario: An action the page declared

- **GIVEN** a page that declares its own action "Open case" and whose rows open the detail page
- **WHEN** the row menu renders
- **THEN** "Open case" MUST still render and the built-in View MUST NOT

#### Scenario: The board look

- **GIVEN** the same page under `look: "board"`
- **WHEN** the row menu renders
- **THEN** it MUST offer the same actions as without the look

@e2e exclude Covered by unit tests over the real CnIndexPage; the rule has no layout.
