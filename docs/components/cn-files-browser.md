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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rootPath` | `String` | required | The folder the browser is rooted at, relative to the current user's files root. The browser never navigates above it. |
| `rootLabel` | `String` | `null` | What the root crumb reads. Null shows the folder's own name, as the Files app does; pass a label when the folder on disk is a uuid and the host knows a better name. |
| `newLabel` | `String` | `'New'` | Label of the New menu. |
| `uploadLabel` | `String` | `'Upload files'` | Label of the upload entry in the New menu. |
| `newFolderLabel` | `String` | `'New folder'` | Label of the new-folder entry and its dialog. |
| `renameLabel` | `String` | `'Rename'` | Label of the rename action and its dialog. The Files app's own rename is its list's inline input, so the browser renames through a dialog and a DAV move. |
| `showInFilesLabel` | `String` | `'Show in Files'` | Label of the link that opens the file in the Files app. |
| `emptyLabel` | `String` | `'This folder is empty'` | Title of the empty state. |
| `emptyHint` | `String` | `'Drop files here, or use New'` | Line under the empty state's title. |
| `retryLabel` | `String` | `'Try again'` | Label of the retry button on a failed listing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `changed` | none | The folder's contents changed through this browser: an upload, a new folder, or an action that ran. |

## Helpers

Exported alongside the component:

- `resolveObjectFolder({ apiBase, register, schema, objectId, uid, remoteUrl })` — the object's folder as a user-relative path, or `null`.
- `userRelativePathFromHref(href, uid)` — a DAV href as a path under the user's files root.
- `crumbsFor(rootPath, currentPath, rootLabel?)` — the whole trail, outermost first; crumbs above the root carry `aboveRoot: true`.
- `joinPath(dir, name)` — one slash between.
- `ACTIONS_NEEDING_THE_FILES_PAGE` — the registered action ids that cannot run away from the Files page.
