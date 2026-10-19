import GeneratedRef from './_generated/CnObjectRow.md'

# CnObjectRow

The list-mode counterpart to [`CnObjectCard`](./cn-object-card.md): a compact single-line row with a leading icon (or image), a name with an optional subtitle, an optional status badge, and a trailing actions area.

Which object fields map to each part is resolved from the `config` prop first, then from `schema.configuration` (so a schema that already declares `objectNameField` / `objectDescriptionField` / `objectImageField` works with no extra config).

```vue
<CnObjectRow
  :object="secret"
  :schema="secretSchema"
  :config="{ subtitleField: 'url', iconName: 'Key' }">
  <template #actions="{ object }">
    <NcButton @click="copy(object)">Copy</NcButton>
  </template>
</CnObjectRow>
```

## Config

The `config` object accepts (all optional): `titleField`, `subtitleField`, `imageField`, `iconField`, `iconName`, `badgeField`, `badgeVariantField`, `badgeVariant`, `badgeColorMap`, `subtitleTemplate`, `leading`, `trailing`. The image field's value is resolved through [`resolveImageUrl`](../utilities/resolve-image-url.md), so an `app:<app>/<file>` reference or an `/apps/…` route renders.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `object` | Object | *(required)* | The object data. |
| `schema` | Object | `null` | Schema whose `configuration` block supplies field defaults. |
| `config` | Object | `{}` | Explicit field mapping (overrides schema configuration). |
| `selected` | Boolean | `false` | Whether the row is selected. |
| `selectable` | Boolean | `false` | Whether to show the selection checkbox. |

## Slots

- `#icon` — replace the leading icon/image.
- `#badges` — replace the badge area (overrides the config-driven badge).
- `#actions` — trailing actions (copy button, menu, …).

<GeneratedRef />

## Leading and trailing cells

A list row can carry cells the way a table column renders them, so a list such as the team queue (DqTeamwachtrij) reads as headerless rows instead of a table. `leading` is one cell before the title, `trailing` a cell or a list of cells after the badge, each `{ key, widget?, widgetProps?, formatter?, width? }` with `key` a dot-path on the row and the rest as on a [CnDataTable](./cn-data-table.md) column. `width` (CSS) lines a column up across rows. `subtitleTemplate` fills `{field}` tokens from the row for the meta line, and a field without a value takes its separator with it.

```json
"listConfig": {
  "titleField": "title",
  "subtitleTemplate": "{identifier} · {requester} · {statusLabel} · prioriteit {priority}",
  "leading": { "key": "createdAt", "widget": "age", "width": "80px", "widgetProps": { "variantWhen": [{ "op": "gte", "value": 3, "variant": "error" }] } },
  "trailing": [
    { "key": "caseTypeName", "widget": "badge", "width": "180px" },
    { "key": "deadline", "widget": "date", "width": "110px", "widgetProps": { "due": {} } }
  ]
}
```

On an index page this is `config.listConfig` with the `list` view mode (`viewMode: "list"`); the row actions still end the row.
