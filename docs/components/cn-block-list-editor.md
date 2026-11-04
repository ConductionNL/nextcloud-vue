# CnBlockListEditor

An ordered list of typed blocks, each with its own editor. Board LqLesMaken draws it as "Blokken van de les": text, media, a test and a teacher note, moved by dragging or with Omhoog and Omlaag, and an AI draft to keep or throw away. PqNieuwsbriefWizard and PqProduct draw the same list.

## Usage

```vue
<CnBlockListEditor
  v-model="blocks"
  palette="select"
  id-key="blockId"
  :types="[
    { type: 'text', label: 'Tekst', create: () => ({ text: '' }) },
    { type: 'note', label: 'Notitie voor docenten', create: () => ({ text: '' }) },
  ]"
  :labels="{
    draft: 'AI-concept',
    draftNotice: 'Er staat nog een AI-concept in blok {position}. Bewaar of verwijder het eerst, daarna kunt u de les opslaan.',
  }"
  @pending-drafts="draftPositions = $event">
  <template #block-text="{ block, update }">
    <CnMarkdownEditor :model-value="block.text" @update:model-value="update({ text: $event })" />
  </template>
  <template #block-note="{ block, update }">
    <NcTextArea label="Notitie" :model-value="block.text" @update:model-value="update({ text: $event })" />
  </template>
</CnBlockListEditor>

<NcButton :disabled="draftPositions.length > 0" @click="save">Les opslaan</NcButton>
```

You own the list through `v-model`, and you draw each type's editor in a `block-<type>` slot. The component does not know what a block holds, so saving and checking stay with you.

## Moving without a pointer

Move up and Move down do what dragging does. Press Tab to reach the button and Enter to move. Focus stays on the button, or goes to the other one when the block reaches the end. A screen reader hears "Block moved to position 3 of 5", after a drag too. Each button's name holds the block's type and position, because two text blocks would otherwise read the same.

## Drafts and pinned blocks

Give a block `draft` (`true`, a note, or `{ note }`) and it shows Keep and Discard. Keep removes the marker. Discard removes the block. A notice over the list names the first waiting block, and `pending-drafts` gives you the positions, so you can hold your save back.

A block with `pinned` stays where it is. It has no move or remove buttons, a drag cannot pass it, and new blocks land above it. Use it for a footer that must come last.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `modelValue` | `Array` | `[]` | The blocks: `{ <idKey>, type, draft?, pinned?, ... }`. |
| `types` | `Array` | `[]` | What a user can add: `{ type, label, create? }`. `create()` returns the fields of a new block. |
| `idKey` | `String` | `'id'` | The field that holds a block's id. |
| `palette` | `String` | `'buttons'` | `buttons`, one per type, or `select`, a field with an add button. |
| `collapsible` | `Boolean` | `false` | Open an editor by pressing the block's name, rather than showing every editor. |
| `disabled` | `Boolean` | `false` | Read only: no palette, no moving, no removing. |
| `labels` | `Object` | `{}` | Replacement texts: `add`, `type`, `list`, `empty`, `drag`, `moveUp`, `moveDown`, `remove`, `draft`, `keep`, `discard`, `kept`, `discarded`, `removed`, `added`, `moved`, `draftNotice`, `controlName`. |

## Slots

| Slot | Props | Description |
| --- | --- | --- |
| `block-<type>` | `block`, `index`, `position`, `update` | The editor of one type. `update(changes)` merges fields into the block. |
| `block` | `block`, `index`, `position`, `update` | The editor of a type without its own slot. |
| `summary` | `block`, `index`, `position` | One line about the block, on its row. |
| `block-actions` | `block`, `index`, `position` | Further buttons on the row. |
| `preview` | `blocks` | What the blocks look like together. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:modelValue` | `object[]` | The new list. |
| `add` | `{ block, index }` | A block was added. |
| `remove` | `{ block, index }` | A block was removed. |
| `move` | `{ block, from, to }` | A block moved, by drag or by button. |
| `keep-draft` | `{ block, index }` | The user kept a draft. |
| `discard-draft` | `{ block, index }` | The user discarded a draft. |
| `pending-drafts` | `number[]` | The positions still in draft, on mount and on every change. |
