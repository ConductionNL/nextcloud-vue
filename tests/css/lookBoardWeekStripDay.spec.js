/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look's week strip day (DqMijnWerk "Termijnen deze week"): a tinted
 * box without an edge, today on the light primary ground in its own ink. Read
 * from the stylesheet text.
 *
 * @spec openspec/changes/board-week-strip-fits/specs/week-strip-board-look/spec.md#requirement-a-board-week-strip-fits-its-card
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule listing an exact selector, joined.
 *
 * @param {string} selector The selector.
 * @return {string} The declarations, or ''.
 */
function bodyOf(selector) {
	const out = []
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			out.push(m[2])
		}
	}
	return out.join('\n')
}

const STRIP = '.cn-look-board .cn-week-strip:not(.cn-look-nextcloud *)'

describe('look-board.css: the board week strip day', () => {
	it('draws a day as a tinted box without an edge, at least 132px high', () => {
		const body = bodyOf(`${STRIP} .cn-week-strip__day`)
		expect(body).toMatch(/min-height: 132px;/)
		expect(body).toMatch(/padding: 12px;/)
		expect(body).toMatch(/border-color: transparent;/)
		expect(body).toMatch(/border-radius: 10px;/)
		expect(body).toMatch(/background: var\(--nldesign-component-content-surface-background-color, var\(--color-background-hover\)\);/)
	})

	it('sets the day label at 13px bold in the soft ink, today in the light primary ink', () => {
		const head = bodyOf(`${STRIP} .cn-week-strip__head`)
		expect(head).toMatch(/font-size: 13px;/)
		expect(head).toMatch(/font-weight: 700;/)
		expect(head).toMatch(/color: var\(--cn-board-text-soft\);/)
		expect(bodyOf(`${STRIP} .cn-week-strip__day--today`)).toMatch(/background: var\(--color-primary-element-light\);/)
		expect(bodyOf(`${STRIP} .cn-week-strip__day--today .cn-week-strip__head`)).toMatch(/color: var\(--color-primary-element-light-text\);/)
	})

	it('rounds the today pill at 10px, 11px type', () => {
		const body = bodyOf(`${STRIP} .cn-week-strip__today`)
		expect(body).toMatch(/border-radius: 10px;/)
		expect(body).toMatch(/font-size: 11px;/)
	})

	it('keeps an edge in forced colours', () => {
		expect(css).toMatch(/@media \(forced-colors: active\)\s*\{\s*\.cn-look-board \.cn-week-strip:not\(\.cn-look-nextcloud \*\) \.cn-week-strip__day\s*\{\s*border-color: CanvasText;/)
	})
})
