# manifest-detail-related-and-aggregates Specification

## MODIFIED Requirements

### Requirement: REQ-MDRA-6 — CnRelatedObjectsWidget SHALL self-fetch and render related content as a tabbed browser

`CnRelatedObjectsWidget` SHALL, by default, fetch related content directly from
OpenRegister's per-object endpoints — deriving `register`, `schema`, and `id`
from `objectData['@self']` (overridable by the `register` / `schema` props and
the `objectId` prop) — and render the results as a **tabbed** browser: a tab
strip with one tab per non-empty group, each tab rendering its items inline
beneath the tab strip. The default data calls SHALL be one aggregated request to
`.../relations` (leaf groups: notes, tasks, emails, events, contacts, deck),
plus `.../uses`, `.../used`, and `.../files`; `.../contracts` MAY also be
fetched. Each tab SHALL show a count badge reflecting that group's `total`. A
group with zero items SHALL NOT render a tab, and when no group has items the
widget SHALL render its existing empty-state. While the initial fetch is in
flight the widget SHALL render a loading placeholder rather than the empty-state,
and SHALL show the empty-state only once fetching has completed. Sub-resource
requests SHALL bypass the HTTP cache (e.g. `cache: 'no-store'`) so a stale empty
response is never shown on load. Each item's display label SHALL be resolved from
the record's common title fields (e.g. `title`, `displayName`, `summary`,
`subject`, `name`) so leaf records such as contacts render a human-readable label
rather than an internal id. All existing props, events, and slots SHALL be
preserved, and every new prop SHALL have a default so existing consumers are
unaffected.

When the legacy `layout` value is selected, or when a `store` exposing the
`fetch*` actions is supplied and self-fetch is opted out, the widget SHALL fall
back to the deprecated store-action path (`store.fetchUses` / `fetchUsed` /
`fetchContracts` / `fetchFiles`) and emit a one-time `console.warn` deprecation
notice; otherwise self-fetch is the default and requires no consumer-store
changes.

#### Scenario: tabbed self-fetch from @self with count badges

- GIVEN a `CnRelatedObjectsWidget` with `objectData={ '@self': { register: 'r', schema: 's', id: '00000000-0000-0000-0000-000000000000' } }` and no `store`
- WHEN it mounts
- THEN it requests `/apps/openregister/api/objects/r/s/00000000-0000-0000-0000-000000000000/relations`, plus `/uses`, `/used`, and `/files` for the same object
- AND it renders a tab strip with one tab per non-empty group
- AND each rendered tab shows a count badge equal to that group's `total`

#### Scenario: register/schema props override @self

- GIVEN a `CnRelatedObjectsWidget` with `register='override-r'`, `schema='override-s'`, `objectId='00000000-0000-0000-0000-000000000000'`, and `objectData` whose `@self` names a different register/schema
- WHEN it mounts
- THEN the endpoint URLs are built from `override-r` / `override-s` / `00000000-0000-0000-0000-000000000000`, not from `@self`

#### Scenario: empty groups render no tab and the empty-state shows

- GIVEN a `CnRelatedObjectsWidget` whose every group returns `total: 0`
- WHEN fetching completes
- THEN no tab is rendered
- AND the existing empty-state is shown

#### Scenario: a loading placeholder shows during the initial fetch (not the empty-state)

- GIVEN a `CnRelatedObjectsWidget` whose sub-resource requests have not yet resolved
- WHEN it is mounting and no group has items yet
- THEN it renders a loading placeholder
- AND it does NOT render the "nothing related" empty-state until fetching has completed

#### Scenario: a leaf record renders a human-readable label

- GIVEN a contacts group whose record carries `displayName: 'Jan Jansen'` and an internal numeric link id
- WHEN the contacts tab renders
- THEN the row label is `Jan Jansen`, not the internal id

### Requirement: REQ-MDRA-7 — clicking a related item SHALL deep-link to its owning Nextcloud app

`CnRelatedObjectsWidget` SHALL, when a related item is clicked in tabbed mode,
navigate to where that item lives in Nextcloud rather than relying on a host
sidebar. A **file** SHALL open via the canonical `/f/{fileid}` permalink; a
record carrying its own `url` / `link` / `accessUrl` SHALL open that; known leaf
types (e.g. contacts, deck) SHALL build their owning-app route from the record's
identifiers; a related **object** SHALL emit `select-object` so the host routes
to the object's own detail page. When no owning-app link can be resolved, the
widget SHALL emit `select-related` (`{ group, item }`) so the host can route it.
The widget SHALL NOT render an "open in sidebar" affordance; the `openInSidebarLabel`
prop is retained as a deprecated no-op for backward compatibility.

#### Scenario: a file row deep-links to its Nextcloud permalink

- GIVEN a rendered `CnRelatedObjectsWidget` with a Files tab whose record has fileid `4242`
- WHEN the file row is clicked
- THEN the widget opens `/f/4242` in a new tab

#### Scenario: an unresolvable leaf item falls back to a host event

- GIVEN a `mails` tab item with no `url` and no known owning-app route
- WHEN the item is clicked
- THEN no navigation URL is opened
- AND the widget emits `select-related` with `{ group: 'mails', item }`
