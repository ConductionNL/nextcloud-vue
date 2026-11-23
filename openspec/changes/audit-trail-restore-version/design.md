# Design: audit-trail-restore-version

Read at nextcloud-vue development `3e606bf10`, and OpenRegister
development as checked out for this pass
(`~/memcap-work/openspec-pass/nextcloud-vue/sib/openregister`).

## What is there

- `CnAuditTrailTab` fetches
  `/objects/{register}/{schema}/{objectId}/audit-trails` itself with
  `fetch` and `buildHeaders()` (`src/components/CnObjectSidebar/CnAuditTrailTab.vue:234-269`),
  lists entries newest first, and expands one at a time
  (`:41-97`, `toggleExpand` at `:276-278`). An expanded entry shows its
  action, user, date and changed fields. It has no action and no
  `objectData` prop (`:131-154`).
- `CnObjectSidebar` binds a tab widget with the shared tab props, the
  loaded record as `objectData`, and the widget's own `props`
  (`src/components/CnObjectSidebar/CnObjectSidebar.vue:940-949`), and
  maps `audit` and `audit-trail` to `CnAuditTrailTab` (`:253-258`). Its
  built-in audit tab passes no extra props (`:156-161`).
- `CnConfirmDialog` asks a yes or no question, emits `confirm`, and
  shows the outcome the parent hands to `setResult()`
  (`src/dialogs/CnConfirmDialog.vue:104-156`, `:162`, `:208`).
- `revertObject()` exists in the store's lifecycle plugin
  (`src/store/plugins/lifecycle.js:156-158`), but that plugin is opt-in:
  `createObjectStore` installs only live updates by default
  (`src/store/useObjectStore.js:1222-1228`).
- `lockHolder(object)` prints who holds a record's lock
  (`src/utils/objectLock.js:78`).
- `CnDetailPage` re-reads its record on the `cn:page:refresh` event-bus
  channel (`src/components/CnDetailPage/CnDetailPage.vue:2913-2914`,
  handler at `:3089`).
- `CnDetailPage` shows Edit without asking about the reader's rights:
  `canEditRecord` checks the toggle, the schema and the lock only
  (`CnDetailPage.vue:2189-2195`).

OpenRegister, read in the sibling checkout:

- `POST /api/objects/{register}/{schema}/{id}/revert`, named
  `revert#revert` (`appinfo/routes.php:1453`).
- `RevertController::revert()` takes `datetime`, `auditTrailId` or
  `version` (`lib/Controller/RevertController.php:86-91`) and answers 404,
  403 and 423 for a missing record, missing rights and a lock
  (`:114-119`).
- `RevertHandler::revert()` requires `update` permission
  (`lib/Service/Object/RevertHandler.php:148-158`) and refuses a record
  locked by someone else (`:163-167`).
- A single-record read writes `@self.actions`, the verbs this reader may
  take on the record (`lib/Controller/ObjectsController.php:3121-3125`,
  `:3177-3206`, via `PermissionHandler::permittedActionsFor()` at
  `lib/Service/Object/PermissionHandler.php:1148-1168`). An empty list
  means no rights; a missing key means the instance did not say.

## Decisions

### D1. The prop and where the button sits

`allowRestore: { type: Boolean, default: false }` and a new `objectData`
prop, which `CnObjectSidebar` already binds. With `allowRestore` on, an
expanded entry whose action is `create` or `update` shows an `NcButton`
"Restore this version" under its changes. A `read` or `delete` entry
changed nothing a restore could return to, so it gets no button.

buildiq writes the prop on its history tab's `audit` widget (its D1),
and `widgetBindings()` passes it through unchanged.

### D2. Who sees the button

The button is hidden when `objectData['@self'].actions` is an array
without `update`, and disabled with "Locked by Sanne" when
`resolveObjectLock(objectData)` says someone else holds the lock. When
`@self.actions` is missing, the button shows and the server decides.

buildiq's D3 says the button "follows the same signal as the page's Edit
action". That signal does not exist: `canEditRecord` never asks about
the reader's rights. `@self.actions` is the signal OpenRegister gives,
so this change uses it. The server's check stays the control; hiding the
button is a courtesy.

### D3. The call goes through the tab's own request path

On confirm, `useRestoreVersion` posts `{ auditTrailId: entry.id }` to
`generateUrl(`${apiBase}/objects/${register}/${schema}/${objectId}/revert`)`
with `buildHeaders()`, the same way the tab already reads its entries.

Rejected: calling `store.revertObject()`. The lifecycle plugin is
opt-in, so on most stores the action does not exist.

### D4. The confirmation

`CnConfirmDialog` with the title "Restore this version?" and the
message: "The record gets the values it had after the change of {date}
by {user}. This is saved as a new version. Nothing in the history is
removed. Records that point at this one do not change." Confirm reads
"Restore", with the primary variant.

### D5. After the answer

- 200: `setResult({ success: true })` with "Record restored.", then the
  tab reloads its list from page one, emits `restored` with the returned
  record, and emits `cn:page:refresh`, so the detail page re-reads the
  record once.
- 403: "You cannot restore this record."
- 423: the tab reloads the record and shows "This record is locked by
  {name}." with `lockHolder()`, or "This record is locked by someone
  else." when no name is there.
- 404: "This record no longer exists."
- Anything else, or no answer: "The record could not be restored."

The sentences are fixed. OpenRegister returns its exception message in
the body for 403, 423 and 500 (`RevertController.php:116-121`), which is
English only and, for 500, an internal detail (ADR-005). The tab never
shows it.

## Files

- `src/components/CnObjectSidebar/CnAuditTrailTab.vue`: the props, the
  button, the dialog, the reload.
- `src/composables/useRestoreVersion.js`: new, the request and the
  status-to-sentence mapping, reusable by `CnVersionHistory` later.
- `src/composables/index.js`: export.

## Security

The server decides (RevertHandler: update permission, then lock). The
tab sends only the entry id; OpenRegister derives the user from the
session. The button's visibility is never the control.

## Accessibility

The button has the text "Restore this version" and, per entry, an
`aria-label` naming the entry's date. The dialog is an `NcDialog`, so
focus moves into it and back to the button on close. The result sentence
is shown in the dialog's result phase, which a screen reader announces.
