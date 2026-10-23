/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact draws "BSN tonen" as a 30px outlined pill; the reveal button stood
 * 28px.
 *
 * @spec openspec/changes/facts-reveal-button-ink/specs/facts-widget/spec.md
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')

/**
 * @param {string} selector The rule's selector.
 * @return {string} Its body, or ''.
 */
function rule(selector) {
	const at = sfc.indexOf(`${selector} {`)
	return at === -1 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnFactsWidget reveal button height', () => {
	it('stands 30px as an outlined pill, as the board draws it', () => {
		const body = rule('.cn-facts-widget__inline-button')
		expect(body).toContain('min-height: 30px;')
		expect(body).toContain('border: 1px solid var(--color-border-dark);')
	})
})
