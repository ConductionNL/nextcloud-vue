/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a button with an icon and a label is 14px in at both
 * sides, with 14px text and a 16px icon 8px from the label. The condition
 * sits in `:where()`, so the rules outrank NcButton's own and lose to every
 * surface rule. jsdom draws no layout, so the rules are read from the
 * stylesheets.
 *
 * @spec openspec/changes/board-icon-label-button/specs/board-icon-label-button/spec.md#requirement-a-board-button-with-an-icon-and-a-label-is-padded-as-the-boards-draw-it
 */
const fs = require('fs')
const path = require('path')

const read = (name) => fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const board = read('look-board.css')
const detail = read('look-board-detail.css')

const CONDITION = ':where(:has(> .button-vue__wrapper > .button-vue__icon:not(:empty)):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):not(.cn-look-nextcloud *):not(.vue-crumb *))'
const INNER = ':where(.button-vue:has(> .button-vue__wrapper > .button-vue__icon:not(:empty)):has(> .button-vue__wrapper > .button-vue__text:not(:empty)):not(.cn-look-nextcloud *):not(.vue-crumb *))'

/**
 * The declarations of every rule that lists exactly this selector.
 *
 * @param {string} css The stylesheet text.
 * @param {string} selector The selector.
 * @return {string} The bodies, joined.
 */
function bodyOf(css, selector) {
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

/**
 * Class-level specificity of a selector: `:where()` counts nothing, every
 * other class or pseudo-class one.
 *
 * @param {string} selector The selector.
 * @return {number} The number of class-level parts.
 */
function classWeight(selector) {
	let s = selector
	while (s.includes(':where(')) {
		const start = s.indexOf(':where(')
		let depth = 0
		let end = start + 6
		for (; end < s.length; end++) {
			if (s[end] === '(') {
				depth++
			}
			if (s[end] === ')' && --depth === 0) {
				break
			}
		}
		s = s.slice(0, start) + s.slice(end + 1)
	}
	return (s.match(/\.[\w-]+|:(?!:)[\w-]+/g) || []).length
}

describe('look-board.css: a button with an icon and a label', () => {
	const button = `.cn-look-board .button-vue.button-vue${CONDITION}`
	const icon = `.cn-look-board ${INNER} .button-vue__icon.button-vue__icon`

	it('pads it 14px at both sides through NcButton\'s padding token, at 14px', () => {
		const body = bodyOf(board, button)
		expect(body).toContain('--button-padding: 14px;')
		expect(body).toContain('font-size: 14px;')
		expect(body).not.toMatch(/(^|[\s;])padding:/)
	})

	it('draws a 16px icon 8px from its label', () => {
		expect(bodyOf(board, icon)).toContain('width: 16px;')
		expect(bodyOf(board, `.cn-look-board ${INNER} .button-vue__icon svg`)).toContain('height: 16px;')
		expect(bodyOf(board, `.cn-look-board ${INNER} .button-vue__wrapper.button-vue__wrapper`)).toContain('gap: 8px;')
	})

	it('weighs three classes: more than NcButton\'s two, less than a surface rule', () => {
		expect(classWeight(button)).toBe(3)
		expect(classWeight(icon)).toBe(3)
		expect(classWeight('.cn-look-board .cn-detail-page .cn-follow-toggle .button-vue .button-vue__icon')).toBeGreaterThan(3)
		expect(classWeight('.cn-look-board .cn-tabs--board .cn-tabs__nav-end .button-vue')).toBeGreaterThan(3)
	})

	it('leaves the gap to the label to that rule, so a header icon is not spaced twice', () => {
		expect(bodyOf(detail, '.cn-look-board .cn-detail-page .cn-detail-page__header-actions > .button-vue--secondary .button-vue__icon')).not.toContain('margin-inline-end')
		expect(bodyOf(board, '.cn-look-board .cn-action-buttons .button-vue .button-vue__icon:not(.cn-look-nextcloud *)')).not.toContain('margin-inline-end')
	})

	it('pads the tab strip\'s Actions button 12px (DqZaak "Acties")', () => {
		expect(bodyOf(detail, '.cn-look-board .cn-tabs--board .cn-tabs__nav-end .button-vue')).toContain('--button-padding: 12px;')
	})
})
