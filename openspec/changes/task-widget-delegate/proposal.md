---
kind: code
---

# Proposal: task-widget-delegate

## Summary

OpenRegister's task engine has a `delegate` verb (`POST /api/flow-tasks/{uuid}/delegate`
with `delegate` and `mandate`): the task goes to a colleague, the original
performer is recorded as `onBehalfOf` and the mandate is kept with the task.
The shared `tasks` widget offers claim, complete and cancel but not this verb,
so an app that shows approval steps through the widget cannot let an approver
hand a step over. shillinq's `purchasing-approval-delegation` (task 2.1) needs
it on the purchase order's Approval tab.

This change adds an opt-in `content.delegate` key: the viewer's own open task
offers "Hand to a colleague", a dialog asks for the colleague and the mandate,
and a delegated task shows "on behalf of" the original performer. Without the
key nothing changes.

## Consumers

- shillinq `purchasing-approval-delegation` 2.1 (purchase order and supplier invoice approval tabs).
