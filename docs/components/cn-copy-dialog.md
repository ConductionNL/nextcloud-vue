---
sidebar_position: 17
---

# CnCopyDialog

Two-phase single-item copy dialog with naming pattern selector. User picks a naming pattern, confirms, then sees success or error.

**Wraps**: NcDialog, NcButton, NcNoteCard, NcSelect

![CnCopyDialog showing naming pattern selection for copying an item](/img/screenshots/cn-copy-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | *(required)* | Item to copy |
| `nameField` | String | `'title'` | Field used as display name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format the display name. Overrides `nameField` when provided. |
| `dialogTitle` | String | `'Copy Item'` | |
| `patternLabel` | String | `'Naming pattern'` | |
| `successText` | String | `'Item successfully copied.'` | |
| `cancelLabel` | String | | |
| `closeLabel` | String | | |
| `confirmLabel` | String | | |

## Naming Patterns

| Pattern | Example |
|---------|---------|
| `copy-of` | Copy of Contact A |
| `name-copy` | Contact A - Copy |
| `name-parens` | Contact A (Copy) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ id, newName \}` | Copy confirmed |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error? \})` | Set operation result |
