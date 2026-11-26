# Proposal: dashboard-page-saved-views

## Why

Pipelinq's My work (board `PqMijnWerk`, REQ-MW-150 in pipelinq change
`my-work-saved-views-and-phone`) is a dashboard page whose bar writes its
filters (type, Show completed, priority, pipeline, scope) into the page
workspace. Saved views exist only on index pages (`CnIndexPage` owns them), so
the page cannot store or reapply that bar. The REQ forbids the app from keeping
its own store: the views must be OpenRegister saved views.

## What changes

- The `saved-views` widget gets a `workspace` mode (`content.workspace.keys`):
  it lists the reader's views saved on this page (`content.scope`) that store
  a workspace, applies one by writing its values back into the page workspace
  (and the address keys the page already carries), saves the current values
  under a name ("Save view"), and deletes the reader's own views after a
  confirmation. `content.workspace.count` (an endpoint with `@workspace.<key>`
  tokens filled from each view, its answer at `responsePath` counted) adds the
  item count to each row ("Urgent tickets (3)").
- A view stores the values under `query.workspace`; OpenRegister's views API
  keeps `query` verbatim, so no OpenRegister change is needed.
- The index-page mode of the widget is unchanged.
