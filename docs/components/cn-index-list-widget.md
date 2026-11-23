# CnIndexListWidget

The `index-list` widget: a list page's list inside a detail page. It shows the records of another schema that point at this one, with the list's own toolbar: lenses with counts, search, the view switch, filters, selection and the pager. An event page uses it for its registrations tab.

```json
{
  "id": "registrations",
  "type": "index-list",
  "title": "Registrations",
  "content": {
    "register": "pipelinq",
    "schema": "registration",
    "filter": { "event": "@objectId" },
    "search": true
  }
}
```

`content` takes the keys a `type: "index"` page takes in its `config`, such as `register`, `schema`, `columns`, `lenses`, `viewModes`, `search`, `selectable`, `actions` and `emptyText`. `filter` is the base filter that every lens and search narrows further, and it takes this record's `@objectId` and `@object.<field>` tokens. The list writes nothing to the address, because the address belongs to the detail page.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The list config, as a list page's `config`, with a token `filter`. |
| `objectId` | `string\|number` | `''` | The record this list belongs to, for `@objectId`. |
| `objectData` | `object` | `null` | The record, for `@object.<field>`. |
