## ADDED Requirements

### Requirement: A `run-node` action invokes one flow node against the page object

The manifest action `type` enum SHALL gain `run-node`, distinct from the
setup-wizard step type of a similar name (`run-action`, an unrelated `$defs`
enum for setup steps). A `run-node` action SHALL declare `flowId`, `nodeId`,
and a token-resolved `subject` (typically `@objectId`).

#### Scenario: Dispatching `run-node` requires `context.openRunNode`

- **GIVEN** a `run-node` action and no `context.openRunNode` function
- **WHEN** `dispatchAction` is called
- **THEN** it warns and does not throw, matching `open-form`'s own
  missing-context handling

#### Scenario: `run-node` does not collide with the setup-wizard's `run-action`

- **GIVEN** the manifest schema's two separate `type` enums (header/row
  actions; setup-wizard steps)
- **WHEN** both are validated
- **THEN** `run-node` exists only in the actions enum and `run-action` only
  in the setup-step enum, and neither schema rejects the other's document

### Requirement: The node's own config form drives the dialog, not a new token

A `run-node` action SHALL NOT introduce a sentinel token for picking a
config value. The rendering surface SHALL resolve the target node's
declared config form (OpenRegister's `IFlowNodeConfigForm`, when present)
and render it generically; a node with no fields (or none declared) SHALL
run without a dialog.

#### Scenario: A node with a declared select field opens a picker

- **GIVEN** a `run-node` action targeting a node type that declares a
  `select` field with `optionsFrom`
- **WHEN** the action is dispatched
- **THEN** a dialog opens sourcing that field's options from `optionsFrom`,
  and no `@pick:`-shaped token appears anywhere in the manifest

#### Scenario: A node with an empty config form runs without a dialog

- **GIVEN** a `run-node` action targeting a node type whose `configForm()` is
  empty
- **WHEN** the action is dispatched
- **THEN** the node runs immediately, with no dialog shown

@e2e exclude covered by dossiq's `case-documents` e2e suite once
`documents-on-the-case` 3.3 is implemented against this action type.
