/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Rendered HTML to inert one-line text, read by the browser's HTML parser
 * rather than by tag patterns, so a split or unclosed tag cannot slip through
 * and a long hostile input stays linear.
 */

const DROPPED = 'script, style, noscript, template'

/**
 * Reduce HTML to its visible text: script, style, noscript and template
 * content is dropped, comments are skipped, entities are decoded, and every
 * element boundary reads as one space.
 *
 * @param {unknown} html Rendered HTML or plain text.
 * @return {string} The text on one line, trimmed.
 */
export function htmlToText(html) {
	const source = html === null || html === undefined ? '' : String(html)
	if (source === '') {
		return ''
	}
	const doc = new DOMParser().parseFromString(source, 'text/html')
	doc.querySelectorAll(DROPPED).forEach((node) => node.remove())
	const parts = []
	const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT)
	while (walker.nextNode()) {
		parts.push(walker.currentNode.nodeValue)
	}
	return parts.join(' ').replace(/\s+/g, ' ').trim()
}
