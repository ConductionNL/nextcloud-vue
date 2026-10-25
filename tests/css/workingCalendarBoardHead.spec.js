/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board working calendar draws its month first, at the content edge,
 * and the month buttons add no height (r29 DqInstellingenAlgemeen Werkdagen).
 * Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/working-calendar-board-head/specs/settings-board-look/spec.md
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

describe('look-board.css: working calendar head', () => {
	it('puts the month first, at the start', () => {
		const title = body('.cn-look-board .cn-working-calendar__title:not(.cn-look-nextcloud *)')
		expect(title).toContain('order: -1;')
		expect(title).toContain('text-align: start;')
	})

	it('keeps the month buttons out of the line height', () => {
		expect(body('.cn-look-board .cn-working-calendar__head:not(.cn-look-nextcloud *) > .button-vue:not(.cn-working-calendar__add)')).toContain('margin-block: -8px;')
	})
})
