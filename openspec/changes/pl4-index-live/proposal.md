# pl4-index-live

## Why

pipelinq's pipeline board follows live changes: when a colleague moves a lead, the card moves on everyone's board.
The board becomes an index page's board view, which read its list only on load and refresh.

## What changes

- CnIndexPage takes `live` (`config.live`): object types it subscribes to through the object store's live updates; a
  change reads the list again after half a second of quiet. It unsubscribes when the page leaves.
- Manifest schema 2.140.0 takes `config.live` (the integrator renumbers).

## Fleet reuse

- pipelinq's pipeline board; dossiq's team queue; any shared work list.
