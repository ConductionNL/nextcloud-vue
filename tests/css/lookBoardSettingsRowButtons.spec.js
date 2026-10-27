/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a labelled button in a settings table row is 34px, 12px
 * in. Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-row-buttons/specs/board-settings-row-buttons/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board.css: settings table-row buttons', () => {
	it('draws a labelled button in a table cell 34px with 12px padding', () => {
		const sel = '.cn-look-board .settings-section:not(.cn-look-nextcloud *) td .button-vue.button-vue.button-vue:has(> .button-vue__wrapper > .button-vue__text:not(:empty)):not(.cn-settings-section__actions *):not(.cn-settings-field__image-row *)'
		const at = css.indexOf(sel)
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('--button-size: 34px;')
		expect(body).toContain('--button-padding: 12px;')
		expect(body).toContain('height: 34px;')
	})

	it('gives the same size to buttons in a row an app draws itself, opted in by class', () => {
		expect(css).toContain('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .cn-settings-row-actions .button-vue.button-vue.button-vue:has(')
	})
})
