---
sidebar_position: 21
---

# CnMetadataTab

Read-only metadata display table. By default shows ID, Created, and Updated extracted from `item['@self']` (with fallback to `item.id`). Use `extraRows` to surface additional domain-specific metadata, or `replaceRows` to provide your own complete list.

Used internally by [`CnAdvancedFormDialog`](cn-advanced-form-dialog.md), and exposed as a top-level component for consumers that want the same metadata table inside their own dialog/page chrome.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | `null` | Object whose `@self` block (or top-level `id`) drives the default rows. |
| `formData` | Object | `{}` | Reserved for future use; included for parity with other `CnAdvancedFormDialog` tabs. |
| `extraRows` | Array | `[]` | Additional `[label, value]` rows appended after the defaults. Strings are rendered verbatim — pre-format dates / objects on the parent side. |
| `replaceRows` | Boolean | `false` | When `true`, the default ID/Created/Updated rows are skipped and only `extraRows` is rendered. |

---

## Events

None.

---

## Slots

None. If you need a fully custom layout, use `replaceRows` together with a tailored `extraRows` array, or fall back to writing the markup yourself.

---

## Usage

### Default (ID / Created / Updated)

```vue
<CnMetadataTab :item="item" />
```

### Append domain-specific rows

```vue
<CnMetadataTab
  :item="item"
  :extra-rows="[
    ['Version', item['@self']?.version ?? '—'],
    ['Register', registerName],
    ['Schema', schemaName],
    ['Published', item['@self']?.published ? new Date(item['@self'].published).toLocaleString() : 'Not published'],
  ]" />
```

### Replace defaults entirely

```vue
<CnMetadataTab
  :item="item"
  :replace-rows="true"
  :extra-rows="myCustomRows" />
```
