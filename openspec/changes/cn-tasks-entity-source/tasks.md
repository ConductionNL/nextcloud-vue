# Tasks: cn-tasks-entity-source

## 1. The tasks source

- [ ] 1.1 `useTaskInboxStore` (internal): one `load(config)` against
      `GET /apps/openregister/api/flow-tasks`, param allowlist (`scope`,
      `state`, `priority`, `overdue`, `objectUuid`, `sort`, `limit`,
      `offset`), defaults `scope=assigned`, `sort=-dueAt`; rows, total,
      loading, error kept reactively.
- [ ] 1.2 `tasks` in `indexSources.js`: row mapping (`id`, `title`,
      `subjectLabel`, `stateLabel`, `priorityLabel`, `dueLabel` with overdue
      wording), badge columns keyed on the shown labels, quick filters,
      `openRow` to the deep link, `showAdd: false`.

## 2. Named-source page hooks

- [ ] 2.1 `useNamedSource` quick-filter wiring: effective tabs (manifest
      wins), default tab seeded before mount, ONE load on mount with the
      tab filter merged over `sourceConfig`, reload on tab change.
- [ ] 2.2 `CnIndexPage`: tab strip renders source tabs when the manifest
      declares none; `openRow` wins over `detailRoute` on row click;
      `showAdd: false` from the source suppresses the Add button.
- [ ] 2.3 `CnPageRenderer`: `sourceConfig` defaults to the resolved page
      config for `entitySource` pages; explicit `sourceConfig` wins.

## 3. The widget

- [ ] 3.1 `CnTasksWidget`: endpoint binding (`isTerminal=false`, scope,
      due-date sort), count from the server total, capped rows, remainder,
      three distinct states, polling + visibilitychange, overdue by wording
      and shape.
- [ ] 3.2 Quick actions: claim on pooled rows, complete (per outcome when
      declared) on own rows, refusals as toasts with the server's message,
      refetch after every verb.
- [ ] 3.3 `CnTasksWidgetForm` + registration: type key `tasks`, defaults,
      `CONTENT_ONLY_TYPES`, `registerDashboardWidgets`, barrel exports.

## 4. Schema, l10n, docs

- [ ] 4.1 `entitySource` enum gains `tasks` in
      `src/schemas/app-manifest-v2.schema.json` (+ schema spec test).
- [ ] 4.2 New strings in `l10n/en.json` and `l10n/nl.json`.
- [ ] 4.3 `docs/components/cn-tasks-widget.md`, `cn-tasks-widget-form.md`;
      `cn-index-page.md` and `CnIndexPage.md` named-source sections updated;
      generated partials regenerated.
- [ ] 4.4 Hydra-gates canonical schema
      (`ConductionNL/.github` `hydra-gates/scripts/schemas/app-manifest-v2.schema.json`,
      JSON path `$.$defs.page.properties.config.properties.entitySource.enum`)
      gains `"tasks"` in its own PR. Tracked here; not in this repo.

## 5. Tests

- [ ] 5.1 Unit: source registration, request params and allowlist, row
      mapping, columns, quick-filter reloads and the single mount load,
      openRow, renderer `sourceConfig` bridge, schema enum.
- [ ] 5.2 Unit: widget states, honest count and remainder, polling, per-row
      action visibility, claim/complete posts, refusal toast wording, form
      round-trip.
- [ ] 5.3 Playwright (offline harness): inbox rows via the index page, pool
      tab reload, no Add button, widget total, claim posts and refreshes,
      refused claim shows the server's message.

## 6. Verification

- [ ] 6.1 `npm test`, `npm run lint`, `npm run stylelint`,
      `npm run check:docs`, `npm run check:jsdoc` all green.
- [ ] 6.2 Live verification against a running openregister. Not possible
      from this standalone clone; left unticked on purpose.

## Acceptance criteria

- `{ "type": "index", "config": { "entitySource": "tasks" } }` renders the
  viewer's inbox with columns, tabs, deep-link rows and no Add button.
- A `tasks` widget placement shows open tasks with an honest count and
  working claim/complete, refusals surfaced in the server's words.
- The `flows` source behaves byte-identically to before.

## Quality checklist

- JSDoc on every new prop, event and slot; `@spec` anchors point here.
- Strings through `t()`, sentence case, no em-dashes; Dutch catalogue in
  sync.
