# CnBlockListEditor

An ordered list of typed blocks a user builds: a palette adds a block of a type, the list reorders by drag, by the arrow keys on a block's handle and by move up and down buttons, and the picked block's properties are edited in a panel of fields its type declares. A mail built from blocks is the first user; page and lesson builders are the same shape.

Every add, move and remove is announced in a polite live region, so dragging is never the only way to reorder (WCAG 2.5.7).

## Usage

```vue
<CnBlockListEditor
  v-model="blocks"
  :types="types"
  pinned-last="footer"
  :create-block="newBlock" />
```

```js
const types = [
  { type: 'heading', label: t('myapp', 'Heading'), fields: [
    { key: 'text', label: t('myapp', 'Heading text') },
    { key: 'level', label: t('myapp', 'Size'), type: 'select', default: 2, options: [{ value: 1, label: t('myapp', 'Large') }, { value: 2, label: t('myapp', 'Medium') }] },
  ] },
  { type: 'image', label: t('myapp', 'Image'), fields: [
    { key: 'src', label: t('myapp', 'Image address (https://)'), type: 'url' },
    { key: 'alt', label: t('myapp', 'Alternative text'), required: true, requiredHint: t('myapp', 'Describe the image for people who cannot see it.') },
  ] },
  { type: 'footer', label: t('myapp', 'Footer'), addable: false, fields: [
    { key: 'text', label: t('myapp', 'Footer text'), type: 'textarea', fixedTokens: [
      { token: '{{address}}', label: t('myapp', 'Your physical address') },
      { token: '{{unsubscribe}}', label: t('myapp', 'The unsubscribe link') },
    ] },
  ] },
]
```

## Blocks and types

A block is `{ id, type, props }`. A type is `{ type, label, fields?, addable?, summary?, hint? }`:

- `fields`: the panel's fields, in order. A field is `{ key, label, type?, default?, required?, requiredHint?, helperText?, options?, min?, max?, rows?, fixedTokens?, fixedTokensHint? }`. `type` is `text` (default), `url`, `number`, `textarea`, `markdown`, `select` (with `options: [{ value, label }]`) or `color`.
- `addable: false` leaves the type out of the palette (a footer the app puts in itself).
- `summary`: the props whose first non-empty value the list shows beside the label; by default the fields in order.
- `hint`: a line under the type's fields ("The articles picked below appear here.").

A textarea field with `fixedTokens` always ends with those tokens: the user edits the text before them, sees them as chips, and the stored text is the user's text followed by the tokens, one per line.

## Keyboard

- The handle of a block moves it one place with the up and down arrow keys, and keeps focus on the handle.
- The move up and down buttons do the same; at an end the focus moves to the other button.
- Nothing moves after the `pinnedLast` block, and the pinned block has no handle, move or remove.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `Array` | `[]` | The blocks, in order: `[{ id, type, props }]`. |
| `types` | `Array` | required | The block types (see above). |
| `pinnedLast` | `String` | `''` | A type that always sits last and cannot be moved or removed. |
| `maxBlocks` | `Number` | `0` | The most blocks the list takes; 0 for no limit. The palette is disabled at the limit. |
| `createBlock` | `Function` | `null` | `(type) => block` for a new block. Without it a block gets a generated id and the fields' `default` values. |
| `addLabel` | `String` | `''` | The palette's label (default "Add a block"). |
| `listLabel` | `String` | `''` | The list's accessible name (default "Blocks"). |
| `emptyText` | `String` | `''` | Shown when the list is empty. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `Array` | The new list, with the pinned blocks last. |
