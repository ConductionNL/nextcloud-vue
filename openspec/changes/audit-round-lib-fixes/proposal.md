# audit-round-lib-fixes: fixes from the live pipelinq audit of 7 October 2026

## Why

The live audit of pipelinq on nextcloud-vue 2.69.0 found five library faults:

- C4: the corner X of the tour called `complete()`, and `CnAppRoot` then wiped the
  saved step, so a restart began at step 1. Ruben decided the X pauses and keeps
  progress; only finishing the last step completes the tour.
- D4: core autocomplete never returns the person searching, so a user picker could
  not assign a task to yourself, and your own uid resolved to the bare uid. After a
  clear and re-pick the chip could show the uid when the option carried only
  `displayName`.
- G2: `CnIndexPage` only showed header filters when a schema object had resolved,
  so manifest tables without one had sorting but no filters.
- F4: the "Install <app>" placeholder used NcEmptyContent (64px icon, name,
  description, button) in a two-row tile with `overflow: hidden`; the icon ran out
  at the top and the button at the bottom. NcEmptyContent also forces its svg to
  64px, so a shrunk icon box let the svg spill over the name.
- Option text broke mid-word ("Agricu lture"): NcSelect renders a label as two
  spans (NcEllipsisedOption) and the halves wrapped apart.

## What changes

1. `CnWalkthrough.close()` pauses (same as ESC and the dim). `cnReplayWalkthrough`
   continues a paused tour, else the saved step, else starts at step 1. "Start over"
   in the user settings still begins at step 1. A pause (X, ESC or the dim) is stored
   as `paused: true` with the step (`pause` now carries `{ tourId, stepId, index }`),
   and a paused tour stays hidden across page loads (`CnWalkthrough` `autoStart`
   prop, off while paused) until the user picks "Continue" (Ruben, 7 October 2026).
2. `searchNextcloudUsers` puts the signed-in user first when they match the search
   (`includeCurrentUser`, default true; mentions pass false). `resolveNextcloudUser`
   resolves your own uid to your display name. `CnFormDialog` caches `label` or
   `displayName` of a picked option, and resolves the name when neither is there.
3. `columnFilterDef` without a schema (or with a schema that has no `properties`)
   reads the column's hints: `fkResolve` gives a reference filter, `type`/`format`
   give number, date or yes/no, any other plain key a text filter on contains
   (`[like]`). Paths and metadata keys get none. `CnIndexPage` shows header
   filters on every self-fetching table, on any table with a schema, and on a
   host-fed table whose host listens for `filter-change`.
4. The dashboard's requires-app placeholder is two lines of text and the install
   button, centred with `safe center`, scrolling instead of clipping. The shared
   NcEmptyContent variant caps the icon svg at 32px.
5. `CnFormDialog` renders select, multiselect and tag options (and selections) as
   one plain label that wraps between words only. User pickers keep NcSelectUsers.

## Not in this change

- "Name is required" / "Title is required" on open: `CnFormDialog` validates on
  save only. The red errors in the audit come from pipelinq's own `ClientForm.vue`
  and `LeadForm.vue`.
- OpenRegister's schemas list sort: `SchemasIndex.vue` uses `CnIndexPage` in prop
  mode with `sortable: true` columns, but passes no `sortKey` and handles no `@sort`,
  so the header click is emitted and nothing sorts it.

## Impact

- `src/components/CnWalkthrough/CnWalkthrough.vue`, `src/components/CnAppRoot/CnAppRoot.vue`
- `src/utils/userAutocomplete.js`, `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/components/CnObjectSidebar/CnNotesTab.vue`
- `src/utils/columnFilters.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/css/dashboard.css`
- Behaviour change: the X no longer emits `complete`; hosts get `pause`.
