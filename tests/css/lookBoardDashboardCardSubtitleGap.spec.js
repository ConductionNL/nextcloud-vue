/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board dashboard card with a subtitle starts its content 12px under the
 * subtitle (DqCatalogus "Objecttypen", DqProcesanalyse, DqTermijnen): the
 * first line's leading the header takes off belongs to a title-only head.
 * Read from the stylesheet text.
 *
 * @spec openspec/changes/board-dashboard-card-subtitle-gap/specs/board-dashboard-card-subtitle-gap/spec.md#requirement-a-board-dashboard-cards-content-starts-12px-under-its-subtitle
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

const CARD = '.cn-look-board .cn-dashboard-page:not(.cn-look-nextcloud *) .cn-widget-wrapper:not(.cn-widget-wrapper--nc-dashboard):not(.cn-widget-wrapper--borderless)'
const SUBTITLED = `${CARD}:has(> .cn-widget-wrapper__header .cn-widget-wrapper__subtitle) .cn-widget-wrapper__header`
const RULED = `${CARD}:has(> .cn-widget-wrapper__content .cn-record-list--rule-above`

describe('look-board.css: dashboard card subtitle gap', () => {
	it('pads the header of a card with a subtitle 12px below, without taking off a leading', () => {
		const at = css.indexOf('\n' + SUBTITLED + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(css.slice(at, css.indexOf('}', at))).toContain('padding-bottom: 12px;')
	})

	it('leaves the ruled list its 6px: the subtitle rule comes first', () => {
		expect(css.indexOf('\n' + SUBTITLED + ' {')).toBeGreaterThan(-1)
		expect(css.indexOf('\n' + SUBTITLED + ' {')).toBeLessThan(css.indexOf('\n' + RULED))
	})
})
