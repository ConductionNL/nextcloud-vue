/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The calendar and Deck cards' rows in the board look, as DqZaakTaken
 * "Afspraken" and "Kaarten" draw them: ruled rows 12px high-padded, the
 * title 15/600 over a 13px muted meta line, the pill at the end, and the
 * link to the app under the rows, 14px bold. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-deck-calendar-rows/specs/integrations/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: calendar and Deck rows', () => {
	it('rules each row and pads it 10px', () => {
		const body = rule('.cn-look-board .cn-detail-page .cn-calendar-card__row,\n.cn-look-board .cn-detail-page .cn-deck-card__row')
		// 10px: the rows sit on the font's own leading (r32-board-integration-rows), 56px high as the boards draw them.
		expect(body).toContain('padding: 10px 0')
		expect(body).toContain('border-top: 1px solid var(--cn-board-hairline)')
	})

	it('sets the title 15/600 and the meta 13px muted', () => {
		expect(rule('.cn-look-board .cn-detail-page .cn-calendar-card__title,\n.cn-look-board .cn-detail-page .cn-deck-card__row-title')).toContain('font-size: 15px')
		expect(rule('.cn-look-board .cn-detail-page .cn-calendar-card__meta,\n.cn-look-board .cn-detail-page .cn-deck-card__row-meta')).toContain('font-size: 13px')
	})

	it('draws the link to the app under the rows, 14px bold', () => {
		const body = rule('.cn-look-board .cn-detail-page .cn-calendar-card__open,\n.cn-look-board .cn-detail-page .cn-deck-card__open')
		expect(body).toContain('font-weight: 600')
		expect(body).toContain('margin-top: 12px')
	})
})
