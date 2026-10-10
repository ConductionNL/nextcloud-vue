# Tasks: one-follow-control

- [x] 1. `CnFollowToggle`: notifications switch bound to `notify` (`@self.watchNotify`), `compact` mode, eye icon for Follow. Test: `tests/components/CnFollowToggle.spec.js`.
- [x] 2. `setWatching()` and the store's `watch()` take `{ notify }`; favourite helpers deprecated. Test: `tests/store/interactions.spec.js`.
- [x] 3. `CnDetailPage` renders only `CnFollowToggle`; `favourite` prop deprecated. Test: `tests/components/CnDetailPageFavouriteFollow.spec.js`.
- [x] 4. `CnIndexPage` `showFollowColumn`, `showFavouriteColumn` as its alias; `personalLenses` folds `favourite` into Following. Test: `tests/components/CnIndexPagePersonalLenses.spec.js`.
- [x] 5. Manifest schema: `showFollowColumn`, deprecated `favourite` and `showFavouriteColumn`. Test: `tests/schemas/app-manifest-v2.favouriteFollow.spec.js`.
- [x] 6. l10n en and nl for the switch; docs for `CnFollowToggle`, `CnFavouriteToggle`, `CnIndexPage`.
