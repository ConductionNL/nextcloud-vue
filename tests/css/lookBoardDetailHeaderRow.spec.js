/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a detail page's header buttons stay on the title row,
 * at its top: the title takes what the buttons leave from a zero basis, and
 * the buttons drop a row only when less than 16rem of title fits (DqZaak).
 * jsdom draws no layout, so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-detail-header-row/specs/board-detail-header-row/spec.md#requirement-the-board-detail-header-keeps-its-actions-on-the-title-row
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

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

describe('look-board-detail.css: the detail header row', () => {
	it('puts the buttons at the top of the title row', () => {
		expect(bodyOf('.cn-look-board .cn-detail-page__header--board')).toContain('align-items: flex-start;')
	})

	it('lets the title take what the buttons leave, down to 16rem', () => {
		const body = bodyOf('.cn-look-board .cn-detail-page__header--board > :first-child')
		expect(body).toContain('flex: 1 1 0;')
		expect(body).toContain('min-width: min(100%, 16rem);')
	})
})
