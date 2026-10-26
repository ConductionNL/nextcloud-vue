/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A data card under a subtitle keeps the data card's 14px (DqZaakBetrokkenen
 * "Zetels"; r31: 12px, 2.2px high). Read from the stylesheet text.
 *
 * @spec openspec/changes/board-data-card-under-subtitle/specs/board-card/spec.md
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('look-board-detail.css: a data card under a subtitle', () => {
	it('starts 14px under the subtitle, after the subtitle rule', () => {
		const subtitled = '.cn-look-board .cn-detail-page .cn-widget-wrapper:not(.cn-detail-page__side *):has(> .cn-widget-wrapper__header .cn-widget-wrapper__subtitle) > .cn-widget-wrapper__content'
		expect(rule(subtitled + ':has(> .cn-object-data-widget__grid-wrap)')).toContain('padding-top: 14px')
		expect(css.indexOf(subtitled + ':has(> .cn-object-data-widget__grid-wrap) {')).toBeGreaterThan(css.indexOf(subtitled + ' {'))
	})
})
