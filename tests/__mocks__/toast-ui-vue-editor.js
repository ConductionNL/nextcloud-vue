/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Jest mock for @toast-ui/vue-editor — a lightweight stub Editor component that
 * renders a div and exposes an `invoke()` method returning a canned markdown
 * string, so CnMarkdownEditor's WYSIWYG path can be tested without the real
 * ~200 KB editor.
 */

export const Editor = {
	name: 'ToastuiEditorMock',
	props: ['initialValue', 'options', 'initialEditType', 'previewStyle', 'height'],
	methods: {
		invoke(method) {
			if (method === 'getMarkdown') {
				return this._markdown != null ? this._markdown : (this.initialValue || '')
			}
			if (method === 'getHTML') {
				return `<p>${this._markdown != null ? this._markdown : (this.initialValue || '')}</p>`
			}
			return ''
		},
		__setMarkdown(md) {
			this._markdown = md
			this.$emit('change')
		},
	},
	render(h) {
		return h('div', { class: 'toastui-editor-mock' })
	},
}

export default { Editor }
