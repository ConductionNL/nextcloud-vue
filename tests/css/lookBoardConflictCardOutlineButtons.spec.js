/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board DqInspectie (the "Synchroniseren" phone) draws the conflict card's
 * "Deze houden" and "Die van kantoor" as 34px outline buttons: transparent,
 * a 1px control border, 14px in, 14px/600 main ink. CnConflictResolveCard
 * renders them as NcButton secondary, which is filled. jsdom draws no layout,
 * so the rules are read from the stylesheet text.
 *
 * @spec openspec/changes/board-conflict-card-outline-buttons/specs/board-conflict-card-outline-buttons/spec.md#requirement-a-board-conflict-cards-choices-are-34px-outline-buttons
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the first rule whose selector list holds this selector.
 *
 * @param {string} selector The selector.
 * @return {string|null} The rule body, or null.
 */
function ruleFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			return m[2]
		}
	}
	return null
}

const A = '.cn-look-board .cn-conflict-resolve__actions:not(.cn-look-nextcloud *)'

describe('look-board.css: the conflict card choices', () => {
	it.each(['.button-vue.button-vue--secondary', '.button-vue.button-vue--vue-secondary'])('draws %s as a 34px outline button', (button) => {
		const body = ruleFor(`${A} ${button}`)
		expect(body).toContain('--button-size: 34px;')
		expect(body).toContain('--button-padding: 14px;')
		expect(body).toContain('border: 1px solid var(--cn-board-control-border);')
		expect(body).toContain('background: transparent;')
		expect(body).toContain('color: var(--color-main-text);')
		expect(body).toContain('font-size: 14px;')
		expect(body).toContain('font-weight: 600;')
	})

	it('keeps a hover ground', () => {
		expect(ruleFor(`${A} .button-vue.button-vue--secondary:hover:not(:disabled)`)).toContain('background: var(--color-background-hover);')
	})

	it('takes the text padding off, so the button is 14px in', () => {
		expect(ruleFor(`${A} .button-vue .button-vue__text.button-vue__text`)).toContain('padding-inline: 0;')
	})

	it('stays under the board look only', () => {
		const selectors = css.match(/[^{}]*cn-conflict-resolve[^{}]*\{/g) || []
		expect(selectors.length).toBeGreaterThan(0)
		for (const s of selectors) {
			for (const part of s.replace(/\{/g, '').split(/,(?![^(]*\))/)) {
				expect(part.trim().startsWith('.cn-look-board ')).toBe(true)
				expect(part).toContain(':not(.cn-look-nextcloud *)')
			}
		}
	})
})
