---
sidebar_position: 15
---

# CnFilesPage

A file-browser / document page. v1 lists the contents of `folder` in a simple `CnDataTable` (consumer-supplied data) plus an "Open in Files" button that deep-links to the Nextcloud Files app.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "files"`. Honours `headerComponent`, `actionsComponent`, and a fully-replaceable `#files-view` slot for consumers wanting the full NC Files file-picker UX.

**Wraps**: `CnDataTable`, `CnPageHeader`, `NcButton`, `NcEmptyContent`, `NcLoadingIcon`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Files'` | Page title |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `false` | Whether to render the inline `CnPageHeader` |
| `icon` | String | `''` | MDI icon name |
| `folder` | String | **required** | Folder path within the user's Nextcloud filesystem |
| `allowedTypes` | Array<String> | `[]` | MIME-type filter. Literal (`'application/pdf'`) or wildcard (`'image/*'`). |
| `files` | Array<Object> | `[]` | Pre-loaded file listing from the consumer (each: `{ name, path, size, mtime, mime }`) |
| `loading` | Boolean | `false` | Whether a fetch is in progress |
| `error` | Error\|String\|Object | `null` | Truthy → error state |
| `emptyText` | String | `'No files in this folder'` | Empty-state text |
| `errorText` | String | `'Could not load folder contents'` | Error-state text |
| `openInFilesLabel` | String | `'Open in Files'` | Button label |
| `onRefresh` | Function | `null` | Optional refresh callback wired into the slot scope and the public `refresh()` method |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions; defaults to the "Open in Files" button. Filled by `pages[].actionsComponent` when set. |
| `files-view` | `{ folder, allowedTypes, files, loading, error, refresh }` | Replaces the entire default listing — the bridge to the full NC Files view or a consumer-supplied WebDAV component |
| `empty` | — | Replaces the empty-state |
| `error` | `{ error }` | Replaces the error state |

## Manifest configuration

```jsonc
{
  "id": "files-browser",
  "route": "/files",
  "type": "files",
  "title": "myapp.files.title",
  "config": {
    "folder": "/myapp/uploads",
    "allowedTypes": ["application/pdf", "image/*"]
  }
}
```

## Custom-fallback notes

- **No bundled WebDAV client.** The component does NOT fetch the folder listing on its own — it expects either a consumer-supplied `files` prop, or a `#files-view` slot that brings its own data fetch (e.g. via the consumer's existing `filesPlugin`). When neither is set, the empty-state renders. This keeps `@conduction/nextcloud-vue` zero-dep on `webdav`.
- **No upload, no rename, no delete.** v1 ships a read-only listing. Use the "Open in Files" button (links to `/apps/files/files?dir={folder}`) for the full UX, or fill the `#files-view` slot with a custom file picker (e.g. wrapping `OC.dialogs.filepicker`).
- **`allowedTypes` only filters the default listing.** Custom `#files-view` implementations are responsible for honouring the prop themselves; the slot scope exposes the array for that purpose.
- **The "Open in Files" button uses `/apps/files/files?dir={dir}`** — the URL shape is stable on Nextcloud 26+. Older releases need a custom `#actions` slot.
- **Future integration with `pluggable-integration-registry`**: per design.md Q4, once the `files` provider ships in OpenRegister, this component will gain a built-in fetcher that talks to that registry. Until then, consumers carry the fetch responsibility.
