CnContextMenu is designed for right-click context menus paired with the `useContextMenu` composable. The menu trigger is hidden by default — it opens programmatically via the `open` prop.

Simulated open state — use `:open.sync` binding in practice:

```vue
<template>
  <div>
    <p style="font-size: 13px; color: var(--color-text-maxcontrast); margin-bottom: 8px;">
      In real use, right-clicking a row calls <code>openContextMenu(event, row)</code> from <code>useContextMenu()</code>.
      Here we simulate it with a button.
    </p>
    <div style="position: relative; display: inline-block;">
      <button @click="open = !open" style="padding: 8px 16px; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; background: var(--color-background-hover);">
        {{ open ? 'Close' : 'Open context menu' }}
      </button>
      <CnContextMenu
        :open.sync="open"
        :actions="actions"
        :target-item="targetItem"
        @close="open = false" />
    </div>
    <p style="margin-top: 8px; font-size: 13px;">Last action: {{ lastAction || '—' }}</p>
  </div>
</template>
<script>
import Pencil from 'vue-material-design-icons/Pencil.vue'
import ContentCopy from 'vue-material-design-icons/ContentCopy.vue'
import TrashCanOutline from 'vue-material-design-icons/TrashCanOutline.vue'
export default {
  data() {
    return {
      open: false,
      lastAction: '',
      targetItem: { id: 42, title: 'Invoice #2024' },
      actions: [
        {
          label: 'Edit',
          icon: Pencil,
          handler: (item) => { this.lastAction = `Edit: ${item.title}`; this.open = false },
        },
        {
          label: 'Copy',
          icon: ContentCopy,
          handler: (item) => { this.lastAction = `Copy: ${item.title}`; this.open = false },
        },
        {
          label: 'Delete',
          icon: TrashCanOutline,
          destructive: true,
          handler: (item) => { this.lastAction = `Delete: ${item.title}`; this.open = false },
        },
      ],
    }
  },
}
</script>
```
