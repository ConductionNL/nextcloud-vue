# offline-field-capture Delta: offline-checklist-reads-sections-and-replays-to-an-endpoint

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The checklist template is read through the leaf's config

The leaf SHALL read a cached checklist template into its flat item list
through `normaliseChecklistTemplate`, using `offlineConfig`. When
`sectionsField` is set, the items SHALL be read from each section's
`items[]` in order. The item key, text and type SHALL be read from
`itemKeyField`, `itemTextField` and `itemTypeField`, and the type SHALL be
translated through `itemTypeMap`. An item without a key SHALL be skipped.
An item whose `photoRequiredField` holds `photoRequiredValue` SHALL need at
least one photo before the run can be saved, whether or not it is required.
With none of these keys set, a flat template SHALL read as it did before.

#### Scenario: A sectioned template opens offline

- **GIVEN** a template with two sections, items keyed by `id`, labelled by `label` and typed `yes_no_na`, and a config naming those fields and mapping `yes_no_na` to `yes_no`
- **WHEN** the inspector opens a planned item that references it
- **THEN** the checklist lists every item of both sections in order, as yes/no questions under their labels

#### Scenario: A photo gate on an optional item

- **GIVEN** an optional item whose `photoRequired` is `altijd`, with the config's photo gate set to that field and value
- **WHEN** the inspector saves without a photo for it
- **THEN** the save is refused with "Photo required for this question" on that item and nothing is queued

@e2e exclude the normaliser and gate are pure functions and card methods over an injected Dexie; covered by the offline unit suite.

### Requirement: A finished run can replay to an app's own endpoint

When `offlineConfig.resultEndpoint` is set, the leaf SHALL queue a finished
run as one `submit` operation naming that endpoint, with every `{field}`
placeholder filled, URL-encoded, from the planned item. On replay the leaf
SHALL POST the run to that path under the Nextcloud root and SHALL NOT
write to the object API. The body SHALL name the template and the planned
item under `resultTemplateParam` and `resultPlannedItemParam`, and carry
`capturedAt`, `capturedOffline`, `location` when a GPS fix exists, and one
entry per answered item with `itemId`, `value`, `photos`, `answeredAt` and
`gpsAtAnswer`. A placeholder the planned item does not fill SHALL stop the
save with a message and queue nothing. With `resultEndpoint` empty, the
leaf SHALL queue the object create on `resultSchema` as before.

#### Scenario: A run captured in a cellar reaches the app's endpoint

- **GIVEN** a config with `resultEndpoint` `/apps/myapp/api/cases/{caseRef}/checklist-run` and a planned item whose `caseRef` is `case-77`
- **WHEN** the inspector saves the checklist offline and the device reconnects
- **THEN** one POST goes to `/apps/myapp/api/cases/case-77/checklist-run` with the template id, the planned item id, `capturedOffline: true` and the answered items, and the queue row is synced

#### Scenario: A planned item with nowhere to send

- **GIVEN** a config whose endpoint names `{caseRef}` and a planned item without one
- **WHEN** the inspector saves the checklist
- **THEN** the save says the planned item has no caseRef and nothing is queued

@e2e exclude the submission builder and replay are covered by the offline unit suite against fake IndexedDB and a mocked axios.
