/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a neutral tag is the soft ink on the chip ground, and a
 * count is 16px tall. jsdom draws no layout, so the rules are read from the
 * stylesheet text.
 *
 * @spec openspec/changes/board-pill-tones/specs/board-pill-tones/spec.md#requirement-a-neutral-board-tag-is-soft-text-on-the-chip-ground
 * @spec openspec/changes/board-pill-tones/specs/board-pill-tones/spec.md#requirement-a-board-count-is-16px-tall
 */
const fs = require('fs')
const path = require('path')

/**
 * A stylesheet's text without its comments.
 *
 * @param {string} name The file under src/css.
 * @return {string} The text.
 */
function sheet(name) {
	return fs.readFileSync(path.join(__dirname, '../../src/css', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

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

describe('board pill tones', () => {
	it('mixes the soft ink from the main and the muted text', () => {
		const body = bodiesOf(sheet('look-board.css'), '.cn-look-board')
		expect(body).toContain('--cn-board-text-soft: color-mix(in srgb, var(--color-main-text) 45%, var(--color-text-maxcontrast));')
	})

	it('draws a neutral tag in the soft ink on the chip ground', () => {
		const body = bodiesOf(sheet('look-board.css'), '.cn-look-board .cn-status-badge--default:not(.cn-status-badge--solid):not(.cn-look-nextcloud *)')
		expect(body).toContain('--cn-status-badge-ink: var(--cn-board-text-soft);')
		expect(body).toContain('background-color: var(--color-background-hover);')
		expect(body).toContain('color: var(--cn-status-badge-ink);')
	})

	it('sets the quick-filter and saved-view counts on a 14px line', () => {
		const body = bodiesOf(sheet('look-board-index.css'), '.cn-look-board .cn-quick-filter-bar .cn-quick-filter-bar__count')
		expect(body).toContain('padding: 1px 7px;')
		expect(body).toContain('line-height: 14px;')
		expect(body).toMatch(/(^|[;\s])color: var\(--cn-board-text-soft\);/)
	})

	it('sets the column count on a 14px line at 700 in the soft ink', () => {
		const body = bodiesOf(sheet('board.css'), '.cn-board-view.cn-board-view--board .cn-board-view__badge')
		expect(body).toContain('line-height: 14px;')
		expect(body).toContain('font-weight: 700;')
		expect(body).toContain('color: var(--cn-board-text-soft, var(--color-main-text));')
	})

	it('hands the filter count its light ink', () => {
		const body = bodiesOf(sheet('look-board-index.css'), '.cn-look-board .cn-actions-bar__filter-badge')
		expect(body).toMatch(/(^|[;\s])color: var\(--color-primary-element-text\);/)
	})
})
