# Tasks: CnDataMatrix

- [x] Component + index + barrels + jsdoc-baselines (1.0).
- [x] 14 tests (rendering, totals, edit lifecycle, coercion, read-only, aggregate modes, formatter).
- [x] Docs page.
- [x] openspec change docs.

## Follow-up

- [~] Cell selection (multi-cell drag) and copy-paste. [DEFERRED: clipboard contract + WCAG-AA keyboard equivalents merit a dedicated change; v1.0 ships single-cell edit only.]
- [~] Per-cell formatter slot. [DEFERRED: existing per-column `formatter` prop covers known consumers; scoped slot is a separate API addition.]
- [~] Sticky row header for scrolled grids. [DEFERRED: needs CSS `position: sticky` cross-browser audit + intersection-observer fallback; tracked as styling follow-up.]
