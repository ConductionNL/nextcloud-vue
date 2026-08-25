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
 * stays untouched and edit mode keeps every widget placeable. The grid's
 * FIRST paint waits for the predicates to settle, so a banner is present or
 * absent from the first frame — never popping in after load and reflowing
 * the page. The page hands its verdict (and the read value) to the banner,
 * which renders from it without a second request and interpolates `{value}`
 * into its text.
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper.

import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { registerDashboardWidget } from '@/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { readVisibleWhenValue } from '@/utils/visibleWhen.js'
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@/utils/visibleWhen.js', () => ({
	...jest.requireActual('@/utils/visibleWhen.js'),
	readVisibleWhenValue: jest.fn(),
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
	NcLoadingIcon: { template: '<div class="loading" />' },
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
	beforeEach(() => readVisibleWhenValue.mockReset())

	it('drops a banner whose visibleWhen is unmet and compacts the rows below it up', async () => {
		readVisibleWhenValue.mockResolvedValue('none')
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('keeps a banner whose visibleWhen evaluated true, at its authored spot', async () => {
		readVisibleWhenValue.mockResolvedValue('in_progress')
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
	})

	it('holds the grid\'s first paint until the predicates settle — no pop-in reflow', async () => {
		let resolveFetch
		readVisibleWhenValue.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		// Predicate pending: loading icon instead of a grid that would reflow.
		expect(wrapper.findAll('.cell')).toHaveLength(0)
		expect(wrapper.find('.loading').exists()).toBe(true)
		resolveFetch('in_progress')
		await flushPromises()
		// First grid frame already contains the banner at its authored spot.
		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
	})

	it('paints immediately when the page has no conditional banners', () => {
		const wrapper = mountWith({ banner: { content: { text: 'Static notice' } } })
		expect(cells(wrapper)).toHaveLength(2)
		expect(readVisibleWhenValue).not.toHaveBeenCalled()
	})

	it('hands its verdict to the banner — one fetch total, {value} interpolated into the text', async () => {
		readVisibleWhenValue.mockResolvedValue(3)
		const wrapper = mountWith({
			banner: {
				content: {
					text: '{value} application(s) awaiting approval',
					visibleWhen: { endpoint: '/api/summary', field: 'pending', op: 'gt', value: 0 },
				},
			},
		})
		await flushPromises()
		expect(readVisibleWhenValue).toHaveBeenCalledTimes(1)
		expect(wrapper.find('[data-testid="cn-banner-widget-text"]').text())
			.toBe('3 application(s) awaiting approval')
	})

	it('collapses ANY widget with an unmet def-level visibleWhen — not just banners', async () => {
		readVisibleWhenValue.mockResolvedValue(0)
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				widgets: [
					{ id: 'q', type: 'test-banner-neighbour', visibleWhen: { endpoint: '/api/summary', field: 'pending', op: 'gt', value: 0 } },
					{ id: 'w', type: 'test-banner-neighbour' },
				],
				layout: [
					{ id: '1', widgetId: 'q', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
					{ id: '2', widgetId: 'w', gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 4 },
				],
			},
			stubs,
		})
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('shows a def-level-conditional widget at its authored spot when the condition holds', async () => {
		readVisibleWhenValue.mockResolvedValue(2)
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				widgets: [
					{ id: 'q', type: 'test-banner-neighbour', visibleWhen: { endpoint: '/api/summary', field: 'pending', op: 'gt', value: 0 } },
					{ id: 'w', type: 'test-banner-neighbour' },
				],
				layout: [
					{ id: '1', widgetId: 'q', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 4 },
					{ id: '2', widgetId: 'w', gridX: 0, gridY: 4, gridWidth: 6, gridHeight: 4 },
				],
			},
			stubs,
		})
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'q', y: '0' }, { wid: 'w', y: '4' }])
	})

	it('collapses a banner with no text at all — it can never render', async () => {
		const wrapper = mountWith({ banner: { content: {} } })
		await flushPromises()
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('honours the legacy manifest shape carrying visibleWhen under def.props', async () => {
		readVisibleWhenValue.mockResolvedValue('none')
		const wrapper = mountWith({ banner: { props: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(readVisibleWhenValue).toHaveBeenCalledWith(CONDITION)
		expect(cells(wrapper)).toEqual([{ wid: 'w', y: '0' }])
	})

	it('shows every widget at its authored spot while editing, hidden banners included', async () => {
		readVisibleWhenValue.mockResolvedValue('none')
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		wrapper.vm.isEditing = true
		await wrapper.vm.$nextTick()
		expect(cells(wrapper)).toEqual([{ wid: 'b', y: '0' }, { wid: 'w', y: '1' }])
	})

	it('never mutates the authored layout prop', async () => {
		readVisibleWhenValue.mockResolvedValue('none')
		const wrapper = mountWith({ banner: { content: { text: 'T', visibleWhen: CONDITION } } })
		await flushPromises()
		expect(wrapper.props('layout').map((l) => l.gridY)).toEqual([0, 1])
	})
})
