import GeneratedRef from './_generated/CnFilePreview.md'

# CnFilePreview

An in-page preview of a data file the Nextcloud Viewer does not show. A CSV or TSV renders as a table of its first 100 rows with the first row as header, JSON as a read-only formatted view, and XML or plain text as text. It fetches at most the first megabyte (`Range: bytes=0-1048575`), offers **Download** and **Open in Files**, and renders every cell as text, never as HTML. A file that cannot be read as a table (for example a CSV with unbalanced quotes) shows its raw text with a sentence saying so.

You rarely mount it yourself: [`CnFilesTab`](./cn-object-sidebar.md), [`CnFilesCard`](./cn-files-card.md), [`CnFilesWidget`](./cn-files-widget.md) and [`CnRelatedFiles`](./cn-related-files.md) open it through [`useFileOpener`](../utilities/composables/use-file-opener.md) when the Viewer cannot show the type.

```vue
<CnFilePreview
  v-if="file"
  :file="{ name: 'Afvalinzameling 2025.csv', accessUrl: '/s/abc/download', id: 12, size: 3200000 }"
  @close="file = null" />
```

The file needs a content URL (`accessUrl`, `downloadUrl` or `url`, validated by `safeHref`). `id` enables Open in Files; `size` lets the row count say "about N rows" for a long file.

## Props

| Prop | Default | Description |
|------|---------|-------------|
| `file` | required | The file row. |
| `maxRows` (`max-rows`) | `100` | Rows shown for a CSV or TSV, the header excluded. |
| `maxBytes` (`max-bytes`) | `1048576` | Bytes fetched at most. |
| `dialog` | `true` | Wrap the preview in a dialog; `false` embeds it. |

<GeneratedRef />
