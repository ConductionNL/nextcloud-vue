/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A roadmap can be drawn as three columns (`layout: "columns"`): Planned, In
 * development and Available, with counts, closed-as-completed issues read
 * through the proxy's `state: all` (larpinq admin-roadmap-page).
 *
 * @spec openspec/changes/roadmap-tab-columns/specs/roadmap-tab-columns/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnRoadmapTab from '../../src/components/CnRoadmapTab/CnRoadmapTab.vue'
import { roadmapColumns } from '../../src/utils/roadmapIssues.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const ISSUES = [
	{ number: 1, title: 'Maps', state: 'open', labels: [{ name: 'feature' }] },
	{ number: 2, title: 'Spells', state: 'open', labels: [{ name: 'In progress' }] },
	{ number: 3, title: 'Skills', state: 'closed', state_reason: 'completed', labels: [] },
	{ number: 4, title: 'Dropped', state: 'closed', state_reason: 'not_planned', labels: [] },
]
const stubs = { CnRoadmapItem: { name: 'CnRoadmapItem', props: ['item'], template: '<li class="roadmap-item" :data-number="item.number" />' } }

describe('roadmapColumns', () => {
	it('puts open issues under Planned or In development and completed ones under Available', () => {
		const columns = roadmapColumns(ISSUES)
		expect(columns.planned.map((i) => i.number)).toEqual([1])
		expect(columns.inProgress.map((i) => i.number)).toEqual([2])
		expect(columns.available.map((i) => i.number)).toEqual([3])
	})

	it('takes its own in-progress labels', () => {
		expect(roadmapColumns(ISSUES, ['feature']).inProgress.map((i) => i.number)).toEqual([1])
	})
})

describe('CnRoadmapTab columns', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { items: ISSUES } })
	})

	it('asks for closed issues too and draws three columns with counts', async () => {
		const w = mount(CnRoadmapTab, { props: { repo: 'ConductionNL/larpinq', layout: 'columns' }, global: { stubs } })
		await flush()
		expect(axios.get.mock.calls[0][1].params).toEqual({ repo: 'ConductionNL/larpinq', labels: 'enhancement,feature', state: 'all' })
		const counts = ['planned', 'in-progress', 'available'].map((key) => w.find(`[data-testid="cn-roadmap-column-${key}"]`).findAll('.roadmap-item').length)
		expect(counts).toEqual([1, 1, 1])
		expect(w.find('[data-testid="cn-roadmap-column-available"] .cn-roadmap-tab__column-count').text()).toBe('1')
	})

	it('keeps the grid and the open-only request by default', async () => {
		const w = mount(CnRoadmapTab, { props: { repo: 'ConductionNL/larpinq' }, global: { stubs } })
		await flush()
		expect(axios.get.mock.calls[0][1].params).toEqual({ repo: 'ConductionNL/larpinq', labels: 'enhancement,feature' })
		expect(w.find('[data-testid="cn-roadmap-columns"]').exists()).toBe(false)
	})
})
