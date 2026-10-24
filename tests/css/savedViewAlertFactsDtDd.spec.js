/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved view alert widget's facts (Name, Now) reset Nextcloud core's
 * `dt`/`dd` styling (130px wide, end-aligned, 12px padding), so the label sits
 * at the card's edge with the value right beside it (DqZoekresultaten). jsdom
 * draws no layout, so the values are read from the component's style block.
 */
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnSavedViewAlertWidget/CnSavedViewAlertWidget.vue'), 'utf8')
const css = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of the rule whose selector list holds `selector`. */
function rule(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	let out = ''
	while ((m = re.exec(css))) {
		if (m[1].split(/,(?![^(]*\))/).map((s) => s.trim()).includes(selector)) {
			out += m[2]
		}
	}
	return out
}

describe.each([
	['label', '.cn-saved-view-alert__facts dt'],
	['value', '.cn-saved-view-alert__facts dd'],
])('saved view alert %s', (_name, selector) => {
	it('is start-aligned with no padding, no fixed width and no margin, whatever core says for dt and dd', () => {
		const body = rule(selector)
		expect(body).toMatch(/text-align:\s*start/)
		expect(body).toMatch(/padding:\s*0\s*;/)
		expect(body).toMatch(/width:\s*auto/)
		expect(body).toMatch(/margin:\s*0\s*;/)
	})
})
