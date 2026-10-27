/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Termijn": the bar for the share of the term that has passed spans
 * the card. The KPI body aligns its items to the start, so without its own
 * stretch the empty track measured 0px wide on :8080 (aria-valuenow 50).
 * Read from the component's style block.
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnCountdownWidget/CnCountdownWidget.vue'), 'utf8')
const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnCountdownWidget bar width', () => {
	it('stretches the progress track across the card', () => {
		const at = style.indexOf('.cn-countdown-widget__progress {')
		expect(at).toBeGreaterThan(-1)
		expect(style.slice(at, style.indexOf('}', at))).toContain('align-self: stretch')
	})
})
