/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqContact draws "BSN tonen" as a 30px outlined pill in the main ink; the
 * button took the theme's button colour (primary) and stood 28px.
 *
 * @spec openspec/changes/facts-reveal-ink/specs/facts-widget/spec.md#requirement-the-reveal-button-reads-in-the-main-ink
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
function rule(selector) {
	const at = sfc.indexOf(`${selector} {`)
	return at === -1 ? '' : sfc.slice(at, sfc.indexOf('}', at))
}

describe('CnFactsWidget reveal button', () => {
	it('reads in the main ink, 30px tall, as the board draws it', () => {
		const body = rule('.cn-facts-widget__inline-button')
		expect(body).toContain('color: var(--color-main-text);')
		expect(body).toContain('min-height: 30px;')
	})
})
