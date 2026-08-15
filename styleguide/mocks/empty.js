// Catch-all stub for modules that only matter at runtime in a real Nextcloud
// server (aliased in styleguide.config.js for both `marked` and
// `@nextcloud/dialogs`). The styleguide just needs components to mount.
//
// `marked` — cnRenderMarkdown / CnTextWidget use `new Marked()`; markdown only
// renders inside CnWikiPage / CnChatPage / dashboard cells at runtime.
export class Marked {
	constructor() {}
	parse(src) { return src || '' }
	use() {}
}
export function marked(src) { return src || '' }

// `@nextcloud/dialogs` — toast helpers fire on user actions (e.g. re-import in
// CnAdminSettingsShell), never at module-init, so no-ops keep the build clean.
export function showSuccess() {}
export function showError() {}

// `@nextcloud/dialogs` file-picker surface — CnFilesWidgetForm and CnRelatedFiles
// import these statically. They only fire when the user opens the picker, never
// at module load, so an inert chainable builder satisfies the named imports
// without pulling the real picker (and its unresolvable subpaths) into the sandbox.
export class FilePickerClosed extends Error {}
export const FilePickerType = { Choose: 1, Move: 2, Copy: 3, CopyMove: 4, Custom: 5 }
export function getFilePickerBuilder() {
	const builder = {
		setMultiSelect: () => builder,
		setMimeTypeFilter: () => builder,
		allowDirectories: () => builder,
		startAt: () => builder,
		setType: () => builder,
		addButton: () => builder,
		build: () => ({ pickNodes: () => Promise.reject(new FilePickerClosed()) }),
	}
	return builder
}

// `@nextcloud/password-confirmation` — useAppInstaller calls these lazily when
// enabling an app against a real Nextcloud server, never at module load. Inert
// stubs (mirroring the real signatures) satisfy the named imports so the module
// builds without warnings. Values are unused in the sandbox.
export function addPasswordConfirmationInterceptors() {}
export function confirmPassword() { return Promise.resolve() }
export const PwdConfirmationMode = { Lax: 'lax', Strict: 'strict' }

export default {
	Marked, marked, showSuccess, showError,
	FilePickerClosed, FilePickerType, getFilePickerBuilder,
	addPasswordConfirmationInterceptors, confirmPassword, PwdConfirmationMode,
}
