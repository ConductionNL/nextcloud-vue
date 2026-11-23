# Design: files-preview-in-place

Read at nextcloud-vue development `c8aa85863`.

## What is there

- `CnFilesTab.openFile(file)` (`src/components/CnObjectSidebar/CnFilesTab.vue:769`)
  tries the Viewer when `viewerHandles(file)` (`:759`) says it can, then a
  validated `accessUrl` through `safeHref`, then the Files app. The
  comment there sets the order: the Viewer first, because it keeps the
  reader on the object.
- `CnFilesCard` renders `<a :href="safeHref(file.url)" target="_blank">`
  (`src/components/CnFilesCard/CnFilesCard.vue`), and is the files
  integration's widget (`src/integrations/builtin/files.js:33`).
- `CnFilesWidget.onItemClick(item)` (`src/components/CnFilesWidget/CnFilesWidget.vue:728`)
  opens `/f/{fileid}` in a new tab (`openFileInFilesApp`, `:783`).
- `CnJsonViewer` renders JSON read-only.

## Decisions

### D1. One opener, lifted out of `CnFilesTab`

`useFileOpener()` holds the order `CnFilesTab` already uses and adds one
step:

1. The Viewer, when present and handling the mime type.
2. `CnFilePreview`, when the type is one it renders (D2).
3. The browser, for `application/pdf` and `image/*`, through the
   validated access or download URL in a new tab with
   `noopener,noreferrer`.
4. The Files app permalink `/f/{fileid}`.

`CnFilesTab`, `CnFilesCard`, `CnFilesWidget` and `CnRelatedFiles` call
it. The URL validation stays `safeHref`, so no path to a `javascript:`
URL is added.

### D2. `CnFilePreview` renders data, not documents

A dialog with the file name, the size, Download and Open in Files, and a
body by type:

| type | body |
|---|---|
| `text/csv`, `text/tab-separated-values` | first 100 rows as a `CnDataTable`, header from row one, "showing 100 of about N" |
| `application/json`, `*+json` | `CnJsonViewer`, first 1 MB |
| `application/xml`, `text/xml`, `*+xml` | formatted text, first 1 MB |
| `text/plain`, `text/markdown` | text, first 1 MB |

The file is fetched with a `Range` header for the first 1 MB, so a
200 MB CSV costs a megabyte. A file that fails to parse shows the raw
text and says it could not be read as a table.

Rejected: a spreadsheet widget with sorting and filtering. That is a
data store's job (DKAN imports into one); a preview answers "is this the
file I want".

### D3. Public pages use what is there

The library's public runtime (`public-manifest-runtime`) does not load
the Viewer. There, steps 2 to 3 apply, using the public download URL
OpenRegister gives a published file. Nothing here adds a public
endpoint.

## Files

- `src/composables/useFileOpener.js`: new.
- `src/components/CnFilePreview/`: new.
- `src/components/CnObjectSidebar/CnFilesTab.vue`: call the composable.
- `src/components/CnFilesCard/CnFilesCard.vue`: a button, not a bare link.
- `src/components/CnFilesWidget/CnFilesWidget.vue`: `onItemClick`.
- `src/components/CnRelatedFiles/CnRelatedFiles.vue`: same.

## Security

A CSV cell is rendered as text, never as HTML. `CnDataTable` already
escapes. JSON and XML are shown as text. The fetch goes to the same
OpenRegister or DAV URL the Download button uses, with the user's
session, so a preview can show nothing a download could not.

## Accessibility

The preview dialog is an `NcDialog` with the file name as its title;
the table has a caption naming the file and the row limit.
