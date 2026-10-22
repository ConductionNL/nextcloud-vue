---
id: cn-files-browser
title: CnFilesBrowser
---

# CnFilesBrowser

A folder of Nextcloud files, on any page, built from the Files app's own primitives rather than a copy of its screen.

## What it borrows, and from where

- **Rows** are `@nextcloud/files` nodes read over WebDAV with the same PROPFIND the Files app sends, so a node here carries what a node there carries: id, mime, size, mtime, permissions, attributes.
- **Each row's menu** is `getFileActions()`: the actions the Files app and its plugins registered on the page (download, delete, rename, favourite, move and copy, sharing status, tags, lock, open in Files). They run with the context the Files app hands them, so a plugin's action does what it does in the Files app.
- **The New menu** is `getNewFileMenuEntries(folder)`: new folder, a template, a file request, whatever the plugins offer for this folder, beside a plain upload that PUTs over DAV.
- **Crumbs** are `NcBreadcrumbs`, drawing the whole trail from the user's files root the way the Files app does: the folders above the browser's root link into the Files app, the root and everything beneath it navigate in place. Icons are the theme's own mime icons through `OC.MimeType`; image previews come from the core preview endpoint.

## What the host page has to do

The Files app registers its actions and menu entries only on pages that ask for them. The host dispatches Nextcloud's `OCA\Files\Event\LoadAdditionalScriptsEvent` server-side (the plugins' scripts) and adds the Files app's `init` script (`Util::addScript('files', 'init')`, the core actions). Dispatching `OCA\Viewer\Event\LoadViewer` as well lets the `view` action open a file over the page.

On a page that did nothing of this, the row menu holds only **Show in Files**, which is the honest fallback.

## What is not borrowed

The Files app's list itself (column filters, selection bar, inline rename) is a Vue app bound to the Files router and stores, and so is its details sidebar on Nextcloud 34. Neither can be mounted elsewhere. The actions that need them are left out by name (`ACTIONS_NEEDING_THE_FILES_PAGE`) and **Show in Files** opens the Files app on the file for the rest.

## The registry is versioned

`@nextcloud/files` keeps its registries under `window._nc_files_scope.v4_0`. The page's plugins register into the copy the server ships; this component reads through the library's bundled copy. Both have to be the same major, which is why this library depends on `@nextcloud/files` 4.x.

## Usage

```vue
<CnFilesBrowser
	root-path="/Open Registers/Cases/6c0d…"
	@changed="onFilesChanged" />
```

Resolve the root for an OpenRegister object with `resolveObjectFolder()`:

```js
import { resolveObjectFolder } from '@conduction/nextcloud-vue'
import { getCurrentUser } from '@nextcloud/auth'
import { generateRemoteUrl } from '@nextcloud/router'

const rootPath = await resolveObjectFolder({
	apiBase: '/apps/openregister/api',
	register: 'dossiq',
	schema: 'case',
	objectId,
	uid: getCurrentUser().uid,
	remoteUrl: generateRemoteUrl('dav'),
})
```

It reads the object's `@self.folder` file id and turns it into a path with a DAV search; `null` means the object has no folder or the user cannot see it, and the caller falls back to the object's files endpoint. `CnFilesTab` does exactly this.

## An OpenRegister object's folder, through OpenRegister

Since OpenRegister keeps every object folder in its own account, out of each person's Files app, a reader has no WebDAV path to the files. Pass a `source` and the browser reads and writes the folder through OpenRegister's files API instead, under the object's own access rule:

```js
import { CnFilesBrowser, createOpenRegisterSource } from '@conduction/nextcloud-vue'

const source = createOpenRegisterSource({
	apiBase: '/apps/openregister/api',
	register: 'dossiq',
	schema: 'case',
	objectId,
})
```

```vue
<CnFilesBrowser root-path="/" :source="source" :root-label="caseTitle" />
```

With a source:

- every request goes to `/api/objects/<register>/<schema>/<id>/folder` (list a folder or subfolder, create a folder, upload, rename, delete) and downloads use the object's `files/<fileId>` endpoint, so a person who may read the object browses it and nobody else does, without a share;
- `rootPath` is `/`, the object folder; subfolders open in place;
- the Files app's registered actions and New menu entries are not offered, because they act over WebDAV on a tree the reader does not have; the row menu holds download, and for a person who may change the object, rename and delete;
- upload, the New menu, the upload button, the drop state and the drop hint appear only when the listing says the person may change the folder (`canChange`, which is update on the object).

