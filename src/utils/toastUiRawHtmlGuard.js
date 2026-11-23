/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Runs every raw HTML string that `@toast-ui/editor` turns into DOM through
 * DOMPurify 3 (`toastUiSanitizer`) first.
 *
 * `customHTMLSanitizer` covers the preview and the HTML renderer only. When
 * the WYSIWYG editor converts markdown (initial value, `setMarkdown`, a mode
 * switch, `getHTML`), its raw HTML block and inline converters call the
 * DOMPurify 2.3.3 copy inlined in the package and write the result into a
 * `div` of the live document with `innerHTML`. The package is unmaintained,
 * so no release fixes that, and patching the bundle would only hold where
 * the patch is applied: each consuming app resolves and bundles
 * `@toast-ui/editor` itself. This guard works on the editor instance, so it
 * travels with CnMarkdownEditor into every app.
 *
 * What it changes, per instance:
 * - the `htmlBlock` and `htmlInline` converters see the node's literal
 *   sanitised by DOMPurify 3 (restored afterwards, so the markdown source and
 *   its syntax tree stay untouched);
 * - pasted HTML is sanitised after Toast UI's own clean-up and before
 *   ProseMirror parses it;
 * - `setHTML` sanitises its argument.
 * DOMPurify 2.3.3 still runs inside Toast UI, but only on output DOMPurify 3
 * already produced.
 *
 * @module utils/toastUiRawHtmlGuard
 */

import { toastUiSanitizer } from './toastUiSanitizer.js'

// Toast UI's own tag grammar (`reHTMLTag`): its converters read the tag name
// with it and throw when a literal does not start with a tag.
const TAG_NAME = '[A-Za-z][A-Za-z0-9-]*'
const ATTRIBUTE = '(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"\'=<>`\\x00-\\x20]+|\'[^\']*\'|"[^"]*"))?)'
const OPEN_TAG = new RegExp(`^<(${TAG_NAME})${ATTRIBUTE}*\\s*/?>`, 'i')
const CLOSE_TAG = new RegExp(`^</(${TAG_NAME})\\s*>`, 'i')
// Toast UI renders a block holding a comment as plain text.
const HTML_COMMENT = /<! ---->|<!--(?:-?[^>-])(?:-?[^-])*-->/

// An opening tag no Toast UI converter or schema mark handles: converting it
// adds nothing, which is what the sanitiser asked for.
const INERT_OPEN_TAG = '<span>'

const GUARDED = Symbol('cnToastUiRawHtmlGuard')

/**
 * The literal of a raw HTML block, sanitised.
 *
 * @param {string} literal The block's source HTML.
 * @return {string} HTML that starts with a tag, as Toast UI requires.
 */
export function sanitizeHtmlBlockLiteral(literal) {
	if (HTML_COMMENT.test(literal)) {
		return literal
	}
	const clean = toastUiSanitizer(literal)
	return OPEN_TAG.test(clean) ? clean : `<div>${clean}</div>`
}

/**
 * The literal of one raw inline HTML tag, sanitised.
 *
 * @param {string} literal The tag's source, e.g. `<img src=x>` or `</b>`.
 * @return {string} The sanitised tag.
 */
export function sanitizeHtmlInlineLiteral(literal) {
	const close = CLOSE_TAG.exec(literal)
	if (close) {
		return `</${close[1]}>`
	}
	if (!OPEN_TAG.test(literal)) {
		return literal
	}
	const open = OPEN_TAG.exec(toastUiSanitizer(literal))
	return open ? open[0] : INERT_OPEN_TAG
}

/**
 * Wrap one markdown-to-WYSIWYG converter so it reads a sanitised literal.
 *
 * @param {object} convertors The instance's `toWwConvertors` map.
 * @param {string} type `htmlBlock` or `htmlInline`.
 * @param {(literal: string) => string} sanitize Literal sanitiser for that type.
 * @return {void}
 */
function wrapConvertor(convertors, type, sanitize) {
	const original = convertors[type]
	if (typeof original !== 'function') {
		return
	}
	convertors[type] = function(state, node, context) {
		const literal = node.literal
		node.literal = sanitize(typeof literal === 'string' ? literal : '')
		try {
			return original.call(this, state, node, context)
		} finally {
			node.literal = literal
		}
	}
}

/**
 * Install the guard on a constructed Toast UI editor. Safe to call more than
 * once; does nothing on an object without Toast UI's internals.
 *
 * @param {object} editor A `@toast-ui/editor` instance.
 * @return {object} The same editor.
 */
export function guardToastUiEditor(editor) {
	if (!editor || editor[GUARDED]) {
		return editor
	}
	const convertors = editor.convertor && editor.convertor.toWwConvertors
	const view = editor.wwEditor && editor.wwEditor.view
	if (!convertors || !view || typeof view.setProps !== 'function') {
		return editor
	}
	wrapConvertor(convertors, 'htmlBlock', sanitizeHtmlBlockLiteral)
	wrapConvertor(convertors, 'htmlInline', sanitizeHtmlInlineLiteral)

	const transformPastedHTML = view.props.transformPastedHTML
	view.setProps({
		transformPastedHTML(html, pmView) {
			const cleaned = typeof transformPastedHTML === 'function' ? transformPastedHTML(html, pmView) : html
			return toastUiSanitizer(cleaned)
		},
	})

	editor[GUARDED] = true
	return editor
}

/**
 * A subclass of the Toast UI editor class with the guard installed.
 *
 * The constructor converts `initialValue` through `setMarkdown` before it
 * returns, so the guard is installed from that override, ahead of the first
 * conversion.
 *
 * @param {new (options?: object) => object} Editor The `@toast-ui/editor` default export.
 * @return {new (options?: object) => object} The guarded editor class.
 */
export function guardedToastUiEditorClass(Editor) {
	return class GuardedToastUiEditor extends Editor {
		constructor(options) {
			super(options)
			guardToastUiEditor(this)
		}

		setMarkdown(markdown, cursorToEnd) {
			guardToastUiEditor(this)
			return super.setMarkdown(markdown, cursorToEnd)
		}

		setHTML(html, cursorToEnd) {
			guardToastUiEditor(this)
			return super.setHTML(toastUiSanitizer(html), cursorToEnd)
		}
	}
}
