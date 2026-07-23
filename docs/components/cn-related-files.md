---
sidebar_position: 44
---

# CnRelatedFiles

A widget for **relating existing Nextcloud files** to an object — an agent "project" / "related files" surface. Unlike [`CnFileManager`](./cn-file-manager.md) (which uploads new bytes via a dropzone), `CnRelatedFiles` manages a list of lightweight references `{ path, name?, description? }` to files that already live in the user's Nextcloud.

Files are added through the native Nextcloud **file picker** (`getFilePickerBuilder` from `@nextcloud/dialogs`) and removed with a per-row button. The component is purely presentational + picker-driven — it owns **no** network layer and persists nothing. The consuming app reacts to `@add` / `@remove` (or binds `v-model:files` / `:files.sync`) and stores the resulting path list however it likes (e.g. an OpenRegister object property).

Each picked path becomes a ref whose `name` is derived from the basename of the path. An optional `path-input` fallback renders a small text field so a path can be typed directly when a picker isn't desirable (default off).

## Try it

```vue
<CnRelatedFiles
  title="Related files"
  description="Files linked to this project"
  :files="project.files"
  picker-title="Select project files"
  :allow-multiple="true"
  @add="onAdd"
  @remove="onRemove"
  @update:files="project.files = $event" />

<!-- or with v-model -->
<CnRelatedFiles v-model:files="project.files" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `files` | `Array<{path,name?,description?}>` | `[]` | Related file references to render. `name` falls back to the basename of `path`. |
| `title` / `description` | String | `''` | Optional header. |
| `readOnly` | Boolean | `false` | Hide the Add control + per-row Remove buttons. |
| `addLabel` | String | `'Add files'` | Label for the primary "add via picker" button. |
| `emptyLabel` | String | `'No related files yet.'` | Empty-state text. |
| `allowMultiple` | Boolean | `true` | Allow selecting multiple files in the picker in one pass. |
| `pickerTitle` | String | `'Select files'` | Title shown at the top of the Nextcloud file picker dialog. |
| `pathInput` | Boolean | `false` | Also render a fallback text field + Add button to relate a file by typing its path. |
| `pathPlaceholder` | String | `'/path/to/file.pdf'` | Placeholder for the path fallback field. |
| `pathAddLabel` | String | `'Add'` | Label for the path fallback Add button. |
| `removeLabel` | String | `'Remove'` | Per-row Remove button label / title. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add` | `{path,name}` or `{path,name}[]` | File(s) related via the picker or path field. A single ref when one file was added, otherwise an array. Consumer persists then keeps `files[]` in sync. |
| `remove` | `{path,name?,description?}` | Row's Remove button clicked. |
| `update:files` | `Array<{path,name?,description?}>` | The full new file list — enables `v-model:files` / `:files.sync`. Emitted alongside `add` / `remove`. |

## Slots

- `#header` — replaces the title/description header.
- `#item-actions` — per-row actions. Scope: `{ file }`. Default renders a Remove button.

## The file picker

The picker is opened through the `@nextcloud/dialogs` builder pattern:

```js
import { getFilePickerBuilder, FilePickerType } from '@nextcloud/dialogs'

const picker = getFilePickerBuilder(pickerTitle)
  .setMultiSelect(allowMultiple)
  .setMimeTypeFilter([])
  .setModal(true)
  .setType(FilePickerType.Choose)
  .allowDirectories(false)
  .build()
const picked = await picker.pick() // string, or string[] when multi-select
```

`picker.pick()` returns a single path string (single-select) or an array of path strings (multi-select). Each is turned into a `{ path, name }` ref with `name` derived from the basename.

## See also

- [`CnFileManager`](./cn-file-manager.md) — for **uploading** new files (dropzone + `@upload`), rather than relating existing ones.
