/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A description-line select on a board dashboard is as wide as its placeholder
 * or choice, in 14px/500 (r31 DqDoorlooptijd select 246px vs 135). Read from the stylesheet text.
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const prefix = '.cn-look-board .cn-dashboard-page__description:not(.cn-look-nextcloud *) .cn-dashboard-page__description-select'

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	expect(at).toBeGreaterThan(-1)
	return css.slice(at, css.indexOf('}', at))
}

describe('look-board.css: a description select', () => {
	it('sizes its search box to its content, padded 10px', () => {
		const body = rule(prefix + ' .input-field__input')
		expect(body).toContain('field-sizing: content;')
		expect(body).toContain('padding-inline: 10px 30px;')
	})

	it('sets its text in 14px/500', () => {
		const body = rule(prefix + ' .vs__selected')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 500;')
	})

	it('takes the width of a chosen option: the choice in flow, the search box over it as the frame (r34 DqProcesanalyse "Laatste 12 maanden" 47px vs 166)', () => {
		const chosen = rule(prefix + '.vs--single:not(.vs--open) .vs__selected')
		expect(chosen).toContain('position: relative;')
		expect(chosen).toContain('z-index: 2;')
		expect(chosen).toContain('padding-inline: 10px 30px;')
		expect(chosen).toContain('white-space: nowrap;')
		expect(chosen).toContain('pointer-events: none;')
		const box = rule(prefix + '.vs--single:not(.vs--open):has(.vs__selected) .vs__search')
		expect(box).toContain('position: absolute;')
		expect(box).toContain('inset: 0;')
		expect(box).toContain('width: 100%;')
	})
})
