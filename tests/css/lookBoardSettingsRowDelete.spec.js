/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a delete button in a settings row does not shout: in a
 * list row an app draws itself (`cn-settings-row-actions`) it is the soft
 * error tint, red text and no edge (PqBeheer "Verwijderen"); in a settings
 * table row it is white with a red edge and red text (PqBeheerKassa,
 * DqTokens "Verwijderen"). Read as text: jsdom draws no layout.
 *
 * @spec openspec/changes/board-settings-row-delete/specs/board-settings-row-delete/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of the first rule whose selector list holds `sel`.
 *
 * @param {string} sel A selector.
 * @return {string} The rule body, or '' when there is none.
 */
function ruleFor(sel) {
	const at = css.indexOf(sel)
	if (at === -1) {
		return ''
	}
	const open = css.indexOf('{', at)
	return css.slice(open, css.indexOf('}', open))
}

describe('look-board.css: delete buttons in settings rows', () => {
	it('draws an error button in an app-drawn settings row as the soft tint', () => {
		const body = ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) .cn-settings-row-actions .button-vue.button-vue.button-vue--error')
		expect(body).toContain('background-color: var(--cn-board-error-tint)')
		expect(body).toContain('color: var(--color-error-text)')
		expect(body).toContain('border: 0')
	})

	it('draws an error button in a settings table row white with a red edge', () => {
		const body = ruleFor('.cn-look-board .settings-section:not(.cn-look-nextcloud *) td .button-vue.button-vue.button-vue--error')
		expect(body).toContain('background-color: var(--color-main-background)')
		expect(body).toContain('border: 1px solid var(--color-error)')
		expect(body).toContain('color: var(--color-error-text)')
	})

	it('derives the tint from the theme error colour', () => {
		expect(css).toMatch(/--cn-board-error-tint:\s*color-mix\(in srgb, var\(--color-error\)/)
	})
})
