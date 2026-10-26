/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board settings card's first line sits where the boards draw it (r31
 * DqBeheerinstellingen, DqBeheerGeavanceerd). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-first-line/specs/settings-board-look/spec.md
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

describe('look-board.css: a settings card first line', () => {
	it('takes the hints link and a switch out of the line height', () => {
		const link = body('.cn-look-board .cn-settings-fields__hints-toggle:not(.cn-look-nextcloud *) .button-vue,\n.cn-look-board .cn-settings-fields__advanced:not(.cn-look-nextcloud *) > .button-vue')
		expect(link).toContain('height: 25px;')
		expect(link).toContain('border-radius: 0;')
		expect(body('.cn-look-board .cn-settings-field--switch:not(.cn-look-nextcloud *) > .checkbox-radio-switch')).toContain('margin-block: -8px;')
	})

	it('drops a status note margin', () => {
		expect(body('.cn-look-board .cn-settings-field--status:not(.cn-look-nextcloud *) > .notecard')).toContain('margin: 0;')
	})

	it('draws the longer explanation 14px muted with no margin', () => {
		const text = body('.cn-look-board .cn-settings-section__description-text:not(.cn-look-nextcloud *)')
		expect(text).toContain('--nldesign-component-paragraph-font-size: 14px;')
		expect(text).toContain('margin: 0;')
	})
})
