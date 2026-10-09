# CnUnreadMarker

A dot for a record that changed since the user last looked (`@self.unread`, OpenRegister `object-read-state`). The dot is `aria-hidden`; a visually hidden "Unread" precedes the title, so a screen reader announces it once per row and the bold row carries it visually.

`CnDataTable` (and so `CnIndexPage`) renders it in the first cell of every row whose `@self.unread` is true and draws that row in bold (`cn-table-row--unread`). A row without the marker renders as before. Use it directly for your own list.

```vue
<CnUnreadMarker v-if="row['@self'].unread" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | String | `'Unread'` | Text for assistive technology. |
