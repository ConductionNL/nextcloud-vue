---
kind: code
---

# Proposal: workspace-saved-views

## Summary

Pipelinq's My work (board PqMijnWerk) is a dashboard page whose filters are workspace keys written by a
`workspace-filter` bar: the lens chips, Show completed, priority, pipeline and whose work. Its "Saved views" card must
save those filters as OpenRegister saved views, list them with how many items each holds ("Mine, all statuses (9)"),
apply one, and delete one (pipelinq `my-work-saved-views-and-phone` REQ-MW-150). The `saved-views` widget only lists the
views of an index page as links; an index page saves views, a dashboard page cannot.

The `saved-views` widget gets a workspace mode (`content.workspace`): it saves the page's current workspace values under
the page's `scope`, applies a view by writing its values back into the workspace, deletes an own view after a
confirmation, and counts each view through an endpoint with the view's values in its `@workspace` tokens.

## Scope

`CnSavedViewsWidget` (workspace mode, opt-in through `content.workspace.keys`), its test, its docs, two Dutch strings.
No schema change: widget content is not described in the manifest schema. Without `workspace` the widget is unchanged.
