/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-dashboard-parity: the board dashboard header, the segmented period
 * group, the compact segmented control, the board KPI tile and the KPI row.
 * Every board rule is opt-in; the same mounts without `cnLook` render as before.
 *
 * @spec openspec/changes/screens-dashboard-parity/specs/dashboard-page/spec.md
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import { markRaw } from 'vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import CnKpiGrid from '@/components/CnKpiGrid/CnKpiGrid.vue'
import CnSegmentedControl from '@/components/CnSegmentedControl/CnSegmentedControl.vue'
import CnStatsBlock from '@/components/CnStatsBlock/CnStatsBlock.vue'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const pageStubs = {
	CnDashboardGrid: {
		name: 'CnDashboardGrid',
		template: '<div class="cn-dashboard-grid-stub"></div>',
		props: ['layout', 'editable', 'columns', 'cellHeight', 'margin', 'float'],
	},
	CnWidgetWrapper: { template: '<div class="wrapper-stub"><slot /></div>' },
	CnWidgetRenderer: { template: '<div />' },
	CnTileWidget: { template: '<div />' },
	CnChartWidget: { template: '<div />' },
	CnStatsBlockWidget: { template: '<div />' },
	CnWidgetRefItem: { template: '<div />' },
	CnBuildiqEditButton: { template: '<button class="buildiq-stub">buildiq</button>' },
	CnActionButtons: { template: '<div class="header-actions-stub"><button class="primary-stub">New publication</button></div>' },
	CnActionsMenu: { template: '<button class="actions-menu-stub">Actions</button>' },
	NcButton: { template: '<button class="edit-stub"><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	CnDateRangePicker: { template: '<div class="picker-stub" />', props: ['value', 'presets'] },
}

/**
 * @param {object} propsData page props
 * @param {object} [extra] extra mount options
 * @return {object} wrapper
 */
function mountPage(propsData, extra = {}) {
	return mount(CnDashboardPage, {
		propsData: { layout: [], widgets: [], ...propsData },
		stubs: pageStubs,
		...extra,
	})
}

const board = { global: { provide: { cnLook: 'board' } } }

describe('CnSegmentedControl: size and mode', () => {
	const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C', iconOnly: true }]

	it('is normal by default: no compact class', () => {
		const w = mount(CnSegmentedControl, { propsData: { options, modelValue: 'a', ariaLabel: 'x' } })
		expect(w.classes()).not.toContain('cn-segmented-control--compact')
		expect(w.attributes('role')).toBe('radiogroup')
	})

	it('compact adds the compact class and marks an icon-only segment', () => {
		const w = mount(CnSegmentedControl, { propsData: { options, modelValue: 'a', ariaLabel: 'x', size: 'compact' } })
		expect(w.classes()).toContain('cn-segmented-control--compact')
		expect(w.findAll('button')[2].classes()).toContain('cn-segmented-control__option--icon-only')
		expect(w.findAll('button')[0].classes()).not.toContain('cn-segmented-control__option--icon-only')
	})

	it('toggle mode uses aria-pressed on plain buttons and keeps every button in the tab order', () => {
		const w = mount(CnSegmentedControl, { propsData: { options, modelValue: 'b', ariaLabel: 'x', mode: 'toggle' } })
		expect(w.attributes('role')).toBe('group')
		const buttons = w.findAll('button')
		expect(buttons.map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true', 'false'])
		expect(buttons[0].attributes('role')).toBeUndefined()
		expect(buttons[0].attributes('aria-checked')).toBeUndefined()
		expect(buttons.every((b) => b.attributes('tabindex') === '0')).toBe(true)
	})
})

describe('CnKpiGrid: columns auto', () => {
	it('takes the auto class and keeps the numeric classes', () => {
		expect(mount(CnKpiGrid, { propsData: { columns: 'auto' } }).classes()).toContain('cn-kpi-grid--cols-auto')
		expect(mount(CnKpiGrid).classes()).toContain('cn-kpi-grid--cols-4')
		expect(mount(CnKpiGrid, { propsData: { columns: 2 } }).classes()).toContain('cn-kpi-grid--cols-2')
	})

	it('rejects other values', () => {
		expect(CnKpiGrid.props.columns.validator('auto')).toBe(true)
		expect(CnKpiGrid.props.columns.validator(5)).toBe(false)
		expect(CnKpiGrid.props.columns.validator('wide')).toBe(false)
	})
})

describe('CnStatWidget: board KPI tile', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		axios.get.mockResolvedValue({ data: { n: 14 } })
	})

	/**
	 * @param {object} content tile content
	 * @param {string} url unique endpoint url (responses are cached per url)
	 * @param {boolean} isBoard board look on
	 * @return {Promise<object>} wrapper
	 */
	async function tile(content, url, isBoard = true) {
		const w = mount(CnStatWidget, {
			propsData: { content: { label: 'Open', icon: 'FolderOutline', caption: '3 new', layout: 'stacked', valueField: 'n', endpointSource: { url }, ...content } },
			stubs: { NcLoadingIcon: { template: '<span />' } },
			global: { provide: { cnWorkspaceContext: {}, ...(isBoard ? { cnLook: 'board' } : {}) } },
		})
		await flush()
		await flush()
		await flush()
		return w
	}

	it('shows the glyph before the label only when the tile has a link', async () => {
		const linked = await tile({ link: '/apps/x/list?status=open' }, '/apps/dossiq/api/b-1')
		const plain = await tile({}, '/apps/dossiq/api/b-2')
		expect(linked.classes()).toContain('cn-kpi-card--board')
		expect(linked.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(true)
		expect(linked.find('.cn-kpi-card__icon').exists()).toBe(false)
		expect(plain.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(false)
		expect(plain.find('.cn-kpi-card__icon').exists()).toBe(false)
	})

	it('draws no icon circle in the horizontal layout either', async () => {
		const w = await tile({ layout: 'horizontal' }, '/apps/dossiq/api/b-3')
		expect(w.find('.cn-kpi-card__icon').exists()).toBe(false)
	})

	it('colours the caption for a warning or error and leaves success grey', async () => {
		expect((await tile({ captionVariant: 'warning' }, '/apps/dossiq/api/b-4')).find('[data-testid="cn-stat-widget-caption"]').classes()).toContain('cn-kpi-card__label--warning')
		expect((await tile({ captionVariant: 'error' }, '/apps/dossiq/api/b-5')).find('[data-testid="cn-stat-widget-caption"]').classes()).toContain('cn-kpi-card__label--error')
		const success = await tile({ captionVariantWhen: [{ op: 'gte', value: 1, variant: 'success' }] }, '/apps/dossiq/api/b-6')
		const caption = success.find('[data-testid="cn-stat-widget-caption"]')
		expect(caption.classes()).not.toContain('cn-kpi-card__label--success')
		expect(caption.text()).toBe('3 new')
	})

	it('keeps today\'s tile without the board look: icon circle on the horizontal card, success coloured', async () => {
		const horizontal = await tile({ layout: 'horizontal' }, '/apps/dossiq/api/b-7', false)
		expect(horizontal.classes()).not.toContain('cn-kpi-card--board')
		expect(horizontal.find('.cn-kpi-card__icon').exists()).toBe(true)
		const success = await tile({ captionVariant: 'success' }, '/apps/dossiq/api/b-8', false)
		expect(success.find('[data-testid="cn-stat-widget-caption"]').classes()).toContain('cn-kpi-card__label--success')
		expect(success.find('[data-testid="cn-stat-widget-glyph"]').exists()).toBe(false)
	})
})

describe('CnStatsBlock: board KPI tile', () => {
	it('carries the board class and shows the glyph only on a link tile', () => {
		const icon = markRaw({ name: 'Ico', props: ['size'], template: '<svg class="ico" />' })
		const linked = mount(CnStatsBlock, { propsData: { title: 'Cases', count: 4, icon, layout: 'stacked', clickable: true }, global: { provide: { cnLook: 'board' } } })
		const plain = mount(CnStatsBlock, { propsData: { title: 'Cases', count: 4, icon, layout: 'stacked' }, global: { provide: { cnLook: 'board' } } })
		const off = mount(CnStatsBlock, { propsData: { title: 'Cases', count: 4, icon, layout: 'stacked' } })
		expect(linked.classes()).toContain('cn-kpi-card--board')
		expect(linked.find('[data-testid="cn-stats-block-glyph"]').exists()).toBe(true)
		expect(plain.find('[data-testid="cn-stats-block-glyph"]').exists()).toBe(false)
		expect(off.classes()).not.toContain('cn-kpi-card--board')
	})
})

describe('CnDashboardPage: board header', () => {
	it('renders an h1 and the greeting as the subtitle, with the primary rightmost', () => {
		const w = mountPage({ title: 'Dashboard', description: 'Good morning, Pieter', allowEdit: true, headerActions: [{ id: 'new', label: 'New publication' }] }, board)
		const h1 = w.find('h1.cn-dashboard-page__title')
		expect(h1.exists()).toBe(true)
		expect(h1.text()).toBe('Dashboard')
		expect(w.find('h2.cn-dashboard-page__title').exists()).toBe(false)
		expect(w.find('.cn-dashboard-page__description').text()).toBe('Good morning, Pieter')
		const order = w.findAll('.cn-dashboard-page__header-actions > *').map((el) => el.text().trim())
		expect(order).toEqual(['Edit', 'Actions', 'buildiq', 'New publication'])
	})

	it('keeps the h2 and today\'s order without the board look', () => {
		const w = mountPage({ title: 'Dashboard', description: 'd', allowEdit: true, headerActions: [{ id: 'new', label: 'New publication' }] })
		expect(w.find('h2.cn-dashboard-page__title').exists()).toBe(true)
		expect(w.find('h1').exists()).toBe(false)
		const order = w.findAll('.cn-dashboard-page__header-actions > *').map((el) => el.text().trim())
		expect(order).toEqual(['New publication', 'Edit', 'buildiq', 'Actions'])
	})
})

describe('CnDashboardPage: segmented period', () => {
	beforeEach(() => {
		try {
			localStorage.clear()
		} catch { /* ignore */ }
	})

	const dateRange = {
		enabled: true,
		control: 'segmented',
		presets: [
			{ id: 'last-30', label: 'Last 30 days' },
			{ id: 'quarter', label: 'Quarter' },
		],
	}

	it('renders one compact group named Period, and pressing a segment emits once', async () => {
		const w = mountPage({ dateRange, title: 'D' })
		const group = w.find('[data-testid="cn-dashboard-page-date-segmented"] .cn-segmented-control')
		expect(group.classes()).toContain('cn-segmented-control--compact')
		expect(group.attributes('aria-label')).toBe('Period')
		expect(w.find('.picker-stub').exists()).toBe(false)
		const buttons = group.findAll('button')
		expect(buttons.map((b) => b.text())).toEqual(['Last 30 days', 'Quarter'])
		await buttons[1].trigger('click')
		expect(w.emitted('date-range-change')).toHaveLength(1)
		expect(w.emitted('date-range-change')[0][0].preset).toBe('quarter')
		expect(w.findAll('[data-testid="cn-dashboard-page-date-segmented"] button').map((b) => b.attributes('aria-pressed'))).toEqual(['false', 'true'])
	})

	it('persists the choice like a pill does', async () => {
		const w = mountPage({ dateRange: { ...dateRange, persistKey: 'seg-test' }, title: 'D' })
		await w.findAll('[data-testid="cn-dashboard-page-date-segmented"] button')[1].trigger('click')
		const remount = mountPage({ dateRange: { ...dateRange, persistKey: 'seg-test' }, title: 'D' })
		const pressed = remount.findAll('[data-testid="cn-dashboard-page-date-segmented"] button').map((b) => b.attributes('aria-pressed'))
		expect(pressed).toEqual(['false', 'true'])
	})

	it('offers the custom range as the last segment', async () => {
		const w = mountPage({ dateRange: { ...dateRange, presets: [...dateRange.presets, { id: 'custom', label: 'Custom' }] }, title: 'D' })
		const buttons = w.findAll('[data-testid="cn-dashboard-page-date-segmented"] button')
		expect(buttons.map((b) => b.text())).toEqual(['Last 30 days', 'Quarter', 'Custom'])
		await buttons[2].trigger('click')
		expect(w.emitted('date-range-change')[0][0].preset).toBe('custom')
		expect(w.find('[data-testid="cn-dashboard-page-date-segment-custom"]').exists()).toBe(true)
	})

	it('keeps the pills and the default control unchanged', () => {
		expect(mountPage({ dateRange: { ...dateRange, control: 'pills' }, title: 'D' }).find('[data-testid="cn-dashboard-page-date-pills"]').exists()).toBe(true)
		expect(mountPage({ dateRange: { enabled: true }, title: 'D' }).find('.picker-stub').exists()).toBe(true)
	})
})

describe('CnDashboardPage: KPI row', () => {
	const widgets = [
		{ id: 'kpi-a', type: 'custom', title: 'A' },
		{ id: 'kpi-b', type: 'custom', title: 'B' },
		{ id: 'other', type: 'custom', title: 'Other' },
	]
	const layout = [
		{ id: 1, widgetId: 'kpi-a', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
		{ id: 2, widgetId: 'other', gridX: 0, gridY: 2, gridWidth: 6, gridHeight: 4 },
	]
	const slots = {
		'widget-kpi-a': '<span class="slot-a">a</span>',
		'widget-kpi-b': '<span class="slot-b">b</span>',
		'widget-other': '<span class="slot-o">o</span>',
	}

	it('renders the named widgets above the grid in an auto grid, in the listed order', () => {
		const w = mountPage({ widgets, layout, kpiRow: ['kpi-b', 'kpi-a'] }, { slots })
		const row = w.find('[data-testid="cn-dashboard-page-kpi-row"]')
		expect(row.classes()).toContain('cn-kpi-grid--cols-auto')
		expect(row.findAll('.cn-dashboard-page__kpi-cell').map((c) => c.attributes('data-testid'))).toEqual([
			'cn-dashboard-page-kpi-kpi-b',
			'cn-dashboard-page-kpi-kpi-a',
		])
		expect(w.html().indexOf('cn-dashboard-page-kpi-row')).toBeLessThan(w.html().indexOf('cn-dashboard-grid-stub'))
	})

	it('leaves the row out of the grid layout, also in edit mode', async () => {
		const w = mountPage({ widgets, layout, kpiRow: ['kpi-a', 'kpi-b'], allowEdit: true }, { slots })
		const ids = () => w.findComponent({ name: 'CnDashboardGrid' }).props('layout').map((i) => i.widgetId)
		expect(ids()).toEqual(['other'])
		await w.find('.edit-stub').trigger('click')
		expect(ids()).toEqual(['other'])
		expect(w.find('[data-testid="cn-dashboard-page-kpi-row"]').exists()).toBe(true)
	})

	it('skips an id that names no widget, with a development warning', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const w = mountPage({ widgets, layout, kpiRow: ['kpi-a', 'ghost'] }, { slots })
		expect(w.findAll('.cn-dashboard-page__kpi-cell')).toHaveLength(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('ghost'))
		warn.mockRestore()
	})

	it('renders as before without kpiRow', () => {
		const w = mountPage({ widgets, layout }, { slots })
		expect(w.find('[data-testid="cn-dashboard-page-kpi-row"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'CnDashboardGrid' }).props('layout').map((i) => i.widgetId)).toEqual(['kpi-a', 'other'])
	})
})
