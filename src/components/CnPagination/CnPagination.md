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

Small result set — hides pagination when fewer items than threshold (`minItemsToShow`, default 10):

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

Custom page info format and navigation labels (useful for translated apps or custom wording):

```vue
<CnPagination
  :current-page="3"
  :total-pages="10"
  :total-items="200"
  :current-page-size="20"
  page-info-format="Pagina {current} van {total}"
  first-label="Eerste"
  previous-label="Vorige"
  next-label="Volgende"
  last-label="Laatste"
  items-per-page-label="Items per pagina:"
  @page-changed="() => {}"
  @page-size-changed="() => {}" />
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `minItemsToShow` | `Number` | `10` | Hide the pagination bar when `totalItems` is at or below this threshold |
| `firstLabel` | `String` | `'First'` | Label for the First page button |
| `previousLabel` | `String` | `'Previous'` | Label for the Previous page button |
| `nextLabel` | `String` | `'Next'` | Label for the Next page button |
| `lastLabel` | `String` | `'Last'` | Label for the Last page button |
| `itemsPerPageLabel` | `String` | `'Items per page:'` | Label for the page-size selector |
| `pageInfoFormat` | `String` | `'Page {current} of {total}'` | Format string for the page info text; use `{current}` and `{total}` as placeholders |
