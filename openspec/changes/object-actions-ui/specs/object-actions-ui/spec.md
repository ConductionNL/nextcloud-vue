# object-actions-ui Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-actions-ui](../../)
- openregister `object-actions-declared-and-run` (the API contract)

## ADDED Requirements

### Requirement: A host reads the actions of an object from OpenRegister

`useObjectActions({register, schema, id})` SHALL read `GET /api/objects/{register}/{schema}/{id}/actions` and offer
each listed action per surface (`header`, `row`, `bulk`, `detail-menu`), narrowed by an `include` list in its order.
Without an `id` it SHALL read `GET /api/object-actions/{register}/{schema}`. A 403 SHALL read as no actions; a 404 SHALL
mark the instance `unsupported`; any other failure SHALL mark the read `failed`.

#### Scenario: a handler's header

- **GIVEN** OpenRegister lists `claim` (unavailable, "Already claimed"), `publish` and `finish` (a transition)
- **WHEN** a host asks for the `header` surface
- **THEN** it gets all three, `claim` with `available: false` and its reason

### Requirement: A manifest runs a declared action

A manifest action `type: "object-action"` with `action: "<key>"` SHALL run that action on the page's object through
`POST /api/objects/{register}/{schema}/{id}/actions/{key}` with `{ inputs }`. Its label and icon SHALL default to the
listed ones. An entry whose action is not listed SHALL NOT render.

#### Scenario: publish from the header

- **GIVEN** a detail page header action `{ "id": "publish", "type": "object-action", "action": "publish" }`
- **WHEN** the person presses it and fills the inputs
- **THEN** the action is posted with those inputs and the page refreshes

### Requirement: actionsFrom renders the listed actions on a surface

An entry `{ "actionsFrom": "openregister", "include"?: [keys] }` in a page's header actions, row actions or bulk actions
SHALL expand into one `object-action` per action OpenRegister lists for that surface, in place, narrowed by `include`.

#### Scenario: a case's row menu

- **GIVEN** row actions `[{ "id": "or", "actionsFrom": "openregister" }]` and a case listing `claim` on `row`
- **WHEN** the person opens a row's menu
- **THEN** it shows `claim`

#### Scenario: bulk actions

- **GIVEN** bulk actions `[{ "id": "or", "actionsFrom": "openregister" }]` and `assign-to-me` offered on `bulk`
- **WHEN** the person selects three cases and runs it
- **THEN** `POST /api/object-actions/{register}/{schema}/assign-to-me` is sent with the three ids and the summary is shown

### Requirement: Inputs are asked in a dialog built from their JSON Schema

An action with `inputs` SHALL open `CnObjectActionDialog`, which draws the inputs with `CnTransitionInputFields` from the
JSON Schema: `title` as label, `required` as required, `enum` as a picker, `format: date` as a date field, `writeOnly` as
a password field. It SHALL show the confirm text and the description, keep confirm disabled until the required inputs
are filled, and on a 422 keep the dialog open with the refused inputs marked.

#### Scenario: a refused date

- **GIVEN** `publish` with a required input `from` (a date)
- **WHEN** the server answers 422 naming `from`
- **THEN** the dialog stays open with `from` marked and the typed value kept

### Requirement: An unavailable action is shown disabled with its reason

A listed action with `available: false` SHALL render disabled with its `reason` as title and description, on every
surface, and SHALL NOT be run. An action the person may not run SHALL NOT render, so no button answers 403 for a reason
known in advance.

#### Scenario: already claimed

- **GIVEN** `claim` listed with `available: false` and reason "Already claimed"
- **THEN** its button is disabled and says "Already claimed"

### Requirement: A run reports what happened

A sync run SHALL toast success and refresh the page. A 409 SHALL show the declared reason. A 403 or another refusal
SHALL show OpenRegister's message. `next: "next"` and `next: "list"` SHALL be honoured by the detail page.

#### Scenario: precondition refused

- **WHEN** the server answers 409 `action-precondition-unmet` with "Only a decided decision can be published."
- **THEN** the person reads that sentence

### Requirement: An async run shows its progress and its result

A 202 `queued` answer SHALL show that the action is running, follow `/api/flow-runs/{uuid}` until the run ends, then show
its result and refresh the page. A 202 `suspended` answer SHALL say the run waits and SHALL NOT claim completion.

#### Scenario: a long export

- **GIVEN** `export-dossier` with `mode: async`
- **WHEN** it runs
- **THEN** the dialog shows it running with the steps done so far, then "Done"

### Requirement: The last run reads both audit names

The object's action history SHALL be read from `GET .../{id}/actions/history`, or from the audit trail entries
`action.run` and `action.macro` on an instance without that route, newest first.

#### Scenario: an old macro entry

- **GIVEN** an object whose last entry is an `action.macro` entry
- **THEN** the macros widget's last-run line names it

### Requirement: The macros widget is a view over the same list

`CnMacrosWidget` SHALL show the listed actions of kind `flow` or `steps`, narrowed by `macrosFrom` as before, and run
them through the same path, inputs dialog included. On an instance without the actions route it SHALL read the
schema's declared macros as before.

#### Scenario: macrosFrom still narrows

- **GIVEN** a case type listing `suspend` in `macrosFrom` and OpenRegister listing `suspend` and `woo-finish`
- **THEN** the widget shows `suspend` only
