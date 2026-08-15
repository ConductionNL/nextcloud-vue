/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Jest mock for `@toast-ui/editor` — a lightweight stub of the editor CLASS,
 * so CnMarkdownEditor's WYSIWYG path can be tested without the real ~200 KB
 * editor (which also does not run cleanly in jsdom).
 *
 * The Vue-3 line drives Toast UI imperatively via `new Editor({ el, ... })`
 * rather than through the Vue-2-only `@toast-ui/vue-editor` wrapper, so this
 * mock models the constructor + instance API that CnMarkdownEditor actually
 * calls: `getMarkdown()`, `setMarkdown()` and `destroy()`, plus the
 * `events.change` callback used to drive v-model.
 *
 * Tests can reach the live instance through `Editor.lastInstance` and push a
 * change through `__setMarkdown()` to simulate user typing.
 */

export default class ToastuiEditorMock {

	constructor(options = {}) {
		this.options = options
		this.el = options.el
		this._markdown = options.initialValue || ''
		this.destroyed = false
		ToastuiEditorMock.lastInstance = this
	}

	getMarkdown() {
		return this._markdown
	}

	setMarkdown(markdown) {
		this._markdown = markdown || ''
	}

	getHTML() {
		return `<p>${this._markdown}</p>`
	}

	destroy() {
		this.destroyed = true
	}

	/**
	 * Test helper — simulate the user editing the document, firing the same
	 * `change` callback the real editor invokes.
	 *
	 * @param {string} markdown The new document contents.
	 * @return {void}
	 */
	__setMarkdown(markdown) {
		this._markdown = markdown
		const onChange = this.options && this.options.events && this.options.events.change
		if (typeof onChange === 'function') {
			onChange()
		}
	}

}
