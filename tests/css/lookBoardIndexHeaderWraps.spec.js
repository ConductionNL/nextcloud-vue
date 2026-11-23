/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board index header too narrow for its label wraps it over two lines
 * ("KvK- / nummer", "Lopende / zaken", DqOrganisaties) instead of cutting it
 * to "KvK-n...". Read from the stylesheet text.
 *
 * @spec openspec/changes/board-index-header-wraps/specs/data-table/spec.md#requirement-a-board-index-header-wraps-a-label-that-does-not-fit
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
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return ''
}

const TH = '.cn-look-board .cn-index-page__main--table .cn-table-container--board .cn-data-table th'

describe('look-board-index.css: a header label that does not fit wraps', () => {
	it('lets the header cell wrap', () => {
		expect(bodyOf(TH)).toContain('white-space: normal;')
	})

	it('lets the sort button\'s label wrap without an ellipsis', () => {
		const body = bodyOf(`${TH} .cn-table-header__sort > :first-child`)
		expect(body).toContain('white-space: normal;')
		expect(body).toContain('text-overflow: clip;')
	})
})
