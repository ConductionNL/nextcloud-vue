// Stub for `marked` in the styleguide sandbox.
//
// The real package uses syntax (optional chaining in node_modules) that
// webpack 4's parser can't handle without transpiling node_modules, and
// markdown rendering only matters in a live Nextcloud server (CnWikiPage).
// Components that import `{ marked }` only call `setOptions` at module init
// and `parse` on render — both are safe no-ops here.

export const marked = {
	setOptions() {},
	parse(text) {
		return typeof text === 'string' ? text : ''
	},
}

export default marked
