# CnWidgetVisibilityRulesModal

Isolated host (ADR-004) for editing a dashboard-widget's conditional-visibility rule set. It is a pure editor — it does NO API. The rule model is **OR-across-rules / AND-within-a-rule**: the widget shows when ANY rule matches, and a rule matches only when ALL of its conditions match. Each condition is one of four kinds — `group`, `time` (time-of-day), `date` (date-range), `attribute` (user-attribute). The modal edits a working copy of the passed `rules`; nothing leaves the modal until **Save**, which emits the rebuilt array.

## Usage

```vue
<template>
  <CnWidgetVisibilityRulesModal
    :show="showRules"
    :rules="widget.visibilityRules"
    :available-groups="groups"
    @close="showRules = false"
    @save="onRulesSave" />
</template>

<script>
import { CnWidgetVisibilityRulesModal } from '@conduction/nextcloud-vue'

export default {
  components: { CnWidgetVisibilityRulesModal },
  data() {
    return { showRules: false, widget: { visibilityRules: [] }, groups: [] }
  },
  methods: {
    onRulesSave(rules) { this.widget.visibilityRules = rules },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `Boolean` | `false` | Toggles visibility. Going `false → true` re-seeds the working copy from `rules`. |
| `rules` | `Array` | `[]` | The rule set to edit. Each rule ANDs its `conditions`; the array ORs its rules. A condition is `{ kind, ...config }`. The prop is not mutated — Save emits a fresh array. |
| `available-groups` | `Array` | `[]` | Group options for the `group` condition picker. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | — | Fired on Cancel, backdrop click, or Esc — discards the working copy. |
| `save` | `rules` (Array) | Fired on Save with the rebuilt rule array. |

## Related

- [`CnWidgetStyleEditorModal`](./cn-widget-style-editor-modal.md) — Sibling chrome editor for the same widget.
