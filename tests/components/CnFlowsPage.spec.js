/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFlowsPage / CnFlowEditorPage — the `flows` and `flow-detail` page types
 * (ADR-110 Decision 4).
 *
 * These exist so an app declares two manifest pages and no component files.
 * Before them, each adopting app copied ~270 lines of identical wrapper
 * differing only in an app-id string — and all three copies carried the same
 * dead listener, which is the regression pinned below.
 */
import { mount } from '@vue/test-utils'

// `jest.mock` is hoisted above every const in this file, so the store has to be
// created INSIDE the factory and read back afterwards — a const declared above
// would still be in its temporal dead zone when the factory runs.
jest.mock('../../src/composables/useFlowStore.js', () => {
	const s = { flows: [], loading: false, load: jest.fn(), save: jest.fn(), run: jest.fn() }
	return { useFlowStore: () => s, __store: s }
})

const { __store: store } = require('../../src/composables/useFlowStore.js')
const mockLoad = store.load
const mockSave = store.save
const mockRun = store.run

const CnFlowsPage = require('../../src/components/CnFlowsPage/CnFlowsPage.vue').default
const CnFlowEditorPage = require('../../src/components/CnFlowsPage/CnFlowEditorPage.vue').default

const IndexStub = {
	name: 'CnIndexPage',
	props: ['title', 'description', 'columns', 'objects', 'loading', 'selectable', 'showAdd', 'showViewAction', 'showEditAction', 'actions', 'rowClickToView'],
	template: '<div class="index-stub"><slot name="header-actions" /></div>',
}
const DetailStub = {
	name: 'CnFlowDetail',
	props: ['id', 'app'],
	template: '<div class="detail-stub" />',
}

function mountList(propsData = {}) {
	return mount(CnFlowsPage, {
		propsData,
		stubs: { CnIndexPage: IndexStub, NcButton: { template: '<button><slot /></button>' } },
		mocks: { $router: { push: jest.fn(), replace: jest.fn() } },
	})
}

describe('CnFlowsPage', () => {
	beforeEach(() => {
		store.flows = []
		mockLoad.mockReset()
	})

	it('scopes the store load to the app', async () => {
		mountList({ app: 'dossiq' })
		await Promise.resolve()
		expect(mockLoad).toHaveBeenCalledWith({ app: 'dossiq' })
	})

	it('loads unscoped when no app is given (the fleet-wide surface)', async () => {
		mountList()
		await Promise.resolve()
		expect(mockLoad).toHaveBeenCalledWith({ app: null })
	})

	it('listens for row-click, not rowClick', () => {
		// THE REGRESSION. CnIndexPage emits `row-click`; Vue 3 does not convert
		// a camelCase template listener, so the `@rowClick` the three
		// hand-copied wrappers used never fired and clicking a row did nothing.
		// Silent: no error, no warning, the row just is not a link.
		const wrapper = mountList({ app: 'dossiq' })
		const index = wrapper.findComponent(IndexStub)
		expect(Object.keys(index.vm.$attrs).concat(Object.keys(index.vm._.vnode.props || {})))
			.toEqual(expect.arrayContaining([expect.stringMatching(/row-click|onRowClick/i)]))
	})

	it('navigates to the detail route on open', () => {
		const wrapper = mountList({ app: 'dossiq' })
		wrapper.vm.openFlow({ id: 'abc' })
		expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/flows/abc')
	})

	it('falls back to uuid when a flow has no id', () => {
		const wrapper = mountList()
		wrapper.vm.openFlow({ uuid: 'u-1' })
		expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/flows/u-1')
	})

	it('does not navigate for a flow with neither id nor uuid', () => {
		const wrapper = mountList()
		wrapper.vm.openFlow({})
		expect(wrapper.vm.$router.push).not.toHaveBeenCalled()
	})

	it('honours a non-default detailRoute', () => {
		const wrapper = mountList({ detailRoute: '/automations' })
		wrapper.vm.createFlow()
		expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/automations/new')
	})

	it('says an ownerless flow will not start', () => {
		// Enabled and dispatchable are not the same thing, and the list is the
		// only place a user learns that before waiting for a run that never comes.
		const wrapper = mountList()
		expect(wrapper.vm.statusLabel({ enabled: true, owner: null })).toMatch(/not start/i)
		expect(wrapper.vm.statusLabel({ enabled: true, owner: 'admin' })).not.toMatch(/not start/i)
		expect(wrapper.vm.statusLabel({ enabled: false, owner: 'admin' })).toMatch(/disabled/i)
	})

	it('renders a status label per row', () => {
		store.flows = [{ id: '1', name: 'A', enabled: true, owner: null }]
		const wrapper = mountList()
		expect(wrapper.vm.rows[0].statusLabel).toMatch(/not start/i)
	})
})

describe('CnFlowEditorPage', () => {
	beforeEach(() => {
		mockSave.mockReset().mockResolvedValue({ id: 'server-id' })
		mockRun.mockReset().mockResolvedValue(undefined)
	})

	function mountEditor(propsData = {}, routeId = 'new') {
		return mount(CnFlowEditorPage, {
			propsData,
			stubs: { CnFlowDetail: DetailStub },
			mocks: {
				$router: { push: jest.fn(), replace: jest.fn() },
				$route: { params: { id: routeId } },
			},
		})
	}

	it('passes the app through to the canvas', () => {
		const wrapper = mountEditor({ app: 'dossiq' })
		expect(wrapper.findComponent(DetailStub).props('app')).toBe('dossiq')
	})

	it('takes the flow id from the route', () => {
		const wrapper = mountEditor({}, 'flow-7')
		expect(wrapper.findComponent(DetailStub).props('id')).toBe('flow-7')
	})

	it('swaps the route once a new flow gets its server id', async () => {
		// Without this the URL stays on `new`, and a reload loses the flow that
		// was just saved.
		const wrapper = mountEditor({ app: 'dossiq' }, 'new')
		await wrapper.vm.onSave()
		expect(wrapper.vm.$router.replace).toHaveBeenCalledWith('/flows/server-id')
	})

	it('does not swap the route when editing an existing flow', async () => {
		const wrapper = mountEditor({ app: 'dossiq' }, 'existing')
		await wrapper.vm.onSave()
		expect(wrapper.vm.$router.replace).not.toHaveBeenCalled()
	})

	it('runs the stored flow', async () => {
		const wrapper = mountEditor({ app: 'dossiq' }, 'existing')
		await wrapper.vm.onRun()
		expect(mockRun).toHaveBeenCalled()
	})
})
