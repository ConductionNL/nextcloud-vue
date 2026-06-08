---
sidebar_position: 20
---

# useClickDragGuard

Distinguishes a deliberate click from a text-selection drag on a row or card whose body toggles selection on click.

When a card or table row toggles selection when its body is clicked, dragging across it to select text would also fire a `click` at the end of the gesture — and wrongly toggle selection. This composable records the pointer position on `mousedown` and reports, on the following `click`, whether the pointer travelled far enough (more than `CLICK_DRAG_THRESHOLD`, 6px) to count as a drag rather than a click.

Used internally by [`CnDataTable`](../../components/cn-data-table.md) (row click) and [`CnObjectCard`](../../components/cn-object-card.md) (card click).

## Signature

```js
import { useClickDragGuard, CLICK_DRAG_THRESHOLD } from '@conduction/nextcloud-vue'

const { onPointerDown, wasDrag } = useClickDragGuard()
```

## Return Value

| Key | Type | Description |
|-----|------|-------------|
| `onPointerDown(event)` | Function | Records where a press started. Bind to `@mousedown` on the clickable element. |
| `wasDrag(event)` | Function | Returns `true` when the pointer moved past `CLICK_DRAG_THRESHOLD` since the last `mousedown` (a text-selection drag). Consumes the stored start position. Call at the top of your click handler and bail when `true`. |

`CLICK_DRAG_THRESHOLD` (number, `6`) is the maximum pointer travel in pixels still treated as a click.

## Usage

The start position lives in a closure (not reactive — it never feeds the render), so the composable works for Options API components: spread its members into `setup()`'s return.

```vue
<template>
  <div
    class="card"
    @mousedown="onPointerDown"
    @click="onCardClick($event)">
    <!-- content -->
  </div>
</template>

<script>
import { useClickDragGuard } from '@conduction/nextcloud-vue'

export default {
  setup() {
    return useClickDragGuard()
  },
  methods: {
    onCardClick(event) {
      if (this.wasDrag(event)) return // a drag, not a click — ignore
      this.$emit('select', this.object)
    },
  },
}
</script>
```
