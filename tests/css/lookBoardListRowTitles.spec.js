/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a list row in a card reads as the boards draw it: the
 * title at weight 500 with the 13px line under it at the font's normal line
 * height, 10px above and below, so a two-line row is 56px (DqZaaktype
 * "Versies", DqSociaalDomein, DqZaaktypeOverzicht: live 68 at weight 700).
 * An audit row's action is set at 500 too (DqHandhaving "Historie"). The
 * dashboard keeps its own row rules. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-list-row-titles/specs/board-list-row-titles/spec.md#requirement-a-board-list-row-is-titled-at-500-over-a-13px-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the rule that lists exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body, or ''.
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

const ROWS = '.cn-look-board .cn-record-list--rows:not(.cn-dashboard-page *):not(.cn-look-nextcloud *)'

describe('look-board.css: list row titles', () => {
	it('pads a row 10px above and below', () => {
		expect(bodyOf(`${ROWS} .cn-record-list__row`)).toContain('padding: 10px 0;')
	})

	it('sets the title at 500 in the main ink, at the normal line height', () => {
		const body = bodyOf(`${ROWS} .cn-record-list__title`)
		expect(body).toContain('font-weight: 500;')
		expect(body).toContain('line-height: normal;')
		expect(body).toContain('color: var(--color-main-text);')
	})

	it('sets the line under it at 13px, normal line height', () => {
		const body = bodyOf(`${ROWS} .cn-record-list__meta`)
		expect(body).toContain('font-size: 13px;')
		expect(body).toContain('line-height: normal;')
	})

	it('sets an audit row\'s action at 500 and its time and actor at 13px', () => {
		expect(bodyOf('.cn-look-board .cn-audit-card__row .cn-audit-card__action:not(.cn-look-nextcloud *)')).toContain('font-weight: 500;')
		expect(bodyOf('.cn-look-board .cn-audit-card__row .cn-audit-card__when:not(.cn-look-nextcloud *)')).toContain('font-size: 13px;')
		expect(bodyOf('.cn-look-board .cn-audit-card__row .cn-audit-card__row-body:not(.cn-look-nextcloud *)')).toContain('font-size: 13px;')
	})
})
