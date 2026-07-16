# CnObjectMetadataModal

Read-only object metadata (`@self` / system fields: id, uuid, uri, register, schema, created, updated, owner, …) in a small `NcDialog`. A thin wrapper around [`CnObjectMetadataWidget`](./cn-object-metadata-widget.md) with the card header suppressed, since the dialog supplies the title.

Surfaced on demand — e.g. from the **Metadata** item in [`CnObjectDataWidget`](./cn-object-data-widget.md)'s overflow Actions menu — instead of taking up permanent space on the detail page.

## Usage

```vue
<!-- v-if mount + @close -->
<CnObjectMetadataModal
  v-if="metadataOpen"
  :object-data="object"
  @close="metadataOpen = false" />

<!-- or :open binding -->
<CnObjectMetadataModal
  :open="metadataOpen"
  :object-data="object"
  @update:open="metadataOpen = $event" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `Boolean` | `true` | Whether the dialog is open |
| `name` | `String` | `'Metadata'` | Dialog title |
| `object-data` | `Object` | *required* | The object whose metadata to display. Supports flat objects and objects carrying a `@self` metadata block. |
| `include` | `Array` | `null` | Metadata fields to include (whitelist). When `null`, all available fields are shown. |
| `exclude` | `Array` | `[]` | Metadata fields to exclude |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `@update:open` | `Boolean` | The dialog open state changed |
| `@close` | — | The dialog was dismissed (convenience for `v-if`-mounted hosts) |
