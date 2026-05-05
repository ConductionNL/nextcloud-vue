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
