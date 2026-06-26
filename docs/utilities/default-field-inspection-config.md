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

The config feeds the generic [offline data-collection core](./offline-collection.md):
`assigneeField` + `dateField` build the daily-planning query against the standard
OpenRegister object API, and the schema keys drive where cached objects and
queued mutations are stored / replayed.
