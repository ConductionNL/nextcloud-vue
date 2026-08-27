# CnDeckCardPicker

Multi-step modal for picking an existing Nextcloud Deck card to link to the parent OpenRegister object. Part of the Deck integration leaf.

Flow: **1.** choose a board → **2.** choose a stack → **3.** choose a card → **4.** confirm. Boards/stacks come from `GET /api/integrations/deck/boards` and `…/boards/{id}/stacks`. On confirm it emits `link` with `{ cardId }`. To create a fresh card instead, use [CnDeckCardCreate](./cn-deck-card-create.md).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | Boolean | `false` | Controls modal visibility (v-model-style with `update:open`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `link` | `{ cardId }` | Emitted on confirm with the chosen Deck card id. |
| `update:open` | `boolean` | Modal open-state change. |

## Usage

```vue
<CnDeckCardPicker v-model:open="pickerOpen" @link="onLink" />
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBase` | String | — | Base path for the Deck integration API. |
| `dialogTitle` | String | — | Override for the modal title. |
| `cardLoader` | Function | `null` | Optional custom loader for the step-3 card list (defaults to the Deck app endpoint). |
