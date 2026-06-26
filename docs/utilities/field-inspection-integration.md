# fieldInspectionIntegration

The built-in **`field-inspection`** integration-registry descriptor — an offline
field data-collection leaf. It surfaces the generic
[offline data-collection core](./offline-collection.md) as a registry leaf with
a sidebar tab (`CnFieldInspectionTab`) and a surface-aware widget
(`CnFieldInspectionCard`).

```js
import { fieldInspectionIntegration } from '@conduction/nextcloud-vue'
```

It is registered automatically by `registerBuiltinIntegrations()` (so it appears
on `window.OCA.OpenRegister.integrations`), and rendered by `CnObjectSidebar`,
`CnDashboardPage` and `CnDetailPage` like every other leaf.

## Descriptor

| Field           | Value                                            |
|-----------------|--------------------------------------------------|
| `id`            | `field-inspection`                               |
| `referenceType` | `field-inspection`                               |
| `icon`          | `ClipboardCheckOutline`                          |
| `group`         | `workflow`                                        |
| `tab`           | `CnFieldInspectionTab`                            |
| `widget`        | `CnFieldInspectionCard`                           |
| `offlineConfig` | [`DEFAULT_FIELD_INSPECTION_CONFIG`](./default-field-inspection-config.md) |

## Plugging in a consuming app's checklist schema

The checklist fields and the "today's planned items" query are **not** hardcoded:
they come from the integration's `offlineConfig`. A consuming app registers the
same `field-inspection` id first with its own `offlineConfig` (AD-13 first-wins
collision policy keeps the consumer's config), or relies on the per-object
`integrationContext` for register/schema.

```js
OCA.OpenRegister.integrations.register({
    ...fieldInspectionIntegration,
    offlineConfig: {
        plannedSchema: 'fieldInspection',       // schema of the planned items
        referenceSchema: 'inspectionChecklist', // schema of the checklist templates
        templateRefField: 'checklistTemplateRef',
        resultSchema: 'checklistResult',        // schema the completed result is written to
        assigneeField: 'inspectorRef',          // planning filter: assignee property
        dateField: 'scheduledAt',               // planning filter: scheduled-date property
        titleField: 'caseRef',                  // planned-item display title
    },
})
```

See [`offlineCollection`](./offline-collection.md) for the underlying offline
infrastructure and the daily-planning fetch contract.
