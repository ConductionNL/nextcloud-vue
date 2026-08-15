# CnDeckCardCreate

Inline-create dialog for a fresh Nextcloud Deck card linked to the parent OpenRegister object. Part of the Deck integration leaf; the counterpart to [CnDeckCardPicker](./cn-deck-card-picker.md) (which links an existing card).

Form fields: **Board** (required, from `GET /api/integrations/deck/boards`), **Stack** (required, cascades on board change via `…/boards/{id}/stacks`), **Title** (required), **Description** (optional), **Due date** (optional).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | Boolean | `false` | Controls modal visibility (v-model-style with `update:open`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create` | `{ boardId, stackId, title, description, due }` | Emitted on confirm with the new card payload. |
| `update:open` | `boolean` | Modal open-state change. |

## Usage

```vue
<CnDeckCardCreate :open.sync="createOpen" @create="onCreate" />
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBase` | String | — | Base path for the Deck integration API. |
| `dialogTitle` | String | — | Override for the dialog title. |
