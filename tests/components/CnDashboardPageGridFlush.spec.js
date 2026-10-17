/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * dashboard-grid-flush: the page hands its grid margin to its stylesheet as
 * `--cn-dashboard-grid-margin`, which the board look uses to reach the grid
 * out by that margin so the cards line up with the KPI row. The alignment
 * itself is measured in e2e/dashboard-grid-flush.e2e.js.
 *
 * @spec openspec/changes/dashboard-grid-flush/specs/dashboard-page/spec.md#requirement-board-cards-line-up-with-the-page-edge
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = { CnDashboardGrid: { template: '<div class="cn-dashboard-grid" />' }, CnWidgetWrapper: { template: '<div><slot /></div>' } }

describe('CnDashboardPage: the grid sits flush in the board look', () => {
	it('exposes the grid margin as a custom property', () => {
		const w = mount(CnDashboardPage, { props: { title: 'My work', widgets: [], layout: [], gridMargin: 8 }, global: { stubs } })
		expect(w.attributes('style')).toContain('--cn-dashboard-grid-margin: 8px')
	})

	it('reaches the grid out by the margin under the board look only', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnDashboardPage', 'CnDashboardPage.vue'), 'utf8')
		const rule = source.match(/\.cn-dashboard-page--board :deep\(\.cn-dashboard-grid\) \{([^}]*)\}/)
		expect(rule).not.toBeNull()
		expect(rule[1]).toContain('margin-inline: calc(-1 * var(--cn-dashboard-grid-margin, 12px))')
		expect(rule[1]).toContain('width: auto')
	})
})
