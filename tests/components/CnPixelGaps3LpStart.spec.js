/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * LpStart: the emblem beside the greeting, an agenda placement without the
 * calendar's own chrome or footer link, and a second caption line under a
 * stat tile's count. Each first test is today's output without the key.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-greeting-can-carry-the-emblem
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-an-agenda-placement-can-drop-the-calendar-chrome
 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-a-stat-tile-can-carry-a-second-caption-line
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import CnCalendarWidget from '../../src/components/CnCalendarWidget/CnCalendarWidget.vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'
import CnHeaderWidget from '../../src/components/CnHeaderWidget/CnHeaderWidget.vue'
import CnStatWidget from '../../src/components/CnStatWidget/CnStatWidget.vue'

describe('CnHeaderWidget: emblem', () => {
	const mountHeader = (content) => mount(CnHeaderWidget, {
		propsData: { content, now: new Date('2026-10-05T14:00:00') },
		global: { mocks: { $route: { name: 'Start' } } },
	})

	it('draws no emblem without the key', () => {
		const w = mountHeader({ greeting: true, showDate: true, ground: true })
		expect(w.find('[data-testid="cn-header-widget-emblem"]').exists()).toBe(false)
		expect(w.classes()).not.toContain('cn-header-widget--with-emblem')
	})

	it('draws the theme emblem for emblem: true, before the text', () => {
		const w = mountHeader({ greeting: true, showDate: true, ground: true, emblem: true })
		const emblem = w.find('[data-testid="cn-header-widget-emblem"]')
		expect(emblem.classes()).toContain('cn-header-widget__emblem--theme')
		expect(emblem.attributes('aria-hidden')).toBe('true')
		expect(w.classes()).toContain('cn-header-widget--with-emblem')
		expect(emblem.element.nextElementSibling.classList.contains('cn-header-widget__content')).toBe(true)
	})

	it('draws an image for a URL, as decoration', () => {
		const emblem = mountHeader({ greeting: true, emblem: 'https://example.org/emblem.svg' }).find('[data-testid="cn-header-widget-emblem"]')
		expect(emblem.element.tagName).toBe('IMG')
		expect(emblem.attributes('src')).toBe('https://example.org/emblem.svg')
		expect(emblem.attributes('alt')).toBe('')
	})
})

describe('CnCalendarWidget: chrome', () => {
	const mountCal = (content) => mount(CnCalendarWidget, { propsData: { content } })

	it('shows the sub-heading and the view buttons by default', () => {
		const w = mountCal({ viewMode: 'agenda' })
		expect(w.find('.cn-calendar-widget__title').exists()).toBe(true)
		expect(w.findAll('.cn-calendar-widget__mode-btn')).toHaveLength(3)
	})

	it('drops both, and the header row, when told to', () => {
		const w = mountCal({ viewMode: 'agenda', showTitle: false, showViewModes: false })
		expect(w.find('.cn-calendar-widget__header').exists()).toBe(false)
	})
})

describe('CnDashboardPage: showButtons', () => {
	const WrapperStub = { props: ['buttons'], template: '<div class="ww" :data-buttons="String((buttons || []).length)"><slot /></div>' }
	const mountPage = (extra) => mount(CnDashboardPage, {
		propsData: {
			widgets: [{ id: 'agenda', type: 'custom', title: 'Agenda today', buttons: [{ type: 'more', text: 'More events', link: '#' }], ...extra.def }],
			layout: [{ id: '1', widgetId: 'agenda', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 4, ...extra.item }],
		},
		global: {
			stubs: {
				CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout'] },
				CnWidgetWrapper: WrapperStub,
				NcButton: { template: '<button><slot /></button>' },
				NcEmptyContent: { template: '<div />' },
				NcLoadingIcon: { template: '<div />' },
			},
		},
	})

	const buttonsOf = (extra) => {
		const w = mountPage(extra)
		return w.vm.getWidgetButtons({ id: '1', widgetId: 'agenda', ...extra.item })
	}

	it('passes the footer buttons by default', () => {
		expect(buttonsOf({})).toHaveLength(1)
	})

	it('drops them with showButtons: false on the placement or the definition', () => {
		expect(buttonsOf({ item: { showButtons: false } })).toEqual([])
		expect(buttonsOf({ def: { showButtons: false } })).toEqual([])
	})
})

describe('CnStatWidget: note', () => {
	const mountTile = (content) => mount(CnStatWidget, { propsData: { content: { label: 'dossiq', value: 14, caption: 'open cases', ...content } } })

	it('draws no second line without the key', () => {
		expect(mountTile({}).find('[data-testid="cn-stat-widget-note"]').exists()).toBe(false)
	})

	it('draws the note under the caption, coloured by noteVariant', () => {
		const note = mountTile({ note: '3 deadlines this week', noteVariant: 'danger' }).find('[data-testid="cn-stat-widget-note"]')
		expect(note.text()).toBe('3 deadlines this week')
		expect(note.classes()).toContain('cn-kpi-card__label--error')
	})
})
