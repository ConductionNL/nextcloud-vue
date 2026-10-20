/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A detail page's card is titled with the text alone in the board look
 * (DqContact "Contact"). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-detail-card-title-icon/specs/board-detail-card-title-icon/spec.md#requirement-a-board-detail-card-is-titled-without-an-icon
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: detail card titles', () => {
	it('hides the title icon of a detail page card in the board look only', () => {
		const at = css.indexOf('.cn-look-board .cn-detail-page .cn-widget-wrapper__header .cn-widget-wrapper__title-icon {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toMatch(/display: none;/)
	})
})
