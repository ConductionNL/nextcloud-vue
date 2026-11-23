---
kind: code
depends_on: []
---

# Proposal: index-bulk-edit-and-transitions

## Why

A user who selects forty rows on an index page can delete them or copy
them. They cannot set one field on all forty, and they cannot publish or
withdraw them together. Both are one action in the products we are
compared with, and both are asked for in two sibling matrices.

The selection strip on `CnIndexPage` already carries the selection to a
declared bulk action (`bulkActions`, `onBulkAction`), but every action
needs a handler the host writes. There is no built-in action that
changes a value or runs a lifecycle step, so each app would write the
same loop, one request per object, with no preview and no report of what
was skipped.

## Rows

This change covers two gap rows, both owned by nextcloud-vue.

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| opencatalogi | `pub-bulk` | Publish, withdraw or delete many publications in one action. | partial | built |
| buildiq | `data-bulk-edit` | Change or delete many records in one action. | partial | built |

The opencatalogi note reads: "Bulk delete works. No page offers bulk
publish or withdraw." The buildiq note reads: "bulk delete works out of
the box; bulk field-edit across a selection does not exist". Delete is
the half that is built. This change is the missing half: change a field,
and run a lifecycle step, across a selection.

`data-bulk-edit` sits in the `data` area, one of buildiq's core areas.

## Competitor evidence, quoted from the matrices

`pub-bulk` (opencatalogi matrix):

- CKAN, yes: "source read at ckan-2.12.0: /organization/bulk_process/<id>
  (ckan/views/group.py:1371, BulkProcessView :815) offers Make public,
  Make private and Delete on selected datasets
  (templates/organization/bulk_process.html:52-70)". The matrix records
  the ckan-2.12.0 source tree and a lab drive on 2026-09-26, no URL.
- DKAN, yes: "source read at 4.1.3: /admin/dkan/datasets ... carries a
  node bulk form with the actions archive_current, hide_current,
  node_delete_action and publish_latest". Source:
  https://git.drupalcode.org/project/dkan

`data-bulk-edit` (buildiq matrix):

- NocoBase, yes: "packages/plugins/@nocobase/plugin-action-bulk-update/src/client-v2/BulkUpdateActionModel.tsx:47
  Bulk update (selected or all, line 84) ... bulk edit form". Source:
  https://github.com/nocobase/nocobase
- Budibase, yes: "ClipboardHandler.svelte:39-48 multi-cell paste writes
  one value into all selected cells". Source:
  https://github.com/Budibase/budibase
- Microsoft Power Apps, yes: "Edit multiple rows (bulk edit) in
  model-driven apps", https://learn.microsoft.com/en-us/power-apps/user/edit-rows
- Appsmith and Mendix, partial: the builder has to model the bulk change
  behind a button.

Neither row carries a demand row. Both qualify through two or more
competitors rated yes.

## What changes

- Two built-in bulk actions on the selection strip of `CnIndexPage`,
  switched on per page: **Change a field** and **Run a step**.
- **Change a field** opens a dialog that offers the fields the page
  allows, takes one value with the same widget the edit form uses, and
  applies it to every selected row.
- **Run a step** offers the lifecycle actions that are available on the
  selected rows (publish, withdraw, archive, whatever the schema's
  lifecycle declares) and runs the chosen one on each of them.
- Both run as one OpenRegister bulk job: previewed first ("38 will
  change, 2 are skipped, here is why"), then committed, with progress and
  a per-row outcome the user can read after.
- A shared outcome panel, `CnBulkJobOutcome`, renders the preview and the
  result. OpenRegister's `bulk-action-jobs` change names it as the
  nextcloud-vue half ("one progress and outcome component for every list
  in the fleet, over the same envelope").

### Added 7 October 2026: select all matching

The strip offers "Select all N matching" once the whole page is selected,
and a job then carries the page's query as its selection instead of an id
list. Asked by OpenRegister's `tables-bulk-jobs-and-file-search` (row
`rec-bulk`, PR #4452); OpenRegister's bulk jobs already accept a query
selection. Rows unblocked: openregister `rec-bulk` (with Tasks 1 to 6).

## Affected projects

- `nextcloud-vue`: `CnIndexPage`, `CnActionsBar`, a new
  `CnBulkEditDialog`, a new `CnBulkJobOutcome`, a `useBulkJob`
  composable, the manifest v2 schema.
- `openregister`: two bulk actions registered in its `BulkActionRegistry`
  (see cross-project dependencies).
- Consumers: opencatalogi (Publications), buildiq (every built index
  page), dossiq, pipelinq, filinq and humaniq lists.

## Backward compatibility

Off by default. A page that declares neither `bulkEdit` nor
`bulkTransitions` renders exactly as before. The reserved ids of the
strip grow from `copy` and `delete` to also cover `edit-field` and
`run-step`; a host `bulkActions` entry already using either id is
dropped with the same warning the existing reserved ids give.

## Cross-project dependencies

- OpenRegister ships the job (`bulk-action-jobs`, routes
  `/api/bulk-actions` and `/api/bulk-jobs` at openregister
  `appinfo/routes.php:1293-1307` on development `555af72`). Its registry
  holds two actions today, `ApplyRuleAction` and `ExportWholeSetAction`.
  The OpenRegister half of this change is two more: `set-field` (one
  property, one value, validated per object like a save) and
  `transition` (one lifecycle action, guarded per object like
  `POST /api/objects/{id}/transition`). Listed for the openregister lane.
- Until those two exist, the strip does not offer either action: the
  component reads `GET /api/bulk-actions` and hides what the instance
  cannot run.

## Out of scope

- Editing different values per row in a grid. That is `CnDataMatrix`.
- A bulk action over every row matching the filter rather than the
  selection. The job's selection already allows it; the strip keeps to
  what the user ticked until a later change adds "all matching".
- Undo. OpenRegister's job carries a reversal window; the outcome panel
  shows it but this change adds no undo control.