`CnFilesTab` uses this source by default (`source: 'openregister'`); `source: 'webdav'` keeps the WebDAV lookup.

## The host's actions and linked rows

A host that keeps a record about each file (dossiq's ZGW document record, say) can put its own action on every file row and show files that belong to the object without living in its folder:

```vue
<CnFilesBrowser
	root-path="/Open Registers/Cases/6c0d…"
	:row-actions="[{ id: 'document-properties', label: 'Document properties', icon: 'FileDocumentEditOutline', type: 'open-modal', target: 'DocumentMetadataDialog' }]"
	:linked-items="linkedDocuments" />
```

A row action is dispatched the way a widget's row action is: through the page's `cnDispatchAction` when the browser sits in a `CnPageRenderer` tree, else through the bare dispatcher. Folders get no host action. A linked row is read-only here; what changes it lives where the file does.

A row action that only means something for some files says which, with `visibleIf`, and is left off every other row:

```json
{ "id": "read-as-message", "label": "Read as a message", "type": "handler", "handler": "readFileAsMessage",
  "visibleIf": { "extension": ["eml", "msg"] } }
```

`extension` lists extensions (case does not matter, a leading dot is allowed). `mime` lists mime types, and one ending in `/` or `/*` names the whole family (`image/*`). When both are named, both must hold. An action without `visibleIf` is on every file, as before. It decides what is offered, not what is allowed: the act itself still checks what it was handed.

## Columns the host declares

Set `columns` and the table shows what this page needs rather than what a file
manager needs. A document list on a case wants sender, recipient, direction and
a scan verdict; none of those live on the node, and all of them can be a column.

```json
"columns": [
  "name",
  { "key": "sender", "label": "Sender", "source": "row" },
  { "key": "scan", "label": "Scan", "source": "attribute",
    "attribute": "{http://owncloud.org/ns}av-status", "formatter": "scanVerdict" },
  "modified"
]
```

Three sources, three places a value comes from:

- `node` reads a property of the file itself, the one the DAV listing already
  carried.
- `attribute` reads a DAV property, and the browser adds it to the PROPFIND
  before listing, so the value is there with the rows rather than one request
  per file later.
- `row` reads `rowData[fileid][key]`. Pass `rowData` as a function and it is
  called once with the whole listing, so the host fetches its projection in one
  request. Without `rowData` the cell is empty and nothing is thrown.

Every declared cell renders through `CnCellRenderer`, so a `formatter` means
here exactly what it means in a table.

### Who decides what

- The host decides membership. `columns` is the list of columns this browser
  has, in the host's order. Declare none and you get name, size and modified,
  as before.
- The user decides visibility, and only downward. Give `preferenceApp` and the
  toolbar offers a Columns chooser that hides any declared column and remembers
  it per user. It can never add one: the chooser is built by walking the host's
  declaration, so a column the host removed is not listed, cannot be ticked
  back on, and does not render however an old stored choice reads.

A `node` column sorts through the Files app's own sorter. A `row` or
`attribute` column with `sortable: true` sorts on its resolved value within the
listed folder, folders still first, and a file with no value sorts last in both
directions rather than pushing the filled rows out of sight.

Start with one declared column and `rowData` as a function, then add the
chooser once the set is settled.

### From a manifest

A manifest cannot hold a function, so a `files` widget names an endpoint
instead and `CnFilesTab` turns it into `rowData`:

```json
"props": {
  "columns": ["name", { "key": "senderName", "label": "Sender", "source": "row" }, "modified"],
  "rowDataUrl": "/apps/myapp/api/cases/OBJECT_ID/dossier",
  "rowDataPath": "documents",
  "rowDataKey": "fileId",
  "preferenceApp": "myapp",
  "preferenceKey": "case-files-columns"
}
```

Where `OBJECT_ID` stands above, write the word objectId between curly braces,
the same placeholder `linkedItemsUrl` takes; the tab replaces it with the
object's id. The answer is read once per listing. It
can be a list of records, the list at `rowDataPath`, or a list under `items` or
`results`; each record names its file in `rowDataKey` (`fileId` by default),
and a record without one is skipped. An object that is none of those is taken
as already keyed by file id. A failed read leaves the extra cells empty and the
files listed.

## A documents list: selection, groups and a filter

A host whose files are documents it keeps a record about can let people act
on several at once, read them by kind, and narrow them, all from the columns
it already declared. Each is off unless named.

```json
"props": {
  "columns": ["name", { "key": "type", "label": "Type", "source": "row" },
              { "key": "keywords", "label": "Keywords", "source": "row" }, "modified"],
  "rowDataUrl": "/apps/myapp/api/cases/OBJECT_ID/dossier",
  "bulkActions": [
    { "id": "mark-final", "label": "Mark as final", "icon": "FileCheckOutline",
      "type": "open-modal", "target": "BulkDocumentDialog", "props": { "mode": "mark-final" } }
  ],
  "groupBy": "type",
  "facets": ["keywords"]
}
```

- `bulkActions` puts a checkbox on every file (never on a folder or a linked
  row, which the browser cannot act on) and a select-all in the header, named
  for screen readers. While files are selected a bar says how many and offers
  each bulk action and Clear selection. An `open-modal` action's props gain
  `files` (each `{ fileId, fileName, path }`) and `fileIds`; a `handler`
  action's args gain the selected nodes. The selection clears after an action
  runs and when another folder opens. Select all takes the files the filter
  keeps, not the hidden ones.
- `groupBy` names a declared column. The files are listed under a heading per
  value, in the order each value is first met, with how many files sit under
  it; files with no value come last under `groupEmptyLabel` ("Other"). Folders
  stay above the groups. A list value groups under its first entry.
- `facets` names declared columns. Each gets a chip per value in use among
  the folder's files with its count, most used first; a list value counts per
  entry. A chosen chip keeps the files that carry it; within one column any
  chosen value will do, and every column with a choice must pass. Clear filters
  drops them, and a filter that matches nothing says so instead of showing an
  empty table.

The values come from the same cells the table shows, so a `row` column needs
its row data, and a column the user hid with the Columns chooser still groups
and filters, because the host declared it.

### Around the selection, and values in tones

```json
"props": {
  "columns": ["name",
    { "key": "scan", "label": "Scan", "source": "row", "widget": "badge",
      "colorMap": { "clean": "success", "infected": "error" } },
    { "key": "visibleTo", "label": "Visible to", "source": "row",
      "colorKey": "level", "colorMap": { "restricted": "warning" } }],
  "selectionLabel": "{count} documents selected",
  "selectionLabelOne": "{count} document selected",
  "showClearSelection": false,
  "sideCards": [
    { "id": "visibility", "title": "Who can see this: {name}",
      "fields": [{ "key": "visibleTo", "label": "Visible to", "colorKey": "level", "colorMap": { "restricted": "warning" } },
                 { "key": "reason", "label": "Reason" }],
      "actions": [{ "id": "change", "label": "Change exception", "type": "open-modal", "target": "VisibilityDialog" }] },
    { "id": "checksum", "title": "Checksum", "fields": [{ "key": "checksum", "label": "SHA-256" }] }
  ]
}
```

- `selectionLabel` (and `selectionLabelOne` for one file) words the bulk bar's
  count, through the app's translate function, with `{count}` filled in.
  `showClearSelection: false` leaves out Clear selection.
- `sideCards` draws a column of cards beside the list about the last selected
  file; there is no column while nothing is selected, and it folds under the
  list in a narrow window. A card's `title` may hold `{name}`. A field reads the
  host's row data (`source: "row"`, the default) or the node (`source: "node"`,
  e.g. `basename`), takes a `formatter` like a column, and is left out when it
  has no value. `actions` are declared like `rowActions` and run on that file.
