/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board look draws a detail page's primary button at the end of the header
 * row, after Bewerken and Meer (DqAanbesteding, DqKlachten, DqSubsidie,
 * PqContract, PtPortal, PtMededelingenActies). Read from the stylesheet text.
 *
 * @spec openspec/changes/notice-list-in-a-tab/specs/detail-page/spec.md#requirement-the-board-look-draws-the-primary-button-last
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('look-board-detail.css: primary button last', () => {
	it('orders the primary button after the other header controls, in the board look only', () => {
		const selector = '.cn-look-board .cn-detail-page__header--board .cn-detail-page__header-actions > [data-testid="cn-detail-page-primary-action"]'
		const at = css.lastIndexOf('\n' + selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('order: 1;')
	})
})
