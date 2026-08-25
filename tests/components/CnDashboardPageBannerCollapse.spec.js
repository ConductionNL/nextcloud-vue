/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A hidden banner must surrender its grid cell. CnBannerWidget's root v-if
 * renders nothing while its `visibleWhen` is unmet, but the page still
 * rendered the CnWidgetWrapper card and GridStack (float: true) kept the
 * reserved row — a dashboard whose fail-safe banners are correctly hidden
 * opened on a column of tall empty cards (keepiq: two migration banners +
 * pending-apps, i.e. three blank rows above the fold, almost always).
 *
 * The fix is display-only: `displayLayout` drops collapsed banners and
 * re-compacts the remaining items upward, while the authored `layout` prop
 * stays untouched and edit mode keeps every widget placeable.
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { evaluateVisibleWhen } from '@/utils/visibleWhen.js'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/utils/visibleWhen.js', () => ({
	...jest.requireActual('@/utils/visibleWhen.js'),
	evaluateVisibleWhen: jest.fn(),
}))

const renderer = { template: '<div class="rend" />' }
registerDashboardWidget('test-banner-neighbour', { renderer, form: {}, defaultContent: {}, displayName: 'N', icon: 'X' })

const stubs = {
	CnDashboardGrid: {
		template: '<div><div v-for="it in layout" :key="it.id" class="cell" :data-wid="it.widgetId" :data-y="it.gridY"><slot name="widget" :item="it" /></div></div>',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
	},
	CnWidgetWrapper: { props: ['flush', 'showTitle', 'title'], template: '<div class="ww"><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const CONDITION = { endpoint: '/api/status', field: 'status', op: 'eq', value: 'in_progress' }

const mountWith = ({ banner = {}, layoutExtra = {} } = {}) => mount(CnDashboardPage, {
	propsData: {
		widgets: [
			{ id: 'b', type: 'banner', ...banner },
			{ id: 'w', type: 'test-banner-neighbour' },
		],
		layout: [
			{ id: '1', widgetId: 'b', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1, ...layoutExtra },
			{ id: '2', widgetId: 'w', gridX: 0, gridY: 1, gridWidth: 6, gridHeight: 4 },
		],
	},
	stubs,
})

const cells = (wrapper) => wrapper.findAll('.cell').map((c) => ({ wid: c.attributes('data-wid'), y: c.attributes('data-y') }))

describe('CnDashboardPage — hidden banners collapse their grid cell', () => {
	beforeEach(() => evaluateVisibleWhen.mockReset())

	it('drops a banner whose visibleWhen is unmet and compacts the rows below it up', async () => {
		evaluateVisibleWhen.mockResolvedValue(false)
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('keeps a banner whose visibleWhen evaluated true, at its authored spot', async () => {
		evaluateVisibleWhen.mockResolvedValue(true)
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
	})

	it('keeps an unconditional banner (text, no visibleWhen) without evaluating anything', async () => {
		const wrapper = mountWith({ banner: { content: { text: 'Static notice' } } })
		await flushPromises()
		expect(cells(wrapper)).toHaveLength(2)
		expect(evaluateVisibleWhen).not.toHaveBeenCalled()
	})

	it('collapses a banner with no text at all — it can never render', async () => {
		const wrapper = mountWith({ banner: { content: {} } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('honours the legacy manifest shape carrying visibleWhen under def.props', async () => {
		evaluateVisibleWhen.mockResolvedValue(false)
		const wrapper = mountWith({ banner: { props: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(evaluateVisibleWhen).toHaveBeenCalledWith(CONDITION)
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('shows every widget at its authored spot while editing, hidden banners included', async () => {
		evaluateVisibleWhen.mockResolvedValue(false)
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		wrapper.vm.isEditing = true
		await wrapper.vm.$nextTick()
		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
	})

	it('never mutates the authored layout prop', async () => {
		evaluateVisibleWhen.mockResolvedValue(false)
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(wrapper.props('layout').map((l) => l.gridY)).toEqual([0, 1])
	})
})
