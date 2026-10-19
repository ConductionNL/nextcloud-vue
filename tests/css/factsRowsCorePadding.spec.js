/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The facts list is a `dl`, and Nextcloud's core stylesheet pads every `dl`
 * 12px at the top and bottom; the list draws no padding of its own, so a side
 * card's facts start 12px under the title (DqZaak "Behandeling"). Read from
 * the component's style block.
 *
 * @spec openspec/changes/facts-rows-core-padding/specs/facts-rows-core-padding/spec.md#requirement-the-facts-list-draws-no-core-list-padding
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnFactsWidget/CnFactsWidget.vue'), 'utf8')
const css = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnFactsWidget: the facts list padding', () => {
	it('zeroes the core dl padding', () => {
		const m = css.match(/\.cn-facts-widget__rows\s*\{([^}]*)\}/)
		expect(m).not.toBeNull()
		expect(m[1]).toContain('padding: 0;')
	})
})
