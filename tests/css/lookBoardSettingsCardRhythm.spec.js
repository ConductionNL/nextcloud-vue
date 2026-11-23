/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board settings card's rhythm (r32 DqBeheerinstellingen): Save 16px under
 * the last row, choices 49px apart, selects and text fields 79px apart, a
 * sub-heading on one 1.3 line. Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-card-rhythm/specs/settings-board-look/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The selector.
 * @return {string} The rule's body.
 */
function body(selector) {
	const at = css.indexOf(`${selector} {`)
	return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
}

const CARD = '.cn-look-board .settings-section:not(.cn-look-nextcloud *)'

describe('look-board.css: settings card rhythm', () => {
	it('sets Save 16px under the last row', () => {
		const save = body('.cn-look-board .cn-settings-fields__save.cn-settings-section__save:not(.cn-look-nextcloud *)')
		expect(save).toContain('margin-top: 0;')
		expect(save).toContain('padding-top: 0;')
	})

	it('sets choices, selects and text fields in the board rhythm', () => {
		expect(body('.cn-look-board .cn-settings-field__radio:not(.cn-look-nextcloud *) > .checkbox-radio-switch')).toContain('margin-block: -8px;')
		expect(body(`${CARD} .v-select.select:has(.input-field__label)`)).toContain('margin-block: 23px -4px;')
		expect(body(`${CARD} .cn-settings-field__heading`)).toContain('line-height: 1.3;')
		expect(body(`${CARD} .cn-settings-field__hint`)).toContain('line-height: 1.45;')
	})

	it('sets a textarea\'s hint 6px under its control, which has no negative margin to take back', () => {
		expect(body(`${CARD} .cn-settings-field:has(> .textarea) > .cn-settings-field__hint`)).toContain('margin-block-start: 0;')
	})
})
