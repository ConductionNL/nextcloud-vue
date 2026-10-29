/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A timeline that titles itself in the main column reads as every board card
 * title (PqKlant/PqOrganisatie "Activiteit": 17px 700 drawn, 600 live), and
 * the tonal and link header buttons stand 8px apart, not 11: server.css gives
 * every button `margin: 3px 3px 3px 0` at (0,2,1), which outranked the
 * scoped `margin: 0`. Read from the stylesheet text.
 *
 * @spec openspec/changes/board-timeline-title-and-header-gap/specs/board-timeline-title-and-header-gap/spec.md
 */
const fs = require('fs')
const path = require('path')

const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
const css = strip(fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8'))
const buttons = strip(fs.readFileSync(path.join(__dirname, '../../src/components/CnWidgetWrapper/CnWidgetHeaderActionButtons.vue'), 'utf8'))

const ruleBody = (text, selector) => {
	const at = text.indexOf(selector)
	expect(at).toBeGreaterThan(-1)
	return text.slice(at, text.indexOf('}', at))
}

describe('board look: the main-column timeline title', () => {
	it('is 17px, 700, normal line height', () => {
		const body = ruleBody(css, '.cn-look-board .cn-detail-page .cn-timeline-widget__title:not(.cn-detail-page__side *) {')
		expect(body).toContain('font-size: var(--cn-board-heading-size);')
		expect(body).toContain('font-weight: 700;')
		expect(body).toContain('line-height: normal;')
	})
})

describe('CnWidgetHeaderActionButtons: no server.css margin', () => {
	it('zeroes the margin of the tonal and link buttons with a doubled class', () => {
		const body = ruleBody(buttons, '.cn-widget-header-actions__link.cn-widget-header-actions__link,\n.cn-widget-header-actions__tonal.cn-widget-header-actions__tonal {')
		expect(body).toContain('margin: 0;')
	})
})
