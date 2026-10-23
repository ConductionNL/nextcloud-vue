# Proposal: flow-board-save-as-version

## Why

Board DqFlow edits a case type's flow in place: Save is enabled, the palette steps are live, and the path reads
"versie 4 · wijzigingen gelden voor nieuwe zaken". On the flow board a published flow was read-only: the palette greyed
out, Save disabled, and a large notice over the canvas asked the author to create a draft version first and publish it
later. A case type flow is always published (a case runs it), so every visit to the board landed on that notice.

## What changes

- The flow store takes `savesAsVersion`. While it is on, a published flow is not locked; Save drafts the published
  version, puts the edited graph on the draft and publishes it as the next version. A draft that is open is saved and
  published. Runs already started stay on the version they started on, as with any publish. A retired flow and a run
  snapshot stay locked. A refused draft, save or publish shows as before and stops the sequence.
- CnFlowBoard and CnFlowEditorPage take `saveAsVersion` (manifest `config.saveAsVersion`), which sets the store option
  while the board is on screen and clears it when it leaves.
- `metaParts` (manifest `config.metaParts`) picks which of trigger, step count and version the path names, and
  `metaNote` (`config.metaNote`) closes it with a note.

## Reach

Flow pages that set these keys. Others are unchanged: the published-is-read-only lock and its notice stay the default.
Stacked on flow-board-node-card. No schema change.
