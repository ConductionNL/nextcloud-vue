/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The breadcrumb row of a board index page stays under the title when the
 * header also has a count line (DqZaaktypen). jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/index-count-subtitle-keeps-crumb-row/specs/index-count-subtitle-keeps-crumb-row/spec.md#requirement-the-breadcrumb-row-stays-under-the-title
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or '' when no rule has it.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const HEADER = '.cn-look-board .cn-index-page .cn-page-header'

describe('look-board-index.css: the breadcrumb row stays under the title', () => {
	it('places the trail in the title column on row 2', () => {
		const body = bodyOf(`${HEADER} .cn-header-trail`)
		expect(body).toContain('grid-column: 1;')
		expect(body).toContain('grid-row: 2;')
	})

	it('puts a count line after the trail on row 3', () => {
		expect(bodyOf(`${HEADER} .cn-header-trail ~ .cn-page-header__description`)).toContain('grid-row: 3;')
	})
})
