/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import {
	guardedToastUiEditorClass,
	guardToastUiEditor,
	sanitizeHtmlBlockLiteral,
	sanitizeHtmlInlineLiteral,
} from '@/utils/toastUiRawHtmlGuard.js'

describe('toastUiRawHtmlGuard', () => {
	describe('sanitizeHtmlBlockLiteral', () => {
		it('drops handlers and attribute-borne markup', () => {
			const out = sanitizeHtmlBlockLiteral('<div title="</style><img src=x onerror=alert(1)>" onclick="x()">t</div>')
			expect(out).toBe('<div>t</div>')
		})

		it('wraps a result that no longer starts with a tag', () => {
			expect(sanitizeHtmlBlockLiteral('<script>alert(1)</script>')).toBe('<div></div>')
			expect(sanitizeHtmlBlockLiteral('<form>text</form>')).toBe('<div>text</div>')
		})

		it('leaves a comment block, which Toast UI shows as text', () => {
			expect(sanitizeHtmlBlockLiteral('<!-- note -->')).toBe('<!-- note -->')
		})
	})

	describe('sanitizeHtmlInlineLiteral', () => {
		it('keeps only the sanitised opening tag', () => {
			expect(sanitizeHtmlInlineLiteral('<img src=x onerror=alert(1)>')).toBe('<img src="x">')
			expect(sanitizeHtmlInlineLiteral('<a href="javascript:alert(1)" title="t">')).toBe('<a title="t">')
		})

		it('turns a removed tag into an inert one', () => {
			expect(sanitizeHtmlInlineLiteral('<input onfocus=alert(1) autofocus>')).toBe('<span>')
		})

		it('normalises a closing tag', () => {
			expect(sanitizeHtmlInlineLiteral('</b >')).toBe('</b>')
		})

		it('leaves a literal that is not a tag', () => {
			expect(sanitizeHtmlInlineLiteral('<!-- c -->')).toBe('<!-- c -->')
		})
	})

	describe('guardToastUiEditor', () => {
		it('ignores objects without Toast UI internals', () => {
			const plain = {}
			expect(guardToastUiEditor(plain)).toBe(plain)
			expect(guardToastUiEditor(null)).toBeNull()
		})

		it('restores the node literal after converting', () => {
			const seen = []
			const editor = {
				convertor: { toWwConvertors: { htmlBlock: (state, node) => seen.push(node.literal), htmlInline: () => {} } },
				wwEditor: { view: { props: {}, setProps(props) { this.props = { ...this.props, ...props } } } },
			}
			guardToastUiEditor(editor)
			guardToastUiEditor(editor)
			const node = { literal: '<p onclick="x()">a</p>' }
			editor.convertor.toWwConvertors.htmlBlock({}, node, {})
			expect(seen).toEqual(['<p>a</p>'])
			expect(node.literal).toBe('<p onclick="x()">a</p>')
		})
	})

	describe('guardedToastUiEditorClass', () => {
		it('sanitises setHTML input', () => {
			class Base {
				setHTML(html) {
					this.html = html
				}
			}
			const editor = new (guardedToastUiEditorClass(Base))()
			editor.setHTML('<img src=x onerror=alert(1)>')
			expect(editor.html).toBe('<img src="x">')
		})
	})
})
