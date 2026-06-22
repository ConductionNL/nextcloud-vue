# cn-workspace-context-widgets Specification

## Purpose
TBD - created by archiving change cn-workspace-context-widgets. Update Purpose after archive.
## Requirements
### Requirement: Page-level workspace context

`CnDashboardPage` SHALL provide a reactive `cnWorkspaceContext` bag (a `ref({})`) to its widget
descendants so widgets on the same page can share state — one widget writes a key, sibling
widgets read it. The bag SHALL be provided unconditionally and start empty, so dashboards that
do not use it are unaffected.

#### Scenario: A widget writes and a sibling reads

- GIVEN a dashboard page with two widgets that both inject `cnWorkspaceContext`
- WHEN one widget writes a key into the bag (replacing the bag object)
- THEN the other widget's computed reads of that key MUST update reactively

#### Scenario: Inert when unused

- GIVEN a dashboard page whose widgets never read or write the workspace context
- WHEN the page renders
- THEN behaviour MUST be identical to a page without the context (no errors, no extra fetches)

### Requirement: `@workspace.*` filter tokens

`resolveFilterTokens` SHALL resolve a `@workspace.<key>` filter value against `ctx.workspace`.
A trailing `?` (`@workspace.<key>?`) SHALL mark the token OPTIONAL: when the key is unset the
token is left unresolved and callers drop the filter key (show all) via `dropOptionalUnresolved`.
A required (`?`-less) token left unresolved SHALL be reportable via `hasUnresolvedTokens` so a
bound widget can detect "the page state I depend on isn't set yet". Without `ctx.workspace`,
the tokens SHALL pass through unchanged.

#### Scenario: Required token resolves from workspace state

- GIVEN a filter `{ client: "@workspace.selectedClient" }` and `ctx.workspace.selectedClient = "42"`
- WHEN the filter is resolved
- THEN the resolved filter MUST be `{ client: "42" }`

#### Scenario: Optional token dropped when unset

- GIVEN a filter `{ queue: "@workspace.selectedQueue?" }` and no `selectedQueue` in the workspace
- WHEN the filter is resolved and `dropOptionalUnresolved` is applied
- THEN the `queue` key MUST be removed (the list shows all rows)

#### Scenario: Required token unresolved is detectable

- GIVEN a filter `{ client: "@workspace.selectedClient" }` and no `selectedClient` set
- WHEN the filter is resolved
- THEN `hasUnresolvedTokens` MUST return true (and `isOptionalUnresolved` MUST be false for the value)

### Requirement: CnObjectListWidget reacts to workspace context

`CnObjectListWidget` SHALL inject `cnWorkspaceContext` and resolve `@workspace.*` tokens in its
filter. When a REQUIRED token is still unresolved, the widget SHALL render a configurable
`content.prompt` and SHALL NOT fetch the register. When an OPTIONAL token is unset, the widget
SHALL drop that filter key and list normally. The widget SHALL refetch when the resolved filter
changes (i.e. when the workspace state a token reads changes).

#### Scenario: Prompt instead of fetching when a required token is unresolved

- GIVEN a widget with filter `{ client: "@workspace.selectedClient" }` and no client selected
- WHEN the widget renders
- THEN it MUST display `content.prompt` and MUST NOT issue a register fetch

#### Scenario: List reveals when the required token resolves

- GIVEN the prompt is showing
- WHEN `selectedClient` is written into the workspace context
- THEN the widget MUST fetch and display the rows filtered to that client

#### Scenario: Optional token unset lists everything

- GIVEN a widget with filter `{ queue: "@workspace.selectedQueue?" }` and no queue selected
- WHEN the widget renders
- THEN it MUST fetch the list with the `queue` key dropped (all rows), not a prompt

### Requirement: CnResourceSelect creates from the search term

`CnResourceSelect` SHALL search an OpenRegister `register`+`schema` for objects matching the
typed term and render them as options. When `allowCreate` is set (default) and the term is at
least `minChars` and matches no existing option label exactly, the component SHALL offer a
synthetic "Create '<term>'" option that, when chosen, persists a new object (writing the term
to `labelField`, merging `createDefaults`) and selects it. It SHALL emit `update:modelValue`
with the selected/created object id and `create` with the created object. A pre-set
`modelValue` SHALL be label-resolved.

#### Scenario: Create a new object from the typed term

- GIVEN the agent types a name that matches no existing object
- WHEN the agent picks the "Create '<name>'" option
- THEN the component MUST save a new object with that name and emit `update:modelValue` with its id and `create` with the object

#### Scenario: Select an existing object

- GIVEN the search returns matching objects
- WHEN the agent picks one
- THEN the component MUST emit `update:modelValue` with that object's id (and MUST NOT create)

### Requirement: interaction-form dashboard widget

The library SHALL register an `interaction-form` dashboard widget kind (`CnInteractionFormWidget`)
that persists a contactmoment to OpenRegister via `useObjectStore` and, as a workspace widget,
writes `selectedClient` (the chosen/created client id) and `activeSummary` (the live summary
text) into the page workspace context. Its client picker SHALL be `CnResourceSelect`. All
schema/field/enum choices SHALL come from `content` so the widget carries no app-specific
vocabulary.

#### Scenario: Registering a contactmoment writes the client to the workspace

- GIVEN the agent selects (or creates) a client in the interaction widget
- WHEN the selection is made
- THEN the widget MUST write `selectedClient` into the workspace context
- AND clicking Register MUST persist a contactmoment with the configured fields

#### Scenario: Typing the summary streams it to the workspace

- GIVEN the agent types in the summary field
- WHEN the value changes
- THEN the widget MUST write the text into the workspace context's `activeSummary`

### Requirement: kb-search dashboard widget

The library SHALL register a `kb-search` dashboard widget kind (`CnKbSearchWidget`) that
searches a configurable HTTP endpoint and renders the returned articles. The query SHALL be
driven both by manual typing (debounced) and by a workspace key (`content.bindTo`, default
`activeSummary`) another widget writes; manual input SHALL override the bound text until
cleared. The widget SHALL degrade gracefully: an empty body, a 503, or a network error SHALL
render an empty/unavailable state and SHALL NOT throw.

#### Scenario: The bound summary drives the search

- GIVEN the workspace `activeSummary` changes to a long-enough string and the agent has not typed manually
- WHEN the change propagates
- THEN the widget MUST query the configured endpoint with that text (debounced) and render the results

#### Scenario: Unavailable backend degrades gracefully

- GIVEN the endpoint returns a 503 or a network error
- WHEN a search runs
- THEN the widget MUST render the unavailable state and MUST NOT throw or log an error that breaks the page

