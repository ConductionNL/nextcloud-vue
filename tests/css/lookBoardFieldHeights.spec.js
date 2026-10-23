/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The boards draw the index side panel's fields 40px tall (DqZakenSorteren
 * "Sorteren op", the search field) and a dashboard's page filters 36px
 * (DqProcesanalyse, DqDoorlooptijd "Filteren op zaaktype", "Periode");
 * NcInputField, also NcSelect's search box, draws 30px in a 34px wrapper.
 * The field wrapper holds the input and its 2px focus ring, as on a board
 * form. jsdom draws no layout, so the rules are read from the stylesheet.
 *
 * @spec openspec/changes/board-field-heights/specs/board-field-heights/spec.md#requirement-side-panel-fields-and-page-filters-are-as-tall-as-the-boards-draw-them
 */
const fs = require('fs')
const path = require('path')

const sheet = (name) => fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The bodies of every rule that lists exactly this selector, joined.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies.
 */
function bodiesOf(css, selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	const out = []
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

describe('board field heights', () => {
	it('sets the side panel fields to 40px', () => {
		const css = sheet('look-board-index.css')
		expect(bodiesOf(css, '.cn-look-board .cn-index-sidebar-panel')).toContain('--cn-field-height: 40px;')
		expect(bodiesOf(css, '.cn-look-board .cn-index-sidebar-panel .input-field__main-wrapper:not(.vs--multiple *)')).toContain('height: calc(var(--cn-field-height) + 2 * var(--border-width-input-focused, 2px));')
		expect(bodiesOf(css, '.cn-look-board .cn-index-sidebar-panel .input-field__input:not(.vs--multiple *)')).toContain('height: var(--cn-field-height);')
	})

	it('sets a dashboard page filter to 36px', () => {
		const css = sheet('look-board.css')
		expect(bodiesOf(css, '.cn-look-board .cn-dashboard-page__page-filter:not(.cn-look-nextcloud *)')).toContain('--cn-field-height: 36px;')
		expect(bodiesOf(css, '.cn-look-board .cn-dashboard-page__page-filter:not(.cn-look-nextcloud *) .input-field__input:not(.vs--multiple *)')).toContain('min-height: var(--cn-field-height);')
	})
})
