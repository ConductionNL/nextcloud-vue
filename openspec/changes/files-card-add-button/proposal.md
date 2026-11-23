# Proposal: files-card-add-button

## Why

Board PqTaak (pipelinq) draws "Bestand toevoegen" as a tonal pill in the header of a task's Documenten card. That card is a manifest `integration` widget (`integrationId: files`), which renders CnFilesCard. Its `#actions` slot cannot be filled from a manifest, so the button could not be configured.

## What changes

- CnFilesCard gains `addable` (and `addLabel`, default the translated "Add file"). When set, the card header shows a tonal add button (`cn-button--tonal`, Plus icon) that opens a file picker, attaches each picked file to the object through `POST {apiBase}/objects/{register}/{schema}/{id}/files` (the request CnObjectFilesWidget already makes), emits `uploaded` and reads the files again. A failed attach shows an error line in the card.
- Without `addable` nothing changes. A manifest passes it through the widget's `props`.
