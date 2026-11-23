# Proposal: record-source-verbs

## Why

dossiq's task page (DqTaak) draws the engine's lifecycle verbs in its header: Finish, Hand back or Pick up, and Cancel
behind the menu. A `type: "detail"` page on `entitySource: "tasks"` reads the task (tasks-record-source) but offers no
way to act on it, so the page cannot leave its custom view yet. `CnLifecycleActions` is no answer: it asks
`/api/objects/{uuid}/available-actions`, which 404s for a task.

## What changes

A record source may offer verbs: `verbs(record)` lists the verbs that apply to the record in its current state, and
`runVerb(id, verb, { url })` runs one and keeps the source's record in step. CnDetailPage draws a verb as a header
button, or as an Actions-menu entry when the source marks it `menu`, and shows a refusal with the server's own
message. `config.verbEndpoints` lets an app send one verb to a route of its own. The `tasks` source offers the
engine's claim, unclaim, complete and cancel.
