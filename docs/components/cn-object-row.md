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

The `config` object accepts (all optional): `titleField`, `subtitleField`, `imageField`, `iconField`, `iconName`, `badgeField`, `badgeVariantField`, `badgeVariant`, `badgeColorMap`.

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
