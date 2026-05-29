# Manifest `config.sidebarTabs[]` — typed + validated

## Why

The opencatalogi triage ([opencatalogi#636](https://codeberg.org/Conduction/opencatalogi/pulls/636)) flagged that 5 detail-page wrappers exist partly because the sidebar-tab declaration in their manifests is undocumented and unvalidated. Consumers can declare `config.sidebarTabs[]` on a `type:'detail'` page (the `liftSidebarTabWidgets` CLI transform expects exactly that shape), but the JSON Schema doesn't describe it and the runtime validator never catches typos.

Today:
- The CLI transform (`src/cli/transforms/liftSidebarTabWidgets.js`) lifts `config.sidebarTabs[]` into top-level `widgets[]` with `slot:"sidebar"` + `tabGroup`. The lift is a one-shot build-time conversion.
- The lifted widgets are what `CnDetailPage` actually renders at runtime — `sidebarTabs` itself never reaches the page component (the lift strips it, except for `component`-only tab entries that are preserved as residual).
- But consumer manifests carry `config.sidebarTabs[]` for documentation, as the source of truth for the human-authored tab list (the lifted `widgets[]` is verbose and grid-oriented).

Gap:
- Schema doesn't declare the typed shape, so editors give no completion.
- Validator never flags a tab entry missing `id` or `label` — silent ship-bug risk.
- `tabGroup` values in `widgets[]` are NOT cross-checked against the declared `sidebarTabs[]` — a typo in one of the two surfaces silently breaks the tab grouping.

## What changes

1. **Schema** — declare `config.sidebarTabs[]` as a typed array on `type:'detail'` pages. Each item: `id` (string, required), `label` (string, required), `icon` (string), `order` (number), `component` (string, optional registry reference for `component`-only tabs), `_note` (string).
2. **Validator** — `validateDetailSidebarTabs(cfg, …)` runs in the `case 'detail':` branch of `validateTypeConfig`. Errors:
   - `sidebarTabs` is set but not an array.
   - any entry missing `id` or `label`, or with non-string values.
   - duplicate `id` within the array.
3. **Cross-reference validator** — `validateSidebarTabGroupRefs(page, …)` runs alongside, checking that every `widgets[].tabGroup` value (on sidebar-slot widgets) matches a declared `sidebarTabs[].id`. Unmatched values trigger an explicit error (catches the silent typo case).
4. **Docs** — document the typed shape in `docs/components/cn-detail-page.md` and the migration guide, with the cross-reference rule called out.
5. **Tests** — validator coverage (omitted / empty / typed / missing fields / duplicate ids / unmatched tabGroup).

## Non-goals

- Direct-runtime accept of `sidebarTabs[]` in `CnDetailPage` (today consumers go through the CLI lift). Out-of-scope; tracked separately if it becomes a real blocker.
- Tab-content widgets — those already flow through the existing `widgets[]` validation path.

## Consumer impact

Unblocks opencatalogi: `CatalogDetailPageView`, `ThemeDetailPageView`, `GlossaryDetailPageView`, `PageDetailPageView`, `MenuDetailPageView` keep their sidebar-tab declarations declarative + safe-from-typos. Same for zaakafhandelapp's `ZaakDetail` (which already uses the pattern but unvalidated).

## References

- [nextcloud-vue#275](https://codeberg.org/Conduction/nextcloud-vue/issues/275) — tracking issue.
- `src/cli/transforms/liftSidebarTabWidgets.js` — the shape consumers actually author.
- [opencatalogi#636](https://codeberg.org/Conduction/opencatalogi/pulls/636) — consuming-app PR documenting the lib gap.
