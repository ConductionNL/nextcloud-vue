# Tasks: dashboard-page-saved-views

- [x] 1. `savedViewHelpers`: `workspaceViewKeys`, `buildWorkspaceViewPayload` (every key, unset as ''), `extractViewWorkspace` (null for a view without a workspace); jest in `tests/utils/savedViewHelpers.spec.js`
- [x] 2. `CnSavedViewsWidget` `workspace` mode: list (scope + stores a workspace), counts through `workspace.count`, apply into the page workspace and the address, Save view, delete after confirmation; jest in `tests/components/CnSavedViewsWidget.workspace.spec.js`
- [x] 3. nl strings for the new texts
- [ ] 4. Live: pipelinq My work saves, applies and deletes a view (with pipelinq `my-work-saved-views-and-phone` 7.1, after the release)
