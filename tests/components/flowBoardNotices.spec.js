/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { getCurrentUser } from '@nextcloud/auth'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowStepList from '../../src/components/CnFlowDetail/CnFlowStepList.vue'
import CnFlowBoard from '../../src/components/CnFlowsPage/CnFlowBoard.vue'
import CnFlowEditorPage from '../../src/components/CnFlowsPage/CnFlowEditorPage.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'anne', isAdmin: false })), getRequestToken: () => 'token' }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u, generateOcsUrl: (u) => u }))

const stubs = {
	CnFlowDetail: { name: 'CnFlowDetail', props: ['readonlySteps'], template: '<div />' },
	CnFlowSidebar: true,
	CnBuildiqEditButton: true,
	NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
}
const FLOW = {
	id: 'f1',
	name: 'Sync',
	version: 1,
	lifecycleStatus: 'draft',
	nodes: [{ id: 'a', type: 'openregister.set-fields' }, { id: 'w', type: 'openregister.webhook' }],
	edges: [],
}

/**
 * @param {object} [options] `{ props, slots }`.
 * @return {Promise<object>} The board over a seeded store.
 */
async function board({ props = {}, slots = {} } = {}) {
	const wrapper = mount(CnFlowBoard, { props: { id: 'f1', layout: 'canvas', ...props }, slots, global: { stubs } })
	Object.assign(wrapper.vm.store, { flow: JSON.parse(JSON.stringify(FLOW)), selectedNodeId: null })
	await wrapper.vm.$nextTick()

	return wrapper
}

describe('the notice', () => {
	it('stays an info card by default', async () => {
		const wrapper = await board({ props: { notice: 'Hello' } })

		expect(wrapper.find('.note').attributes('data-type')).toBe('info')
	})

	it('takes a level, for a drift warning', async () => {
		const wrapper = await board({ props: { notice: 'Changed outside buildiq', noticeLevel: 'warning' } })

		expect(wrapper.find('.note').attributes('data-type')).toBe('warning')
	})

	it('gives way to the slot', async () => {
		const wrapper = await board({ props: { notice: 'Hello' }, slots: { notice: '<p class="own">Drift</p>' } })

		expect(wrapper.find('.own').text()).toBe('Drift')
		expect(wrapper.find('[data-testid="flow-board-notice"]').exists()).toBe(false)
	})
})

describe('admin only steps', () => {
	afterEach(() => getCurrentUser.mockImplementation(() => ({ uid: 'anne', isAdmin: false })))

	it('are read only for anyone but an admin, by id or by type', async () => {
		const byId = await board({ props: { adminSteps: ['a'] } })
		const byType = await board({ props: { adminSteps: ['openregister.webhook'] } })

		expect(byId.vm.readonlyStepIds).toEqual(['a'])
		expect(byType.vm.readonlyStepIds).toEqual(['w'])
		expect(byType.findComponent({ name: 'CnFlowDetail' }).props('readonlySteps')).toEqual(['w'])
	})

	it('change nothing for an admin', async () => {
		getCurrentUser.mockImplementation(() => ({ uid: 'root', isAdmin: true }))
		const wrapper = await board({ props: { adminSteps: ['a'] } })

		expect(wrapper.vm.readonlyStepIds).toEqual([])
	})

	it('are none by default', async () => {
		expect((await board()).vm.readonlyStepIds).toEqual([])
	})

	it('say why in the step panel and lock its fields', async () => {
		const wrapper = await board({ props: { adminSteps: ['w'] } })
		wrapper.vm.store.selectedNodeId = 'w'
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="flow-board-admin-step"]').text()).toContain('Only admins may use this action')
		expect(wrapper.vm.stepLocked).toBe(true)
		expect(wrapper.find('[data-testid="flow-board-delete-step"]').attributes('disabled')).toBeDefined()
	})

	it('hand the panel\'s note to the slot, with the step', async () => {
		const wrapper = await board({ slots: { 'step-notice': ({ node }) => h('p', { class: 'own' }, node.id) } })
		wrapper.vm.store.selectedNodeId = 'a'
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.own').text()).toBe('a')
	})

	it('show no buttons in the list', async () => {
		const list = mount(CnFlowStepList, { props: { readonlySteps: ['w'] } })
		Object.assign(list.vm.store, { flow: JSON.parse(JSON.stringify(FLOW)) })
		await list.vm.$nextTick()
		const rows = list.findAll('[data-testid="flow-step-row"]')
		const row = rows.find((item) => item.find('[data-testid="flow-step-admin"]').exists())

		expect(rows).toHaveLength(2)
		expect(row.find('[data-testid="flow-step-delete"]').exists()).toBe(false)
		expect(rows.find((item) => item !== row).find('[data-testid="flow-step-delete"]').exists()).toBe(true)
	})

	it('reach the list through the editor', () => {
		const detail = mount(CnFlowDetail, {
			props: { view: 'list', readonlySteps: ['w'] },
			global: { stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true, CnFlowStepList: { name: 'CnFlowStepList', props: ['readonlySteps'], template: '<div />' } } },
		})

		expect(detail.findComponent({ name: 'CnFlowStepList' }).props('readonlySteps')).toEqual(['w'])
	})
})

describe('CnFlowEditorPage', () => {
	it('passes the notice slots and options on to the board look', () => {
		const wrapper = mount(CnFlowEditorPage, {
			props: { look: 'board', notice: 'n', noticeLevel: 'warning', adminSteps: ['a'] },
			slots: { notice: '<p class="own">Drift</p>' },
			global: { stubs, mocks: { $route: { params: {}, query: {} } } },
		})
		const inner = wrapper.findComponent(CnFlowBoard)

		expect(inner.props()).toMatchObject({ noticeLevel: 'warning', adminSteps: ['a'] })
		expect(wrapper.find('.own').exists()).toBe(true)
	})
})
