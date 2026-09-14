# saved-views-ui Delta: saved-view-as-a-place

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [saved-view-as-a-place](../../)

## Purpose

A saved view becomes a place: its own route, the presentations it
declares, and an entry in the navigation when it is pinned. Competitor gap
register row Q9.16; consumed by dossiq's `cases-views-are-places`.

## ADDED Requirements

### Requirement: A page may declare that its saved views are places

An index page SHALL accept `savedViewPlaces` with `enabled`, `routeBase`
and an optional `navGroup`. The key SHALL be refused on a page that is not
an index. A page without the key SHALL behave exactly as it does today:
the dropdown, the route query, save and delete, and no view route,
presentation choice or navigation entry.

#### Scenario: A page declares places

- **GIVEN** an index page with `allowSavedViews: true` and `savedViewPlaces: {"enabled": true, "routeBase": "views"}`
- **WHEN** the manifest is validated and the app boots
- **THEN** the page offers view routes and the dropdown gains a Pin action

#### Scenario: The key is refused on a detail page

- **GIVEN** a detail page carrying `savedViewPlaces`
- **WHEN** the manifest is validated
- **THEN** validation fails and the message names the page and the key

#### Scenario: A page without the key is unchanged

- **GIVEN** an index page with `allowSavedViews: true` and no `savedViewPlaces`
- **WHEN** a user opens the views dropdown and applies a view
- **THEN** the behaviour is the same as before this change, and no view route exists

@e2e exclude schema and validator change, unit-tested via jest, no browser surface.

### Requirement: A saved view has a route of its own

On a page that declares places, each saved view SHALL be reachable at
`/<page>/<routeBase>/:viewId`, rendering the index page with that view's
query, columns and presentation. The route SHALL survive a reload and a
direct open. The existing `?view=<id>` query form SHALL redirect to the
view route so links already sent keep working and one canonical URL
remains. A route naming a view that no longer exists, or that the user may
not read, SHALL render the page's empty state naming the view and offering
the page it came from.

#### Scenario: A view opens from its own URL

- **GIVEN** a saved view "Overdue" on a page that declares places
- **WHEN** a user opens `/cases/views/<id>` directly in a new tab
- **THEN** the page renders the list that view describes

#### Scenario: The view survives navigating away and back

- **GIVEN** a user on a view route
- **WHEN** they open another page and press back
- **THEN** they return to the view, not to the page's default list

#### Scenario: An old query link still works

- **GIVEN** a link to `/cases?view=<id>` sent before this change
- **WHEN** it is opened on a page that declares places
- **THEN** the browser ends on `/cases/views/<id>` showing the same list

#### Scenario: A deleted view says so

- **GIVEN** a bookmarked view route whose view has since been deleted
- **WHEN** the route is opened
- **THEN** the empty state names the view and links to the page it came from

### Requirement: A view offers the presentations it declares

The view page SHALL offer the presentations in the view's own presentation
config, SHALL open the one the view marks first, and SHALL keep the view
route in the address bar when the presentation changes. A presentation the
host has not registered SHALL fall through to the next one the view
declares, with one warning, rather than failing the page.

#### Scenario: One view, three presentations

- **GIVEN** a view declaring table, board and calendar, with board first
- **WHEN** a user opens its route
- **THEN** the board renders and table and calendar are offered

#### Scenario: The link is to the view, not to the presentation

- **GIVEN** a user on a view route who switches from board to table
- **WHEN** they copy the address
- **THEN** the address is the view route

#### Scenario: An unregistered presentation does not break the page

- **GIVEN** a view declaring timeline first on a host that has not registered a timeline
- **WHEN** the route is opened
- **THEN** the next declared presentation renders and one warning is logged

### Requirement: A pinned view takes a place in the navigation

A pinned view SHALL render as a child of its page's navigation entry, or
of the entry named by `navGroup`, and SHALL never create a top-level
entry. Pinned children SHALL count towards the app's navigation budget,
and past the configured cap the remaining pinned views SHALL stay
reachable from the page rather than being rendered. Pinning SHALL write
the view's existing favourite flag.

#### Scenario: A pinned view appears under its page

- **GIVEN** a saved view on a page that declares places
- **WHEN** the user pins it
- **THEN** it appears in the navigation as a child of that page's entry
- **AND** no new top-level entry is created

#### Scenario: Unpinning removes the entry and keeps the view

- **GIVEN** a pinned view
- **WHEN** the user unpins it
- **THEN** the navigation entry is gone and the view is still in the dropdown and at its route

#### Scenario: Past the cap, the rest stay reachable

- **GIVEN** a navigation cap of five children and eight pinned views
- **WHEN** the navigation renders
- **THEN** five are rendered and the page itself lists all eight
