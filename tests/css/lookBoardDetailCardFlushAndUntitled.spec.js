/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look a flush CnDetailCard keeps its body edge to edge, and a
 * CnDetailCard without a title starts its body at the board card's full
 * inset, not the 12px gap a title leaves (learniq custom pages that frame
 * their sections in cards: LqProctoring, LqItemanalyse).
 *
 * @spec openspec/changes/board-detail-card-flush-and-untitled-inset/specs/board-detail-card-flush-and-untitled-inset/spec.md
 */
import fs from 'fs'
import path from 'path'

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * @param {string} selector The rule's selector, as written.
 * @return {string} The rule's body.
 */
function rule(selector) {
	const start = css.indexOf(selector + ' {')
	expect(start).toBeGreaterThan(-1)
	return css.slice(start, css.indexOf('}', start))
}

describe('a board detail card', () => {
	it('keeps a flush body edge to edge', () => {
		const body = rule('.cn-look-board .cn-detail-card .cn-detail-card__content.cn-detail-card__content--flush')
		expect(body).toContain('padding: 0;')
	})

	it('insets an untitled body as the whole card', () => {
		const body = rule('.cn-look-board .cn-detail-card:not(.cn-detail-card--chromeless):not(:has(> .cn-detail-card__header)) > .cn-detail-card__content:not(.cn-detail-card__content--flush)')
		expect(body).toContain('padding: var(--cn-board-card-padding);')
	})
})
