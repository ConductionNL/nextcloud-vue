# CnFollowingWidgetHost

Hosts a widget on the row another list on the same detail page has selected, instead of on the page's own record. CnDetailPage uses it for a side-column widget that declares `follows`.

```json
{ "id": "side-choice-list", "type": "field-list", "title": "Choice list: {name}", "follows": { "widget": "case-type-fields-editor", "register": "dossiq", "schema": "propertyDefinition", "when": { "field": "enumValues", "op": "notEmpty" } }, "content": { "field": "enumValues" } }
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `widget` | `Object` | required | The widget definition, with `follows: { widget, register?, schema?, when? }`. |
| `register` | `String \| Object` | `''` | The page's register, used when `follows` names none. |
| `schema` | `String \| Object` | `''` | The page's schema, used when `follows` names none. |

Every other prop passes through to [CnDetailWidgetHost](./cn-detail-widget-host.md), with these changes:

- `object` and `objectId` are the followed row's;
- `register` and `schema` are taken from `follows`;
- the title's `{field}` placeholders are filled from the row, after the title is translated.

The card draws nothing while there is no row to follow. See [CnDetailPage: a side card that follows a selected row](./cn-detail-page.md#a-side-card-that-follows-a-selected-row-follows).
