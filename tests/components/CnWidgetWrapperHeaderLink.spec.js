/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `headerLink` draws one text link in a widget's header ("All deadlines",
 * "To the board") instead of hiding the way out in the overflow menu. A
 * route is a router link, an href a plain anchor; the label is translated.
 * Without it the header is byte for byte what it was.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-widget-header-carries-a-text-link
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import CnWidgetWrapper from '../../src/components/CnWidgetWrapper/CnWidgetWrapper.vue'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	NcActions: { name: 'NcActions', template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { name: 'NcActionButton', template: '<button><slot /></button>' },
	NcActionLink: { name: 'NcActionLink', template: '<a><slot /></a>' },
	RouterLink: { name: 'RouterLink', props: ['to'], template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>' },
	DotsHorizontal: true, Refresh: true, LightbulbOutline: true, BookOpenVariant: true,
}

function mountWrapper(propsData = {}, mocks = {}) {
	return mount(CnWidgetWrapper, {
		propsData: { title: 'Deadlines this week', showTitle: true, ...propsData },
		stubs,
		mocks: { $route: { name: 'Dashboard' }, ...mocks },
		provide: { cnAppId: 'dossiq', cnTranslate: (key) => (key === 'All deadlines' ? 'Alle termijnen' : key) },
	})
}

const LINK = '[data-testid="cn-widget-wrapper-header-link"]'

describe('CnWidgetWrapper — headerLink', () => {
	it('draws no link by default', () => {
		expect(mountWrapper().find(LINK).exists()).toBe(false)
	})

	it('draws a translated router link for a route, with params and query', () => {
		const wrapper = mountWrapper(
			{ headerLink: { label: 'All deadlines', route: 'Cases', params: { view: 'due' }, query: { within: '7d' } } },
			{ $router: { push: jest.fn() } },
		)
		const link = wrapper.find(LINK)
		expect(link.exists()).toBe(true)
		expect(link.text()).toBe('Alle termijnen')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'Cases', params: { view: 'due' }, query: { within: '7d' } })
	})

	it('draws a plain anchor for an href and keeps it when the menu is off', () => {
		const wrapper = mountWrapper({ showActions: false, headerLink: { label: 'To the board', href: '/apps/dossiq/board' } })
		const link = wrapper.find(LINK)
		expect(link.element.tagName).toBe('A')
		expect(link.attributes('href')).toBe('/apps/dossiq/board')
		expect(wrapper.find('.nc-actions-stub').exists()).toBe(false)
	})

	it('draws nothing for a route without a router or a link without a label', () => {
		expect(mountWrapper({ headerLink: { label: 'All deadlines', route: 'Cases' } }).find(LINK).exists()).toBe(false)
		expect(mountWrapper({ headerLink: { href: '/x' } }).find(LINK).exists()).toBe(false)
	})
})

describe('CnDashboardPage — forwards headerLink', () => {
	const pageStubs = {
		CnDashboardGrid: {
			template: '<div><div v-for="item in layout" :key="item.id"><slot name="widget" :item="item" /></div></div>',
			props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'],
		},
		CnWidgetWrapper: { template: '<div class="wrapper-stub" :data-link="JSON.stringify(headerLink)"><slot /></div>', props: ['title', 'headerLink'] },
		NcButton: { template: '<button><slot /></button>' },
		NcEmptyContent: true, NcLoadingIcon: true,
	}

	it('reads the link from the layout entry, else the widget definition', () => {
		const widgets = [
			{ id: 'week', title: 'Deadlines', type: 'custom', headerLink: { label: 'All deadlines', route: 'Cases' } },
			{ id: 'steps', title: 'Per step', type: 'custom' },
		]
		const layout = [
			{ id: 1, widgetId: 'week', gridX: 0, gridY: 0, gridWidth: 8, gridHeight: 4 },
			{ id: 2, widgetId: 'steps', gridX: 8, gridY: 0, gridWidth: 4, gridHeight: 4, headerLink: { label: 'To the board', route: 'Board' } },
		]
		const wrapper = mount(CnDashboardPage, {
			props: { title: 'Dashboard', widgets, layout },
			global: { stubs: pageStubs },
			slots: { 'widget-week': '<p>week</p>', 'widget-steps': '<p>steps</p>' },
		})
		const links = wrapper.findAll('.wrapper-stub').map((w) => JSON.parse(w.attributes('data-link')))
		expect(links).toEqual([
			{ label: 'All deadlines', route: 'Cases' },
			{ label: 'To the board', route: 'Board' },
		])
	})
})
