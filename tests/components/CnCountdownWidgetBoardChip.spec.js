/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The term card's action in the board look is the board's 34px chip with
 * 13px text and a 17px radius (DqZaak "Termijn opschorten"). jsdom draws no
 * layout, so the rule is read from the component's style.
 *
 * @spec openspec/changes/countdown-board-look/specs/countdown-board-look/spec.md#requirement-the-countdown-draws-the-boards-term-card
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnCountdownWidget/CnCountdownWidget.vue'), 'utf8')
const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnCountdownWidget board chip', () => {
	it('draws the action at 13px with a 17px radius in the board look', () => {
		const m = style.match(/\.cn-countdown-widget--board \.cn-countdown-widget__action\s*\{([^}]*)\}/)
		expect(m).not.toBeNull()
		expect(m[1]).toContain('font-size: 13px;')
		expect(m[1]).toContain('border-radius: 17px;')
	})
})
