/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPlanWidget: the `plan` detail widget over OpenRegister's case layer
 * (dossiq's CasePlanPanel; any app on OpenRegister cases).
 *
 * @spec openspec/changes/plan-widget/specs/plan-widget/spec.md#requirement-a-record-shows-its-planned-steps
 */
import axios from '@nextcloud/axios'
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import CnPlanWidget from '../../src/components/CnPlanWidget/CnPlanWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { offeredTransitions, planTree } from '../../src/utils/planTree.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/nc${p}`, generateOcsUrl: (p) => p, generateFilePath: (p) => p, imagePath: (p) => p }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const PLAN = {
	items: [
		{ id: 2, uuid: 'u-2', key: 'advice', name: 'Ask advice', state: 'active', type: 'task', parentItemId: 1, position: 1 },
		{ id: 1, uuid: 'u-1', key: 'intake', name: 'Intake', state: 'active', type: 'stage', parentItemId: null, position: 0 },
		{ id: 3, uuid: 'u-3', key: 'visit', name: 'Site visit', state: 'enabled', type: 'task', discretionary: true, parentItemId: 1, position: 0 },
		{ id: 4, uuid: 'u-4', key: 'decided', name: 'Decision made', state: 'available', type: 'milestone', parentItemId: null, position: 1 },
	],
}

const STUBS = {
	NcEmptyContent: { props: ['name', 'description'], template: '<div class="empty">{{ name }} {{ description }}<slot name="action" /></div>' },
	NcLoadingIcon: true,
}

/**
 * Mount the widget and let it read.
 *
 * @param {object} props Props.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The widget.
 */
async function mountWidget(props = { objectData: { id: 'z-82' } }) {
	const w = mount(CnPlanWidget, { props, global: { stubs: STUBS } })
	await flushPromises()
	return w
}

describe('CnPlanWidget', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
		emit.mockReset()
		axios.get.mockResolvedValue({ data: PLAN })
	})

	it('is the plan detail widget and draws stages with their items in order', async () => {
		expect(getWidgetTypeEntry('plan').renderer).toBe(CnPlanWidget)
		const w = await mountWidget()
		expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/cases/z-82')
		const names = w.findAll('.cn-plan-row__name').map((n) => n.text())
		expect(names).toEqual(['Intake', 'Site visit', 'Ask advice', 'Decision made'])
		expect(w.find('[data-testid="cn-plan-row-advice"]').text()).toContain('In progress')
	})

	it('offers the moves OpenRegister allows and reads the plan again after one', async () => {
		axios.post.mockResolvedValue({ data: {} })
		const w = await mountWidget()
		expect(w.find('[data-testid="cn-plan-enable-visit"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-plan-completed-advice"]').exists()).toBe(true)
		expect(w.find('[data-testid="cn-plan-completed-decided"]').exists()).toBe(true)
		await w.find('[data-testid="cn-plan-completed-advice"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/openregister/api/cases/items/u-2/transition', { to: 'completed', reason: '' })
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})

		await w.find('[data-testid="cn-plan-enable-visit"]').trigger('click')
		await flushPromises()
		expect(axios.post).toHaveBeenLastCalledWith('/nc/apps/openregister/api/cases/items/u-3/enable', {})
	})

	it('shows a refused move in OpenRegister\'s words', async () => {
		axios.post.mockRejectedValue({ response: { status: 409, data: { error: 'Task advice cannot go from active to completed while a sub-task is open.' } } })
		const w = await mountWidget()
		await w.find('[data-testid="cn-plan-completed-advice"]').trigger('click')
		await flushPromises()
		expect(w.find('[data-testid="cn-plan-error"]').text()).toContain('while a sub-task is open')
	})

	it('reads 404 as no plan and any other failure as an error with a retry', async () => {
		axios.get.mockRejectedValueOnce({ response: { status: 404 } })
		const none = await mountWidget({ objectId: 'z-1', content: { emptyText: 'This case type has no adaptive plan' } })
		expect(none.find('[data-testid="cn-plan-empty"]').text()).toBe('This case type has no adaptive plan')

		axios.get.mockRejectedValueOnce({ response: { status: 500, data: {} } })
		const down = await mountWidget()
		expect(down.find('[data-testid="cn-plan-error"]').text()).toContain('The plan could not be loaded')
		await down.find('[data-testid="cn-plan-retry"]').trigger('click')
		await flushPromises()
		expect(down.findAll('.cn-plan-row__name')).toHaveLength(4)
	})

	it('builds the tree and offers no move on a finished item', () => {
		expect(planTree(PLAN.items).map((n) => [n.key, n.children.map((c) => c.key)])).toEqual([['intake', ['visit', 'advice']], ['decided', []]])
		expect(offeredTransitions({ state: 'completed' })).toEqual([])
		expect(offeredTransitions({ state: 'enabled' })).toEqual(['terminated'])
		expect(offeredTransitions({ type: 'milestone', state: 'active' })).toEqual([])
	})
})
