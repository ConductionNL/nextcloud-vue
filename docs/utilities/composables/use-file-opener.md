# useFileOpener

The one way every files component opens a file. `open(file)` tries, in order:

1. Nextcloud's **Viewer**, when it is loaded (`window.OCA.Viewer`) and handles the file's mime type.
2. [`CnFilePreview`](../../components/cn-file-preview.md) for CSV, TSV, JSON, XML and text, through the `onPreview` callback (the host renders the dialog).
3. The **browser** in a new tab for PDF and images, through a URL validated by `safeHref` (a `javascript:` URL never opens).
4. The **Files app** permalink (`/f/{id}`).

It returns which way opened the file: `'viewer'`, `'preview'`, `'browser'`, `'files'` or `'none'`. On a public page the Viewer is not loaded, so PDFs and images open in the browser's own viewer and data files in the preview.

```js
import { useFileOpener } from '@conduction/nextcloud-vue'

const { open, viewerHandles } = useFileOpener({
  onPreview: (file) => { this.previewFile = file },
})
open({ id: 5, name: 'Besluit.pdf', type: 'application/pdf', path: '/Besluit.pdf', accessUrl: '/s/abc' })
```

| Option | Description |
|--------|-------------|
| `onPreview(file)` | Called when the file should open in `CnFilePreview`. Without it step 2 is skipped. |
| `userRelativePath(path)` | Maps a stored path to the Viewer's user-relative path. |
| `anyAccessUrl` | Also open any other type through its access URL before the Files app. |
| `filesAppUrl(file)` | Builds the Files app URL; defaults to the `/f/{id}` permalink. |
