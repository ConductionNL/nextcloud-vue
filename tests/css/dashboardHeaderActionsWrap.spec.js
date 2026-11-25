/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The dashboard page's header actions are never wider than the header, so on a
 * phone their own wrap takes effect instead of the box running off the screen
 * (decidiq MyActions, DecisionsReport and AccessibilityReport at 360 pixels,
 * found by decidiq's tests/e2e/phone-width.spec.ts on a live instance). Read
 * from the component's style block.
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardPage/CnDashboardPage.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list is exactly the selector.
 *
 * @param {string} selector The selector to look for.
 * @return {string} The bodies, joined.
 */
function bodiesFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let body = ''
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			body += m[2]
		}
	}
	return body
}

describe('CnDashboardPage: header actions on a narrow screen', () => {
	it('keeps the actions box within the header so it wraps its buttons', () => {
		const body = bodiesFor('.cn-dashboard-page__header-actions')
		expect(body).toMatch(/flex-wrap:\s*wrap/)
		expect(body).toMatch(/max-width:\s*100%/)
		expect(body).toMatch(/min-width:\s*0/)
	})
})
