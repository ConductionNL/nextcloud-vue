/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A plan row shows its item's description as a muted line under the name,
 * and the board look draws the rows ruled with toned 13px/600 pills (DqZaak
 * "Zaakplan"; r31: grey rows, 600 names, 400 pills, no line under the name).
 *
 * @spec openspec/changes/board-plan-rows/specs/plan-widget/spec.md
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'

const CnPlanWidgetRow = require('../../src/components/CnPlanWidget/CnPlanWidgetRow.vue').default

const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-detail.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

function rule(selector) {
	const at = css.indexOf(selector + ' {')
	return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
}

describe('CnPlanWidgetRow', () => {
	it('shows the description under the name', () => {
		const w = mount(CnPlanWidgetRow, { props: { item: { key: 'm', name: 'Mijlpaal: verzoek compleet', description: 'bereikt op 4 okt', state: 'completed', type: 'milestone' } } })
		expect(w.find('[data-testid="cn-plan-row-meta"]').text()).toBe('bereikt op 4 okt')
	})

	it('draws no line without a description', () => {
		const w = mount(CnPlanWidgetRow, { props: { item: { key: 'b', name: 'Besluit opstellen', state: 'available', type: 'humanTask' } } })
		expect(w.find('[data-testid="cn-plan-row-meta"]').exists()).toBe(false)
	})

	it('is ruled with 500 names and 600 pills in the board look', () => {
		expect(rule('.cn-look-board .cn-plan .cn-plan-row:not(.cn-look-nextcloud *)')).toContain('border-top: 1px solid var(--color-border)')
		expect(rule('.cn-look-board .cn-plan .cn-plan-row .cn-plan-row__name:not(.cn-look-nextcloud *)')).toContain('font-weight: 500')
		expect(rule('.cn-look-board .cn-plan .cn-plan-row .cn-plan-row__state:not(.cn-look-nextcloud *)')).toContain('font-weight: 600')
	})
})
