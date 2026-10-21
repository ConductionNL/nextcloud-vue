/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards set the page links and "Volgende" at the regular weight and
 * only the current page at 600 (DqZaken). The links are buttons, which
 * Nextcloud's `button` rule sets bold. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-pagination-weight/specs/board-pagination-weight/spec.md#requirement-board-page-links-are-regular-weight
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule whose selector list ends with the given selector.
 *
 * @param {string} selector The last selector of the list.
 * @return {string} The rule body, or ''.
 */
function ruleEndingWith(selector) {
	const at = css.indexOf(selector + ' {')
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-index.css: board page links', () => {
	it('sets a page link at the regular weight', () => {
		expect(ruleEndingWith('.cn-look-board .cn-pagination--board .cn-pagination__board-link'))
			.toMatch(/font-weight: 400;/)
	})

	it('keeps the current page at 600', () => {
		expect(ruleEndingWith('.cn-look-board .cn-pagination--board .cn-pagination__board-link--current'))
			.toMatch(/font-weight: 600;/)
	})
})
