---
kind: code
---

# Proposal: offline-checklist-reads-sections-and-replays-to-an-endpoint

## Summary

The `field-inspection` leaf reads a checklist template as a flat `items[]`
with `questionId`, `text` and `type`, and it queues a finished run as an
object create on `resultSchema`. Both are fixed shapes. An app whose
template groups its items in sections, names them by `id` and `label`, or
stores a run as a completed task with a server-side check, cannot use the
leaf without a second, app-specific offline client.

dossiq is the first such app. Decision 175 moved its inspection runs onto
OpenRegister tasks: a run is created and completed through
`POST /api/vth/cases/{id}/inspection-result`, which checks required items
and the photo gate before it writes anything. Its one template schema keeps
items inside `sections[]`. The leaf still reads its old flat checklist and
writes to a `checklistResult` schema that is being retired.

This change makes both shapes configuration:

- the template is read through `normaliseChecklistTemplate`, driven by
  `sectionsField`, `itemKeyField`, `itemTextField`, `itemTypeField`,
  `itemTypeMap` and a photo gate (`photoRequiredField`, `photoRequiredValue`);
- a finished run becomes a queue operation through
  `buildChecklistSubmission`: the object create as before, or, with
  `resultEndpoint` set, one `submit` replayed as a POST to the app's own
  endpoint, with `{field}` placeholders filled from the planned item.

Every new key defaults to today's behaviour, so an app that sets none of
them sees no change.

## Consumer

dossiq, change `inspection-checklists-onto-task` task 4.2b (decision 156:
the dependency is built here, not parked).
