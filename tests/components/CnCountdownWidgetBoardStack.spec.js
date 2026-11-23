/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaak "Termijn" on the board look: the days, the date line, the bar and
 * the action stand 10px apart (r33: 2 / 11.9 / 5 against 10). Read from the component's style block.
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnCountdownWidget/CnCountdownWidget.vue'), 'utf8')
const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
/**
 * The declarations of the rule whose selector list is exactly `selector`.
 *
 * @param {string} selector The selector text before the opening brace.
 * @return {string} The rule body, or '' when the rule is missing.
 */
function rule(selector) {
	const at = style.indexOf(selector + ' {')
	return at < 0 ? '' : style.slice(at, style.indexOf('}', at))
}

describe('CnCountdownWidget board stack', () => {
	it('stacks the board term card 10px apart', () => {
		expect(rule('.cn-countdown-widget--board .cn-kpi-card__body')).toContain('gap: 10px')
	})

	it('drops the bar and action margins on the board, the gap spaces them', () => {
		expect(rule('.cn-countdown-widget--board .cn-countdown-widget__progress.cn-countdown-widget__progress,\n.cn-countdown-widget--board .cn-countdown-widget__action.cn-countdown-widget__action')).toContain('margin: 0')
	})
})
