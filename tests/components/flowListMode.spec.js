/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'
import CnFlowBoard from '../../src/components/CnFlowsPage/CnFlowBoard.vue'
import CnFlowEditorPage from '../../src/components/CnFlowsPage/CnFlowEditorPage.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u, generateOcsUrl: (u) => u }))

const stubs = { CnGraphCanvas: { template: '<div data-testid="canvas-stub" />' }, CnFlowStepList: { template: '<div data-testid="list-stub" />', emits: ['add', 'edit'] }, NcEmptyContent: true, Sitemap: true }

/**
 * @param {object} component The component.
 * @param {object} [options] `{ props, route }`.
 * @return {object} It mounted.
 */
function mounted(component, { props = {}, route = {} } = {}) {
	setActivePinia(createPinia())

	return mount(component, { props, global: { stubs, mocks: { t: (app, s) => s, $route: { params: {}, query: {}, ...route } } } })
}

describe('CnFlowDetail views', () => {
	it('stays on the canvas by default', () => {
		const wrapper = mounted(CnFlowDetail)

		expect(wrapper.find('[data-testid="canvas-stub"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(false)
	})

	it('draws the list in place of the canvas, without the canvas buttons', () => {
		const wrapper = mounted(CnFlowDetail, { props: { view: 'list' } })

		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="canvas-stub"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="flow-add-step"]').exists()).toBe(false)
		expect(wrapper.find('.cn-flow-detail__toolbar-group').exists()).toBe(false)
	})

	it('opens the step dialog from the list', async () => {
		const wrapper = mounted(CnFlowDetail, { props: { view: 'list' } })

		wrapper.vm.onListEdit('a')

		expect(wrapper.vm.store.selectedNodeId).toBe('a')
		expect(wrapper.vm.store.editingNodeId).toBe('a')
	})

	it('only selects when the host has a step panel', async () => {
		const wrapper = mounted(CnFlowDetail, { props: { view: 'list', stepPanel: true } })

		wrapper.vm.onListEdit('a')

		expect(wrapper.vm.store.selectedNodeId).toBe('a')
		expect(wrapper.vm.store.editingNodeId).toBeNull()
	})

	it('words a run state for the list', () => {
		const { vm } = mounted(CnFlowDetail, { props: { view: 'list' } })
		vm.runStateOf = () => 'failed'

		expect(vm.listStepState('a')).toEqual({ label: 'Failed', variant: 'error' })
		vm.runStateOf = () => null
		expect(vm.listStepState('a')).toBeNull()
	})
})

describe('CnFlowBoard list mode', () => {
	it('shows no switch unless asked', () => {
		expect(mounted(CnFlowBoard).find('[data-testid="flow-view-switch"]').exists()).toBe(false)
	})

	it('ignores a list view it was not given list mode for', () => {
		expect(mounted(CnFlowBoard, { props: { view: 'list' } }).vm.inList).toBe(false)
	})

	it('switches between the views and hides the palette in the list', async () => {
		const wrapper = mounted(CnFlowBoard, { props: { listMode: true, palette: 'column' } })

		expect(wrapper.vm.showPalette).toBe(true)
		await wrapper.find('[data-testid="flow-view-list"]').trigger('click')

		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(true)
		expect(wrapper.vm.showPalette).toBe(false)
	})

	it('opens on the list when asked', () => {
		expect(mounted(CnFlowBoard, { props: { listMode: true, view: 'list' } }).find('[data-testid="list-stub"]').exists()).toBe(true)
	})
})

describe('CnFlowEditorPage list mode', () => {
	it('shows no switch unless asked', () => {
		const wrapper = mounted(CnFlowEditorPage, { props: { look: 'nextcloud' } })

		expect(wrapper.find('[data-testid="flow-view-switch"]').exists()).toBe(false)
	})

	it('offers the switch on the plain editor too', async () => {
		const wrapper = mounted(CnFlowEditorPage, { props: { look: 'nextcloud', listMode: true } })

		await wrapper.find('[data-testid="flow-view-list"]').trigger('click')

		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(true)
	})

	it('opens on the list from the address', () => {
		const wrapper = mounted(CnFlowEditorPage, { props: { look: 'nextcloud', listMode: true }, route: { query: { view: 'list' } } })

		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(true)
	})

	it('hands list mode to the board look', () => {
		const wrapper = mounted(CnFlowEditorPage, { props: { look: 'board', listMode: true, view: 'list' } })

		expect(wrapper.find('[data-testid="flow-view-switch"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="list-stub"]').exists()).toBe(true)
	})
})
