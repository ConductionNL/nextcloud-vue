# DEFAULT_FIELD_INSPECTION_CONFIG

The default `offlineConfig` for the built-in
[`field-inspection`](./field-inspection-integration.md) integration leaf. A
consuming app overrides any of these keys by registering the `field-inspection`
id with its own `offlineConfig` before `registerBuiltinIntegrations()` runs
(AD-13 first-wins collision policy keeps the consumer's config).

```js
import { DEFAULT_FIELD_INSPECTION_CONFIG } from '@conduction/nextcloud-vue'
```

## Keys

| Key                | Default                | Purpose                                                        |
|--------------------|------------------------|----------------------------------------------------------------|
| `plannedSchema`    | `fieldInspection`      | Schema holding the planned items (today's work).               |
| `referenceSchema`  | `inspectionChecklist`  | Schema holding the checklist templates the items reference.    |
| `templateRefField` | `checklistTemplateRef` | Property on a planned item referencing its checklist template. |
| `resultSchema`     | `checklistResult`      | Schema the completed checklist result is written back to.      |
| `assigneeField`    | `inspectorRef`         | Planning filter: property holding the assignee.                |
| `dateField`        | `scheduledAt`          | Planning filter: property holding the scheduled date.          |
| `titleField`       | `caseRef`              | Property used as a planned item's display title.               |
| `sectionsField`    | `''`                   | Template property holding ordered sections, each with `items[]`. Empty reads a flat `items[]`. |
| `itemKeyField`     | `questionId`           | Item property an answer names.                                 |
| `itemTextField`    | `text`                 | Item property shown as the question.                           |
| `itemTypeField`    | `type`                 | Item property holding the item's type.                         |
| `itemTypeMap`      | `{}`                   | The app's type words onto the leaf's (`yes_no`, `photo_required`). Any other word renders as free text. |
| `photoRequiredField` / `photoRequiredValue` | `''` | An item whose field holds this value needs a photo as well as an answer. |
| `resultEndpoint`   | `''`                   | Empty queues an object create on `resultSchema`. Set, a path under the Nextcloud root with `{field}` placeholders from the planned item; the run replays as one POST there. |
| `resultTemplateParam` | `templateId`        | Key naming the template in an endpoint submit.                 |
| `resultPlannedItemParam` | `plannedItem`    | Key naming the planned item in an endpoint submit.             |

The config feeds the generic [offline data-collection core](./offline-collection.md):
`assigneeField` + `dateField` build the daily-planning query against the standard
OpenRegister object API, and the schema keys drive where cached objects and
queued mutations are stored / replayed.

## A run the app stores itself

Set `resultEndpoint` when the app checks a run before storing it, or stores it
as something other than a plain object, such as a completed task. The leaf then
queues one `submit` per finished run and replays it as a single POST:

```js
offlineConfig: {
	referenceSchema: 'inspectionChecklistTemplate',
	sectionsField: 'sections',
	itemKeyField: 'id',
	itemTextField: 'label',
	itemTypeField: 'responseType',
	itemTypeMap: { yes_no_na: 'yes_no' },
	resultEndpoint: '/apps/myapp/api/cases/{caseRef}/checklist-run',
	resultTemplateParam: 'checklistId',
}
```

The body carries the template id and planned item id under the configured keys,
`capturedAt`, `capturedOffline`, `location` when there was a GPS fix, and
`items[]` with `itemId`, `value`, `photos`, `answeredAt` and `gpsAtAnswer`. Items
left open are not sent. A placeholder the planned item does not fill stops the
save with a message, so a run never goes to the wrong record.
