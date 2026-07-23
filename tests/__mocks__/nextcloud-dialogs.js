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
 * `showSuccess` / `showError` are the toast helpers used across `src/`.
 * `getFilePickerBuilder` / `FilePickerType` are used by `CnRelatedFiles`; the
 * default builder here resolves `pick()` to an empty string so a barrel import
 * never explodes — specs that assert on picked paths override this module with
 * their own `jest.mock('@nextcloud/dialogs', …)`.
 */

const showSuccess = jest.fn()
const showError = jest.fn()

const FilePickerType = { Choose: 1, Move: 2, Copy: 3, MoveCopy: 4, Custom: 5 }

const getFilePickerBuilder = jest.fn(() => {
	const builder = {}
	const chain = () => builder
	builder.setMultiSelect = chain
	builder.setMimeTypeFilter = chain
	builder.setModal = chain
	builder.setType = chain
	builder.allowDirectories = chain
	builder.build = () => ({ pick: jest.fn().mockResolvedValue('') })
	return builder
})

module.exports = {
	__esModule: true,
	showSuccess,
	showError,
	getFilePickerBuilder,
	FilePickerType,
}
