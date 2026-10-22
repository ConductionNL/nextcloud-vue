/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In the board look the flow board's inspector card is titled as every board
 * card: 17px, weight 700, at the font's normal line height (COMPDIFF r22
 * DqFlow "Welstand nodig?": 16px 600 at 24px). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-flow-card-title/specs/board-flow-card-title/spec.md#requirement-a-board-flow-card-is-titled-as-a-board-card
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: the flow card title', () => {
	it('is 17px, 700, normal line height', () => {
		const at = css.indexOf('.cn-look-board .cn-flow-board__card-title.cn-flow-board__card-title:not(.cn-look-nextcloud *) {')
		expect(at).toBeGreaterThan(-1)
		const body = css.slice(at, css.indexOf('}', at))
		expect(body).toContain('font-size: var(--cn-board-heading-size);')
		expect(body).toContain('font-weight: 700;')
		expect(body).toContain('line-height: normal;')
	})
})
