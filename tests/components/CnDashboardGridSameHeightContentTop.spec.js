/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqProcesanalyse: a stat tile in a sameHeight row is a fitted card, and the
 * dashboard page centres a fitted card's content (`justify-content: safe
 * center`) with a selector as strong as the grid's "content at the top" rule
 * and loaded after it, so a tile without a caption sat 10.5px low (r45:
 * insetTop 29.5 vs 19). The grid's rule carries one class more. jsdom draws
 * no layout, so the rule is read from the component's style text.
 *
 * @spec openspec/changes/same-height-fit-card-content-top/specs/dashboard-grid/spec.md#requirement-a-stretched-fitted-card-keeps-its-content-at-the-top
 */
const fs = require('fs')
const path = require('path')

const sfc = fs.readFileSync(path.join(__dirname, '../../src/components/CnDashboardGrid/CnDashboardGrid.vue'), 'utf8')
const style = sfc.slice(sfc.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

describe('CnDashboardGrid: a stretched card keeps its content at the top', () => {
	it('outranks the fitted card centring with the grid item class', () => {
		const selector = '.cn-dashboard-grid__item--same-height.grid-stack-item > :deep(.grid-stack-item-content > * > .cn-widget-wrapper__content)'
		const at = style.indexOf('\n' + selector + ' {')
		expect(at).toBeGreaterThan(-1)
		expect(style.slice(at, style.indexOf('}', at))).toContain('justify-content: flex-start;')
	})
})
