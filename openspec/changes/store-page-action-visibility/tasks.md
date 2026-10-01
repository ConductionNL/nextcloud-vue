# Tasks: store-page-action-visibility

## 1. Component

- [x] 1.1 Add `canInstall`, `canPublish` (`Boolean`, default `null`) and `publishRoute` (`String|Object`, default `''`) props with JSDoc; rename the `canInstall` computed to `showInstall` (null falls back to `getCurrentUser()?.isAdmin === true`). Verify: `npx eslint src/components/CnStorePage/CnStorePage.vue` exits 0.
  - spec_ref: `specs/store-page/spec.md#requirement-req-stp-1-the-consuming-app-decides-who-sees-install`
  - files_likely_affected: `src/components/CnStorePage/CnStorePage.vue`
- [x] 1.2 Add `showPublish` and `publishTarget` computeds and a header Publish `NcButton` that calls `this.$router.push(publishTarget)`; string route means route name. Verify: the Publish tests in 2.1 pass.
  - spec_ref: `specs/store-page/spec.md#requirement-req-stp-2-the-consuming-app-decides-who-sees-publish-and-where-it-leads`
  - files_likely_affected: `src/components/CnStorePage/CnStorePage.vue`

## 2. Tests

- [x] 2.1 Extend `tests/components/CnStorePage.spec.js`: Install shown for a non-admin with `canInstall: true`, hidden for an admin with `canInstall: false`, admin default kept when absent; Publish shown only with a route and permission, admin fallback, navigation by name and by location, no button without a route; install URL unchanged for an allowed non-admin. Verify: `npx jest tests/components/CnStorePage.spec.js` passes.
  - spec_ref: `specs/store-page/spec.md` (all three requirements)
  - files_likely_affected: `tests/components/CnStorePage.spec.js`

## 3. Docs and copy

- [x] 3.1 Write `docs/components/cn-store-page.md` (props table including the three new props, the manifest example, and the note that visibility is not authorization), regenerate `docs/components/_generated/CnStorePage.md` with the repo's vue-docgen config, add the Dutch value for "Publish" to `l10n/nl.json`. Verify: `node scripts/check-docs.js` exits 0 and a second generator run leaves `git diff docs/components/_generated/` unchanged.
  - Done: "Publish" already carries "Publiceren" in `l10n/nl.json`, so the catalogue needed no edit. Generator: vue-docgen-cli 4.79.0 (the locked version), control run on the unchanged tree reproduced every tracked file.
  - spec_ref: `specs/store-page/spec.md#requirement-req-stp-3-visibility-is-presentation-not-authorization`
  - files_likely_affected: `docs/components/cn-store-page.md`, `docs/components/_generated/CnStorePage.md`, `l10n/nl.json`

## 4. Verification

- [x] 4.1 Before push, once: `npm run lint`, `npm test` (full jest suite), `npm run build`, `node scripts/check-docs.js`, all through `with-slot.sh`; record each exit code in the PR body.
