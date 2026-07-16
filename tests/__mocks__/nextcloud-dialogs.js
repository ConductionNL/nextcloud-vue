/**
 * Jest stub for `@nextcloud/dialogs`.
 *
 * The real package's CJS build requires `@nextcloud/paths`, which ships
 * ESM-only (`exports: { import: "./dist/index.mjs" }`, no `require`
 * condition) — Jest's CJS resolver cannot load it, so any test that pulls in
 * a component importing `@nextcloud/dialogs` (transitively, e.g. via the
 * library barrel `src/index.js`) fails with a "Cannot find module
 * '@nextcloud/paths'" resolution error, not a real assertion failure.
 *
 * Only `showSuccess` / `showError` are used anywhere in `src/`, so the stub
 * covers just those two toast helpers.
 */

const showSuccess = jest.fn()
const showError = jest.fn()

module.exports = {
	__esModule: true,
	showSuccess,
	showError,
}
