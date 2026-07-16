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

export default { Marked, marked, showSuccess, showError }
