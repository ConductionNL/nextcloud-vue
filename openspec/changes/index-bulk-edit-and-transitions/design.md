# Design: index-bulk-edit-and-transitions

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `CnIndexPage` accepts `bulkActions` (`src/components/CnIndexPage/CnIndexPage.vue:2476`),
  validates them in `mergedBulkActions()` (`:2769`) and dispatches a click
  with the selection in `onBulkAction()` (`:4709`). A handler is a function,
  `open-modal`, a registry name, or nothing (emit only). The selection is
  passed, never looked up.
- `CnActionsBar` renders the declared entries in the contextual selection
  strip (`src/components/CnActionsBar/CnActionsBar.vue:294-307`) beside the
  built-in Copy and Delete (`showMassCopy` `:1680`, `showMassDelete`
  `:1686` in `CnIndexPage`).
- `useLifecycleTransitions` (`src/composables/useLifecycleTransitions.js`)
  speaks OpenRegister's lifecycle contract for one object:
  `GET /api/objects/{id}/available-actions` and
  `POST /api/objects/{id}/transition`. `CnLifecycleActions` renders it on a
  detail page.
- OpenRegister's bulk job: `GET /api/bulk-actions` describes the registered
  actions with their guards and reversal window
  (`lib/Service/BulkActionRegistry.php:153` `describe()`);
  `POST /api/bulk-jobs` rehearses an action over a selection and writes
  nothing (`lib/Controller/BulkJobsController.php:204` `create()`);
  `/commit`, `/cancel`, `/members` and `/download` follow
  (`appinfo/routes.php:1293-1307`). The registry holds `ApplyRuleAction` and
  `ExportWholeSetAction` today.

Nothing on the library side creates a bulk job. No library component reads
the job envelope.

## Decisions

### D1. Two built-in actions, declared per page

```json
"config": {
  "bulkEdit": { "fields": ["status", "owner", "theme"] },
  "bulkTransitions": true
}
```

`bulkEdit.fields` names the properties a user may change in bulk. The
list is the page's to give, not the schema's: a schema with forty
properties does not want all forty on a bulk dialog, and a field that is
safe to set per row (an identifier, a date of birth) is rarely safe to set
on forty. Absent, the action is not offered.

`bulkTransitions: true` offers the lifecycle actions. The action list is
never declared on the page; it comes from the rows (D3).

Rejected: one generic "Edit" that opens the full edit form over the
selection. A form built for one record shows forty fields, and blank
means "leave alone" in some fields and "clear" in others. One field and
one value is the shape NocoBase's bulk update and Power Apps' bulk edit
both converge on.

### D2. Every bulk act is an OpenRegister job, never a client loop

The dialog creates a job with `action: "set-field"` or
`action: "transition"`, the selection as ids, and the parameters. The job
is previewed first; the dialog shows the counts and the skip reasons from
the preview, and only a second click commits it.

Rejected: looping `saveObject()` or `transition` per row in the browser,
which is what `handleMassCopy` does today
(`src/components/CnIndexPage/selfModeActions.js:111`). A loop has no
preview, stops half way when the tab closes, and reports a failure as a
count with no row named. OpenRegister's proposal for the job was written
against exactly that loop.

### D3. Run a step offers what the selected rows allow

For the selection, the dialog asks `available-actions` per row (batched,
at most the page size) and offers the actions present on at least one
row. Each action shows how many selected rows allow it. A row where the
action is absent or `blocked` is reported in the preview as skipped, with
the `description` OpenRegister gives, never as applied.

Rejected: offering the schema's full lifecycle. A publish offered on
rows that are already published is a button that does nothing and says
it worked.

### D4. The value widget is the edit form's widget

**Change a field** renders the chosen property with the same field
component `CnFormDialog` would render for it, so an enum is a select, a
relation is a picker and a date is a date field. One value, applied to
all rows. An empty value is sent as `null` only when the user ticks
"clear this field"; an untouched empty input does not submit.

### D5. One outcome panel for every list

`CnBulkJobOutcome` renders a job envelope: the counts (applied, skipped,
refused), progress while it runs, and the per-row list with the reason,
each row linking to its record. The dialog embeds it for the preview and
for the result; a page can also mount it to show a running job after a
reload. It reads only the envelope OpenRegister returns, so dossiq and any
other list render the same panel.

### D6. Nothing is offered that the instance cannot run

On mount the page reads `GET /api/bulk-actions` once per session. An
action whose id is not in the answer is not offered, even when the page
declares it. The strip never shows a button that ends in a 400.

## Files

- `src/components/CnIndexPage/CnIndexPage.vue`: `bulkEdit`, `bulkTransitions`
  props, the two reserved ids, the dialog mount.
- `src/components/CnActionsBar/CnActionsBar.vue`: the two strip buttons.
- `src/components/CnBulkEditDialog/`: new, the field and step dialog.
- `src/components/CnBulkJobOutcome/`: new, the preview and result panel.
- `src/composables/useBulkJob.js`: new, create, commit, poll, cancel.
- `src/schemas/app-manifest-v2.schema.json`: the two config keys;
  regenerate validators with `scripts/build-validators.js`.

## Security

The job resolves access per object on preview and on commit (OpenRegister
ADR-005 reading in its proposal). The library adds no authority: an
object the user may not write is reported as refused by the server, and
the dialog shows that as refused, not as skipped.

## Theming

Counts use `--color-success-text`, `--color-warning-text` and
`--color-error-text`; everything else is the dialog's normal Nextcloud
styling.

## Risks

- [OpenRegister half not there yet] -> D6 hides both actions until the
  registry answers them; the page declares them without harm.
- [A selection larger than the job ceiling] -> OpenRegister refuses the
  job with its ceiling; the dialog shows that refusal as the error.
