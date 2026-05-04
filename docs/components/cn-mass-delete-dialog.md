---
sidebar_position: 19
---

# CnMassDeleteDialog

Two-phase mass delete confirmation dialog. Shows list of items to delete, requires confirmation, and displays results.

**Wraps**: NcDialog, NcButton, NcNoteCard

![CnMassDeleteDialog showing confirmation with list of items to delete](/img/screenshots/cn-mass-delete-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Items to delete (`[\{ id, name \}]`) |
| `nameField` | String | `'title'` | Field to display as item name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names. Overrides `nameField` when provided. |
| `dialogTitle` | String | `'Delete items'` | |
| `warningText` | String | `''` | Warning text shown above the item list |
| `emptyText` | String | `'No items selected for deletion.'` | Message shown when all items have been removed from the list |
| `successText` | String | `'Items successfully deleted.'` | Message shown in the result phase on success |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Delete'` | |
| `removeLabel` | String | `'Remove from list'` | Tooltip/label for the per-item remove button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `ids[]` | Deletion confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, results? \})` | Set result per item |

## Usage

```vue
<CnMassDeleteDialog
  ref="massDeleteDialog"
  :items="selectedItems"
  @confirm="onMassDelete"
  @close="showMassDelete = false" />
```

### Custom name formatting

Use `nameFormatter` when items don't have a simple name field:

```vue
<CnMassDeleteDialog
  :items="selectedAuditTrails"
  :name-formatter="(item) => t('myapp', 'Audit Trail #{id}', { id: item.id })"
  @confirm="onMassDelete"
  @close="showMassDelete = false" />
```
