Basic — add button, refresh, and pagination count:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 128 }"
    :object-count="20"
    add-label="Add client"
    :show-view-toggle="false"
    :show-mass-import="false"
    :show-mass-export="false"
    :show-mass-copy="false"
    :show-mass-delete="false"
    @add="last = 'add'"
    @refresh="last = 'refresh'" />
  <p style="font-size: 13px; margin-top: 8px;">Last action: {{ last || '—' }}</p>
</template>
<script>
export default {
  data() { return { last: '' } }
}
</script>
```

With view toggle and selection count:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 250 }"
    :object-count="20"
    :selected-ids="selectedIds"
    :view-mode="viewMode"
    add-label="Add item"
    :show-mass-delete="true"
    :show-mass-copy="true"
    :show-mass-export="true"
    :show-mass-import="true"
    @add="last = 'add'"
    @refresh="last = 'refresh'"
    @view-mode-change="viewMode = $event"
    @show-delete="last = 'delete '"
    @show-copy="last = 'copy'"
    @show-export="last = 'export'"
    @show-import="last = 'import'" />
  <p style="font-size: 13px; margin-top: 8px;">View: {{ viewMode }} · Last: {{ last || '—' }}</p>
</template>
<script>
export default {
  data() {
    return {
      viewMode: 'table',
      selectedIds: ['id-1', 'id-2'],
      last: '',
    }
  },
}
</script>
```

Refreshing state:

```vue
<template>
  <CnActionsBar
    :pagination="{ total: 42 }"
    :object-count="20"
    :refreshing="refreshing"
    :show-view-toggle="false"
    add-label="Add item"
    @refresh="doRefresh" />
</template>
<script>
export default {
  data() { return { refreshing: false } },
  methods: {
    doRefresh() {
      this.refreshing = true
      setTimeout(() => { this.refreshing = false }, 1500)
    },
  },
}
</script>
```

Disabled controls and custom add icon — `addDisabled`, `refreshDisabled`, `addIcon`, `showAdd`, and `selectable`:

```vue
<CnActionsBar
  :pagination="{ total: 10 }"
  :object-count="10"
  add-label="Add schema"
  add-icon="DatabasePlus"
  :add-disabled="true"
  :refresh-disabled="false"
  :show-add="true"
  :selectable="false"
  :show-view-toggle="false"
  :show-mass-import="false"
  :show-mass-export="false"
  :show-mass-copy="false"
  :show-mass-delete="false"
  @add="() => {}"
  @refresh="() => {}" />
```

Controlling the inline action button count — `inlineActionCount` sets how many custom actions are shown inline (the rest go to the overflow dropdown):

```vue
<CnActionsBar
  :pagination="{ total: 50 }"
  :object-count="10"
  add-label="Add"
  :inline-action-count="3"
  :show-view-toggle="false"
  @add="() => {}"
  @refresh="() => {}">
  <template #action-items>
    <!-- NcActionButton items placed here respect inlineActionCount -->
  </template>
</CnActionsBar>
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `selectable` | `Boolean` | `true` | Whether rows/cards can be selected (controls whether mass-action state is meaningful) |
| `addIcon` | `String` | `''` | MDI icon name for the Add button (e.g. `'AccountGroup'`). Falls back to a Plus icon when empty |
| `inlineActionCount` | `Number` | `2` | How many custom `#action-items` buttons to show inline before moving them to the overflow dropdown |
| `refreshDisabled` | `Boolean` | `false` | Disable the Refresh action (e.g. while a required selection is missing) |
| `addDisabled` | `Boolean` | `false` | Disable the Add button (e.g. while a required selection is missing) |
| `showAdd` | `Boolean` | `true` | Whether to render the Add button at all |
