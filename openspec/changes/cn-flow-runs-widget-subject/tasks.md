# Tasks: cn-flow-runs-widget-subject

## 1. Subject scoping

- [x] 1.1 `content.subject` rides on the active request as `subject`; a second
      `useEndpointSource` binding reads `flow-runs/completed` with the same
      subject and limit, and stays a null config (never queries) without one.
- [x] 1.2 Object-context binding: `cnObjectContext` / `cnDetailObjectContext`
      injected and merged with `resolveObjectTokenContext`, handed to both
      bindings as `ctx`, so `@objectId` / `@object.<field>` resolve through
      the endpoint engine's own token grammar.
- [x] 1.3 `resolvedSubject` / `subjectPending`: an unresolved token renders the
      loading state, never an empty claim.

## 2. History rendering

- [x] 2.1 Terminal status labels (`completed`, `stopped`, `failed`,
      `dead_letter`) and the `TERMINAL_STATUSES` set.
- [x] 2.2 The "Earlier runs" section: hollow dot, muted name, `--terminal`
      modifiers on row and dot, honest "+N earlier" remainder, one quiet
      history error line that keeps the live rows.
- [x] 2.3 Two empty states: "No flows have run yet" vs the existing
      nothing-running line above a populated history.

## 3. The run deep link

- [x] 3.1 `content.runRoute`: a row with a uuid opens it with the run uuid as
      `id`; no route or no uuid falls back to `rowRoute` + flow id unchanged.
      `isLinked` is true when either route is configured.

## 4. Polling

- [x] 4.1 `refetchAll()` on every tick and on tab return; the completed read
      joins only while a subject is configured.

## 5. Form and registry

- [x] 5.1 `CnFlowRunsWidgetForm` gains `subject` (placeholder `@objectId`) and
      `runRoute` fields; `assembledContent` carries both.
- [x] 5.2 Registry `defaultContent` carries `runRoute: ''` and `subject: ''`.

## 6. Docs

- [x] 6.1 `docs/components/cn-flow-runs-widget.md` and
      `cn-flow-runs-widget-form.md`: content shape, the two options, the
      binding, the empty states, the dependency on the openregister change.
- [x] 6.2 Generated partials regenerated (`docs/components/_generated/`).

## 7. Tests

- [x] 7.1 `tests/components/CnFlowRunsWidgetSubject.spec.js`: request params
      with and without a subject; the ctx handed to both reads; token pending
      vs resolved; history rendering, remainder, failed label, error line;
      both empty states; run deep link, fallback, history rows, inert; both
      reads polled with a subject, one without.
- [x] 7.2 The existing `CnFlowRunsWidget.spec.js` passes unmodified.
- [ ] 7.3 Playwright coverage for the two `@e2e` scenarios (the case detail
      widget lists only the case's own runs; a finished flow appears in the
      case detail's run history). Blocked on the openregister implementation
      of `flow-runs-subject-scope`: both need the server-side reads to exist.

## Acceptance criteria

- With `subject`, the active request carries it and a completed-runs request
  is issued for the same subject; without it, the widget's request is
  byte-identical to today's and no second request exists.
- `subject: '@objectId'` on a detail page resolves to the page's object id
  through the injected context; unresolved shows the loading state.
- Finished runs render under "Earlier runs" with a hollow dot, a muted name
  and the status word; the remainder comes from the completed total.
- "No flows have run yet" and "No flows are running" are different lines in
  different states.
- `runRoute` opens the run uuid; `rowRoute` with the flow id is the fallback.
- `npm test`, `npm run lint`, `npm run check:docs`, `npm run check:jsdoc` pass.

## Quality checklist

- JSDoc on every new content option, computed and method; `@spec` anchors on
  both components point at this change.
- User-facing strings through `tr()` / `t()`, sentence case, no em-dashes.
- No edits outside the widget pair, its registry entry, docs and tests.
