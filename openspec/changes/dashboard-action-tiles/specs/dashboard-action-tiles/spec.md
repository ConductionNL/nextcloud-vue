# dashboard-action-tiles Delta

## ADDED Requirements

### Requirement: A dashboard can draw a row of action tiles

A dashboard widget of type `action-tiles` SHALL draw each entry of `content.tiles` as a tile with its icon and its
translated label, side by side in one row. A click on a tile SHALL dispatch the tile's `action` with its tokens resolved
from the page's workspace and record context, through the page's dispatcher when there is one. A tile whose action holds
a required token that cannot be resolved SHALL be drawn disabled and SHALL NOT dispatch. A tile whose `visibleWhen`
workspace condition does not hold SHALL NOT be drawn. A tile without a label or without an action SHALL NOT be drawn.

#### Scenario: Board PqWerkplekKlant in a call

- **WHEN** a call page declares a tile "Terugbellen" with an `open-form` action whose props carry
  `clientId: "@workspace.selectedClient"`, and the client in the call is in the workspace
- **THEN** the row draws the tile with its icon and label
- **AND** a click opens the form with the client's id filled in

#### Scenario: No client in focus

- **WHEN** the workspace holds no `selectedClient`
- **THEN** the tile is drawn disabled and a click opens nothing
