/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A registry widget reports its own card header (`header` event: the link
 * with `{total}` filled, a note, an action). A detail page showed it; a
 * dashboard card dropped the event, so record-list's "3 in total" and its
 * counted link never reached a dashboard.
 */
jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

const stubs = {
	CnDashboardGrid: { template: '<div><div v-for="it in layout" :key="it.id"><slot name="widget" :item="it" /></div></div>', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { props: ['headerLink', 'widgetId'], template: '<div class="ww" :data-id="widgetId" :data-link="JSON.stringify(headerLink)"><div class="ww-actions"><slot name="actions" /></div><slot /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

let reports = 0
const run = jest.fn()

const Reporting = {
	name: 'Reporting',
	props: ['content'],
	emits: ['header'],
	mounted() {
		this.report()
	},
	updated() {
		this.report()
	},
	methods: {
		report() {
			reports += 1
			this.$emit('header', { link: { label: 'All 3', route: 'Requests' }, note: '3 in total', action: this.content.withAction ? { label: 'Add', run } : null })
		},
	},
	template: '<div class="reporting" />',
}

const Silent = { name: 'Silent', props: ['content'], template: '<div class="silent" />' }

function mountPage(widgets) {
	return mount(CnDashboardPage, {
		propsData: {
			widgets,
			layout: widgets.map((d, i) => ({ id: String(i), widgetId: d.id, gridX: 0, gridY: i * 4, gridWidth: 6, gridHeight: 4 })),
		},
		global: { stubs, provide: { cnRegistry: { reporting: Reporting, silent: Silent } } },
	})
}

function card(w, id) {
	return w.findAll('.ww').find((el) => el.attributes('data-id') === id)
}

describe('CnDashboardPage: the header a registry widget reports', () => {
	beforeEach(() => {
		reports = 0
		run.mockClear()
	})

	it('shows the reported link and note on the card', async () => {
		const w = mountPage([{ id: 'list', type: 'reporting', title: 'Requests', content: { headerLink: { label: 'All {total}', route: 'Requests' } } }])
		await nextTick()
		await nextTick()
		expect(JSON.parse(card(w, 'list').attributes('data-link'))).toEqual({ label: 'All 3', route: 'Requests' })
		expect(card(w, 'list').find('[data-testid="cn-dashboard-widget-header-note"]').text()).toBe('3 in total')
		expect(card(w, 'list').find('[data-testid="cn-dashboard-widget-header-action"]').exists()).toBe(false)
	})

	it('draws a reported action as a button that runs it', async () => {
		const w = mountPage([{ id: 'list', type: 'reporting', title: 'Requests', content: { withAction: true } }])
		await nextTick()
		await nextTick()
		const button = card(w, 'list').find('[data-testid="cn-dashboard-widget-header-action"]')
		expect(button.text()).toBe('Add')
		await button.trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
	})

	it('a link on the placement or the definition still wins, and an unchanged report does not loop', async () => {
		const w = mountPage([{ id: 'list', type: 'reporting', title: 'Requests', headerLink: { label: 'Own', href: '#x' }, content: {} }])
		await nextTick()
		await nextTick()
		await nextTick()
		expect(JSON.parse(card(w, 'list').attributes('data-link'))).toEqual({ label: 'Own', href: '#x' })
		expect(reports).toBeLessThan(5)
	})

	it('a widget that reports nothing keeps the link its content asks for, and shows no note', async () => {
		const w = mountPage([{ id: 'quiet', type: 'silent', title: 'Quiet', content: { viewAllRoute: 'Tasks', viewAllLabel: 'All my tasks' } }])
		await nextTick()
		expect(JSON.parse(card(w, 'quiet').attributes('data-link'))).toEqual({ label: 'All my tasks', route: 'Tasks' })
		expect(card(w, 'quiet').find('[data-testid="cn-dashboard-widget-header-note"]').exists()).toBe(false)
	})
})
