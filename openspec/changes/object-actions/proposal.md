# A page offers the actions OpenRegister lists for an object

## Why
OpenRegister now lists and runs declared object actions (`object-actions-declared-and-run`, D-5:
`GET/POST /api/objects/{register}/{schema}/{id}/actions[/{action}]`) and asks the library for the rendering half
(task 5.2), which dossiq, pipelinq and learniq then adopt in place of bespoke action routes (tasks 5.3 to 5.5).

## What changes
- `useObjectActions` (with `fetchObjectActions`, `runObjectAction`, `actionLabelText`).
- The manifest action type `object-action` (`action`, fixed `inputs`) in the shared dispatcher.
- CnDetailPage `actionsFrom: "openregister"` (+ `actionsInclude`): the record's header-surface actions in the Actions
  menu; CnActionButtons opens a dialog over an action's input schema and draws an unavailable action disabled with
  the server's reason.
- Manifest schema: `object-action` in the action type enum, `action` and `inputs` on `$defs/actionFields`.
- Not yet: the row menu and bulk bar (`actionsFrom` on index pages) and CnMacrosWidget as a view over the same list.
