## 1. Pure state-machine utility

- [x] 1.1 Add `src/utils/multiColumnSort.js` exporting `nextSortState(sortKeys, key, { append })`: plain click (single-sort collapse/cycle/clear), shift+click (append/cycle/remove, cap at 3).
- [x] 1.2 Unit tests `tests/utils/multiColumnSort.spec.js`: every transition (empty→single, cycle→clear, append to 2/3, cap at 4th, cycle a secondary key, cycle-remove the primary with promotion, plain-click collapse of an active multi-sort).

## 2. CnDataTable component

- [x] 2.1 Add `sortKeys: Array` prop (ordered `{key, order}` list); computed `effectiveSortKeys` falls back to the legacy `sortKey`/`sortOrder` props when `sortKeys` is empty — single-sort hosts are unaffected.
- [x] 2.2 Replace the header `@click` handler with one that reads `event.shiftKey` and calls `nextSortState`; wire `@keydown.enter`/`shift+enter` to the same handler (headers get `tabindex="0"`).
- [x] 2.3 Extend the `sort` event payload with a `keys` field (full ordered array); `key`/`order` continue to mirror the primary entry exactly as before.
- [x] 2.4 Render numbered priority badges (1–3) beside the arrow when `effectiveSortKeys.length > 1`.
- [x] 2.5 `aria-sort` on the primary key's header only; secondary/tertiary headers carry no `aria-sort`.

## 3. useListView composable

- [x] 3.1 Add a `sortKeys` ref (ordered array), kept in sync with the existing `sortKey`/`sortOrder` refs (primary mirror) so no external reader of the old refs breaks.
- [x] 3.2 Extend `onSort` to accept the extended `{key, order, keys}` payload; build `params._order` from `sortKeys` (`Object.fromEntries`) instead of a single-key literal — byte-identical output for a single key.
- [x] 3.3 Accept an optional `defaultSortKeys` init option (array) alongside the existing single-key `defaultSort`.
- [x] 3.4 Legacy `useLegacyListView` implementation left untouched (out of scope, different call sites).

## 4. CnIndexPage component

- [x] 4.1 Add `sortKeys: Array` prop (external/host-controlled mode, mirrors existing `sortKey`/`sortOrder`); `effectiveSortKeys` computed picks self-fetch (`list.sortKeys`) vs. external.
- [x] 4.2 Pass `:sort-keys="effectiveSortKeys"` to the internal `CnDataTable`.
- [x] 4.3 On `@sort`, in self-fetch mode: write `$route.query._order` (JSON array) via `$router.replace`, or delete the key when the sort clears.
- [x] 4.4 On mount (self-fetch mode), parse `$route.query._order` (JSON array of `{key, order}`) and seed `useSelfFetchList`'s `defaultSortKeys`.

## 5. Tests

- [x] 5.1 `tests/components/CnDataTableSort.spec.js`: plain click, shift+click append/cycle/cap, badge rendering, aria-sort placement, keyboard (Enter/Shift+Enter), emitted payload shape (single-sort regression: `{key, order}` unchanged).
- [x] 5.2 Extend `tests/composables/useListView.spec.js`: `_order` built from `sortKeys`, single-key parity with pre-change output.
- [x] 5.3 `tests/components/CnIndexPageMultiSort.spec.js`: route-query persistence (write + restore on mount), clearing removes the param.
- [x] 5.4 Full `npm test` — no regressions.

## 6. Verify

- [x] 6.1 `npm run build` compiles.
- [x] 6.2 `npm run lint` clean on new/changed files.
- [x] 6.3 `openspec validate multi-column-sort-ui --type change --strict` passes (if CLI available in this environment).

## 7. Documentation

- [x] 7.1 Update `CnDataTable.vue` and `CnIndexPage.vue` docblocks: document `sortKeys`, shift+click, and the extended `sort` payload.

## Acceptance Criteria

- Plain-click single-sort behavior is byte-identical to before (arrow, cycle, emitted `{key, order}`).
- Shift+click appends/cycles/removes a secondary or tertiary sort key, capped at 3.
- Numbered badges appear only when more than one key is active.
- Keyboard: Enter = click, Shift+Enter = append; `aria-sort` on the primary key only.
- `CnIndexPage` self-fetch mode builds `_order` matching OpenRegister's real format and persists it in the route query.
- All tests green; no regressions.

## Quality Checklist

- Backward compatible: no behavior change for existing single-sort consumers who don't shift+click.
- i18n keys English (badge/aria labels use `t('nextcloud-vue', ...)`).
- SPDX docblocks on new files.
- No sed/awk/scripted edits.