- A column's `colorMap` maps a value (case-insensitive) to a tone: `success`,
  `warning`, `error`, `info`, `primary` or `default`. With `widget: "badge"`
  the cell is a pill in that tone, as in the tables; without it the text is
  drawn in the tone's colour. `colorKey` names another row field to look the
  tone up by (a level code behind a readable text). Card fields take the same
  two keys.
- A `row` key (of a column, a card field or `colorKey`) may be a dotted path
  into the host's record, such as `scanVerdict.state` or `integrity.value`. A
  key the record holds as written wins.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `Object` | `null` | Where the folder is read from and written to. Null is WebDAV under the person's files root. `createOpenRegisterSource({ apiBase, register, schema, objectId })` reads one OpenRegister object's folder through OpenRegister, under the object's access rule; see above. |
| `deleteLabel` | `String` | `'Delete'` | Label of the delete action and its dialog, with a `source`. |
| `rootPath` | `String` | required | The folder the browser is rooted at, relative to the current user's files root. The browser never navigates above it. |
| `rootLabel` | `String` | `null` | What the root crumb reads. Null shows the folder's own name, as the Files app does; pass a label when the folder on disk is a uuid and the host knows a better name. |
| `newLabel` | `String` | `'New'` | Label of the New menu. |
| `uploadLabel` | `String` | `'Upload files'` | Label of the upload entry in the New menu. |
| `newFolderLabel` | `String` | `'New folder'` | Label of the new-folder entry and its dialog. |
| `renameLabel` | `String` | `'Rename'` | Label of the rename action and its dialog. The Files app's own rename is its list's inline input, so the browser renames through a dialog and a DAV move. |
| `showInFilesLabel` | `String` | `'Show in Files'` | Label of the link that opens the file in the Files app. |
| `uploadButton` | `Boolean` | `false` | Show a primary upload button beside the New menu, which then renders as secondary. It opens the same picker as the New menu's upload entry. |
| `uploadButtonLabel` | `String` | `'Add files'` | Label of the button `uploadButton` shows. |
| `dropOverlay` | `Boolean` | `false` | While a drag that carries files is over the browser, cover it with a dashed frame and `dropLabel` centred, and say `dropLabel` in a polite live region; after a drop the region says how many files were added. The overlay is decoration (`aria-hidden`); keep a button or the New menu as the way in for anyone who cannot drag. Off keeps the plain dashed outline and announces nothing. |
| `dropLabel` | `String` | `'Drop to add'` | The line `dropOverlay` draws and announces, through the host translate. |
| `dropDetail` | `String` | `''` | A second line under `dropLabel` in the drop state, through the host translate, saying where the files go ("{count} bestanden komen bij zaak 2026-0082, als nog te beoordelen document.", board DqZaakDocumentenSlepen). `{count}` is the number of files dragged; when the browser does not say, a line that needs it is left out. With it the drop state fills the panel (at least 320px) instead of the list's own height. The files tab (`CnFilesTab`, the case files leaf) forwards `dropLabel` and `dropDetail`. |
| `dropHint` | `Boolean` | `false` | Show a line under the list saying files can be dropped on it. |
| `dropHintLabel` | `String` | `'Or drag files onto this list.'` | The line `dropHint` shows. |
| `emptyLabel` | `String` | `'This folder is empty'` | Title of the empty state. |
| `emptyHint` | `String` | `'Drop files here, or use New'` | Line under the empty state's title. |
| `retryLabel` | `String` | `'Try again'` | Label of the retry button on a failed listing. |
| `rowActions` | `Array` | `[]` | The host's own actions on each file row (never on a folder), declared like any manifest action: `{ id, label, icon?, type, target?, props?, handler?, args?, visibleIf? }`. Dispatched through the page's action runner (`cnDispatchAction`, provided by `CnPageRenderer`) with the file merged in: an `open-modal` action's props gain `fileId`, `fileName` and `path`; a `handler` action's args gain the node. `icon` is an MDI icon name. `visibleIf` (`{ extension?, mime? }`) offers the action only on the files it names. |
| `newActions` | `Array` | `[]` | The host's own entries in the New menu, after the ones the Files app and its plugins register. Declared like a row action (`{ id, label, icon?, type, target?, props?, handler?, args? }`) and dispatched the same way, but with the folder rather than a row: an `open-modal` action's props gain `path`, a `handler` action's args gain the folder node. Use it for "new from template" or "request a file from a party". |
| `linkedItems` | `Array` | `[]` | Rows that are not nodes of this folder: files the host joined from another object's folder, shown after the folder's own rows with open and download only. Each is `{ id, name, mime?, size?, mtime?, href?, downloadHref?, note?, noteHref? }`; `note` says where the file lives, `noteHref` links there. |
| `columns` | `Array` | `[]` | The columns the browser shows, in order. A string names a built-in (`name`, `size`, `modified`, `owner`, `type`, `tags`); an object declares its own: `{ key, label, source, attribute, formatter, sortable }`, where `source` is `node`, `attribute` or `row`; `hidden: true` starts a column hidden: it is in the Columns chooser, still groups and filters, and shows once a user ticks it. Declaring none keeps today's name, size and modified. |
| `rowData` | `Object \| Function` | `null` | The host's per-file data for `source: 'row'` columns, keyed by file id. A function is called once per folder with the listed nodes, so a projection of ninety files is one request. |
| `preferenceApp` | `String` | `''` | The app id the Columns chooser stores this user's choice under. Unset means no chooser, and every declared column renders. |
| `preferenceKey` | `String` | `'files-browser-columns'` | The key the choice is stored under, so two browsers in one app remember separately. |
| `columnsLabel` | `String` | `'Columns'` | Label of the Columns chooser. |
| `selectionLabel` | `String` | `''` | The bulk bar's count as a template with `{count}`, translated by the app ("{count} documents selected"). Empty reads "{count} selected". |
| `selectionLabelOne` | `String` | `''` | The bulk bar's count for one file. |
| `showClearSelection` | `Boolean` | `true` | Whether the bulk bar ends in Clear selection. |
| `sideCards` | `Array` | `[]` | Cards beside the list about the last selected file: `{ id, title, fields, actions }`; see above. |
| `sideCardsPlacement` | `String` | `'beside'` | `page-side` puts the side cards in the detail page's side column (CnDetailPage `cnDetailSideColumn`), in place of its generic cards while a file is selected. Without a page side column they stay beside the list. Also forwarded by CnFilesTab. |
| `bulkActions` | `Array` | `[]` | The host's actions on a selection of files, declared like `rowActions`. With at least one, files get a checkbox, the header a select-all, and a bar with these actions shows while files are selected. An `open-modal` action's props gain `files` and `fileIds`; a `handler` action's args gain the selected nodes. |
| `groupBy` | `String` | `''` | The key of a declared column to group the files on, a heading per value with its count. Empty does not group. |
| `groupEmptyLabel` | `String` | `'Other'` | The heading of the files with no value in the `groupBy` column. |
| `facets` | `Array` | `[]` | Keys of declared columns to filter on: a chip per value in use with its count. |
| `headerActions` | `Array` | `[]` | The host's own buttons in the bar, before the upload button ("Vraag een bestand aan een partij"). Declared like a New-menu entry and dispatched the same way, with the folder; `variant: "primary"` draws one as the primary button. The `#header-actions` slot adds anything else there. |
| `rowButton` | `Object` | `null` | One visible button on every file row ("Beoordelen"), declared and dispatched like a row action. `primaryWhen: { key, values }` draws it as the primary button while the row-data field `key` holds one of `values` (a file still to review), secondary otherwise. |
| `reviewSummary` | `Object` | `null` | A review summary above the list: `{ key, open, values: [{ value, label?, tone? }], title?, subtitle? }`. `key` is the row-data field with the review state, `open` the value(s) of a file still to review (an unlisted or empty value counts as open). Draws "{done} of {total} reviewed", "{open} still to review", a bar in the tones (`success`, `warning`, `error`, `info`, `default`) and a legend with the count per value. `title` and `subtitle` replace the two lines and take `{done}`, `{total}` and `{open}`. |
| `footnote` | `String` | `''` | A line of the host's own under the list, apart from the drop hint ("Elk bestand wordt bij het uploaden op virussen gescand"). Translated with the host's catalogue. |
| `nameSecondary` | `String` | `''` | A second line under each file's name: a field template read from the file's row data plus `name`, `modified` and `owner`, e.g. `"{uploadedBy} · {modified\|date}"`. A line with an empty value is left out. |
| `openLinkedLabel` | `String` | `'Open'` | Label of a linked row's open action. |
| `downloadLabel` | `String` | `'Download'` | Label of a linked row's download action. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `changed` | none | The folder's contents changed through this browser: an upload, a new folder, or an action that ran. |

## Helpers

Exported alongside the component:

- `createOpenRegisterSource({ apiBase, register, schema, objectId })`: the data source for one OpenRegister object's folder, for the `source` prop.
- `resolveObjectFolder({ apiBase, register, schema, objectId, uid, remoteUrl })` — the object's folder as a user-relative path, or `null`.
- `userRelativePathFromHref(href, uid)` — a DAV href as a path under the user's files root.
- `crumbsFor(rootPath, currentPath, rootLabel?)` — the whole trail, outermost first; crumbs above the root carry `aboveRoot: true`.
- `joinPath(dir, name)` — one slash between.
- `ACTIONS_NEEDING_THE_FILES_PAGE` — the registered action ids that cannot run away from the Files page.
