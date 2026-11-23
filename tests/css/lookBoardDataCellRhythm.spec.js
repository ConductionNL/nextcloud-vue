/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A data card's label and value sit 3px apart on the normal line height, as the boards draw their facts (DqZaakContact Ontvangstbevestiging r29). Read from the stylesheet.
 *
 * @spec openspec/changes/board-data-cell-rhythm/specs/board-data-cell-rhythm/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list names `selector`.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('src/css/look-board-detail.css', () => {
	it('keeps the board rhythm', () => {
		expect(bodyOf('.cn-look-board .cn-object-data-widget__grid .cn-object-data-widget__cell.cn-object-data-widget__cell')).toMatch(/gap:\s*3px/)
		expect(bodyOf('.cn-look-board .cn-object-data-widget__grid .cn-object-data-widget__value')).toMatch(/line-height:\s*normal/)
	})
})
