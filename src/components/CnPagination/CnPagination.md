Basic — navigate pages with First/Previous/Next/Last buttons and smart ellipsis:

```vue
<template>
  <div>
    <CnPagination
      :current-page="page"
      :total-pages="12"
      :total-items="234"
      :current-page-size="20"
      @page-changed="page = $event"
      @page-size-changed="size = $event" />
    <p style="font-size: 13px; margin-top: 8px; color: var(--color-text-maxcontrast);">Page {{ page }} · {{ size }} per page</p>
  </div>
</template>
<script>
export default {
  data() {
    return { page: 1, size: 20 }
  },
}
</script>
```

Near the end — shows smart ellipsis at the start:

```vue
<template>
  <CnPagination
    :current-page="page"
    :total-pages="20"
    :total-items="400"
    :current-page-size="20"
    @page-changed="page = $event" />
</template>
<script>
export default {
  data() {
    return { page: 18 }
  },
}
</script>
```

Small result set — hides pagination when fewer items than threshold:

```vue
<CnPagination
  :current-page="1"
  :total-pages="1"
  :total-items="5"
  :current-page-size="20" />
```

Custom page size options:

```vue
<template>
  <CnPagination
    :current-page="1"
    :total-pages="5"
    :total-items="100"
    :current-page-size="25"
    :page-size-options="[
      { value: 25, label: '25' },
      { value: 50, label: '50' },
      { value: 100, label: '100' },
    ]"
    @page-changed="() => {}"
    @page-size-changed="() => {}" />
</template>
```
