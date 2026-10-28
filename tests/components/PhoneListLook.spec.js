/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * My work on a phone as PqMobiel draws it: the filter bar without a card,
 * the lens chips as pills in one row that scrolls sideways, and the items
 * grouped by when they are due, each group an uppercase heading over its
 * own card ("TE LAAT" in the error ink).
 *
 * @spec openspec/changes/phone-list-look/specs/phone-list-look/spec.md
 */
import axios from '@nextcloud/axios'
import { flushPromises, mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import CnRecordListWidget from '@/components/CnRecordListWidget/CnRecordListWidget.vue'
import CnSegmentedControl from '@/components/CnSegmentedControl/CnSegmentedControl.vue'
import CnWorkspaceFilterWidget from '@/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue'

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (path) => path, generateOcsUrl: (path) => path }))

describe('a widget without a card on one viewport', () => {
	const stubs = {
		CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
		CnWidgetWrapper: { props: ['borderless'], template: '<div class="ww" :data-borderless="String(borderless)"><slot /></div>' },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: { template: '<div />' },
		NcLoadingIcon: { template: '<div />' },
	}

	async function borderlessAt(narrow, borderless) {
		window.matchMedia = jest.fn(() => ({ matches: narrow, addEventListener: jest.fn(), removeEventListener: jest.fn() }))
		const wrapper = mount(CnDashboardPage, {
			propsData: {
				widgets: [{ id: 'w', type: 'custom', title: 'Show', borderless }],
				layout: [{ id: '1', widgetId: 'w', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 1 }],
			},
			slots: { 'widget-w': '<div />' },
			stubs,
		})
		await flushPromises()
		return wrapper.find('.ww').attributes('data-borderless')
	}

	it('drops the card on a phone only with borderless "narrow"', async () => {
		expect(await borderlessAt(true, 'narrow')).toBe('true')
		expect(await borderlessAt(false, 'narrow')).toBe('false')
	})

	it('drops it everywhere with borderless true on the widget', async () => {
		expect(await borderlessAt(false, true)).toBe('true')
	})
})

describe('lens chips as pills on a phone', () => {
	it('marks the segmented control for pills on a phone', () => {
		const wrapper = mount(CnSegmentedControl, { props: { options: [{ value: 'all', label: 'All' }], modelValue: 'all', phonePills: true } })
		expect(wrapper.classes()).toContain('cn-segmented-control--phone-pills')
	})

	it('passes chipsOnPhone "pills" from a chips filter', () => {
		const wrapper = mount(CnWorkspaceFilterWidget, {
			props: { content: { style: 'chips', label: 'Show', writes: '@workspace.lens', chipsOnPhone: 'pills', options: [{ value: 'all', label: 'All' }, { value: 'tickets', label: 'Tickets' }] } },
		})
		expect(wrapper.findComponent(CnSegmentedControl).props('phonePills')).toBe(true)
	})

	it('keeps the segmented group without it', () => {
		const wrapper = mount(CnWorkspaceFilterWidget, {
			props: { content: { style: 'chips', label: 'Show', writes: '@workspace.lens', options: [{ value: 'all', label: 'All' }] } },
		})
		expect(wrapper.findComponent(CnSegmentedControl).props('phonePills')).toBe(false)
	})
})

describe('due groups as cards', () => {
	const ROWS = [
		{ id: '1', title: 'Afvalpas werkt niet bij de container', dueGroup: 'late' },
		{ id: '2', title: 'Marktkraam op zaterdag', dueGroup: 'today' },
		{ id: '3', title: 'Terugbellen over de parkeervergunning', dueGroup: 'late' },
	]

	async function render(content) {
		axios.get.mockResolvedValue({ data: { results: ROWS, total: ROWS.length } })
		const wrapper = mount(CnRecordListWidget, {
			props: { content: { register: 'r', schema: 's', title: '{title}', groupBy: 'dueGroup', groupOrder: ['late', 'today'], valueLabels: { dueGroup: { late: 'Overdue', today: 'Today' } }, ...content } },
			global: { stubs: { NcLoadingIcon: true } },
		})
		await flushPromises()
		await flushPromises()
		return wrapper
	}

	it('draws each group as its own card under its heading, the heading toned by its group', async () => {
		const wrapper = await render({ groupLook: 'cards', groupTones: { late: 'error' } })
		expect(wrapper.classes()).toContain('cn-record-list--group-cards')
		const headings = wrapper.findAll('[data-testid="cn-record-list-group-heading"]')
		expect(headings.map((h) => h.text())).toEqual(['Overdue', 'Today'])
		expect(headings.at(0).classes()).toContain('cn-record-list__group-heading--error')
		expect(headings.at(1).classes().some((c) => c.startsWith('cn-record-list__group-heading--'))).toBe(false)
		expect(wrapper.findAll('[data-testid="cn-record-list-group"]')).toHaveLength(2)
	})

	it('keeps the plain headings without groupLook', async () => {
		const wrapper = await render({})
		expect(wrapper.classes()).not.toContain('cn-record-list--group-cards')
	})
})
