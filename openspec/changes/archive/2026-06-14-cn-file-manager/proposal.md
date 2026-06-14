# CnFileManager — file-list widget with drag-drop upload

## Why

The opencatalogi triage flagged `PublicationDetailPageView` and `PageDetailPageView` as customs because no lib widget surfaces a file-list with drag-drop upload + per-file download/delete. The shape recurs across consuming apps that attach files to OR objects.

## What

`src/components/CnFileManager/CnFileManager.vue` (~370 LOC). Dropzone + click-to-pick file input → `@upload(File[])`. Per-file row with extension-icon + size + uploadedAt + uploadedBy + Download / Delete actions. `readOnly` mode for view-only surfaces. `maxSizeMb` validation with typed `upload-rejected` event. Per-file `#item-actions` slot to drop in extra buttons.

The widget owns the UI; consumers wire the network layer.

## Non-goals

- Folder navigation / nested directories.
- Inline preview pane (consumers handle that on `@file-click`).
- Chunked / resumable uploads.
- Built-in OR `_files` array adapter (consumers map their data once).

## References

- [nextcloud-vue#285](https://github.com/ConductionNL/nextcloud-vue/issues/285).
- opencatalogi `PublicationDetailPageView` + `PageDetailPageView`.
