import GeneratedRef from './_generated/CnObjectList.md'

# CnObjectList

Vertical list container for [`CnObjectRow`](./cn-object-row.md) instances — the list-mode counterpart to [`CnCardGrid`](./cn-card-grid.md). Renders objects as compact rows with selection, loading/empty states, and full row override.

```vue
<CnObjectList
  :objects="secrets"
  :schema="secretSchema"
  :config="{ subtitleField: 'url', iconName: 'Key' }"
  @click="openSecret">
  <template #row-actions="{ object }">
    <NcButton @click="copy(object)">Copy</NcButton>
  </template>
</CnObjectList>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objects` | Array | `[]` | The objects to render as rows. |
| `schema` | Object | `null` | Schema passed through to each `CnObjectRow`. |
| `config` | Object | `{}` | Field-mapping config passed through to each row. |
| `loading` | Boolean | `false` | Show the loading state. |
| `selectable` | Boolean | `false` | Whether rows can be selected. |
| `selectedIds` | Array | `[]` | The currently selected object ids. |
| `rowKey` | String | `'id'` | Property used as the unique identifier. |
| `emptyText` | String | *(i18n)* | Text shown when there are no objects. |

## Slots

- `#list-item="{ object, selected }"` — fully replace the row (bypasses `CnObjectRow`).
- `#row-icon` / `#row-badges` / `#row-actions` — override just one part of the default row.
- `#empty` — custom empty state.

It is the surface behind `CnIndexPage`'s `view-mode="list"`.

<GeneratedRef />
