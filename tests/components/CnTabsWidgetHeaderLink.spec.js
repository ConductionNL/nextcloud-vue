/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnTabsWidget draws the open panel's header link beside the strip. A panel
 * draws no card header, so without this the link a widget declares in the
 * manifest ("All sales invoices") was dropped inside a tab.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{
		id: 'open-invoices',
		type: 'object-table',
		title: 'Open invoices',
		content: { source: { register: 'shillinq', schema: 'ARInvoice' } },
		headerLink: { label: 'All sales invoices', route: 'AccountsReceivable' },
	},
	{ id: 'reminder-runs', type: 'object-table', title: 'Reminder runs', content: { headerLink: { label: 'All reminder runs', route: 'DunningRuns' } } },
	{ id: 'no-link', type: 'object-table', title: 'Payment requests', content: {} },
]

const TABS = { tabs: [{ widgetId: 'open-invoices' }, { widgetId: 'no-link' }, { widgetId: 'reminder-runs' }] }

/**
 * @param {object} [options] Mount options.
 * @param {boolean} [options.withRouter] Install a router.
 * @return {Promise<{w: object, router: object|null}>} The wrapper and the router.
 */
async function mountWidget({ withRouter = true } = {}) {
	let router = null
	const plugins = []
	if (withRouter) {
		const page = { render: () => null }
		router = createRouter({
			history: createMemoryHistory(),
			routes: [
				{ path: '/', name: 'Home', component: page },
				{ path: '/receivables', name: 'AccountsReceivable', component: page },
				{ path: '/dunning-runs', name: 'DunningRuns', component: page },
			],
		})
		plugins.push(router)
		router.push('/')
		await router.isReady()
	}
	const w = mount(CnTabsWidget, {
		props: { content: TABS, availableWidgets: WIDGETS },
		global: {
			plugins,
			provide: { cnTranslate: (key) => (key === 'All sales invoices' ? 'Alle verkoopfacturen' : key) },
			stubs: { CnDetailWidgetHost: { template: '<div class="host" />' } },
		},
	})
	await nextTick()
	return { w, router }
}

describe('CnTabsWidget header link', () => {
	it('draws the open tab\'s headerLink beside the strip, translated, outside the tablist', async () => {
		const { w } = await mountWidget()
		const link = w.find('[data-testid="cn-tabs-widget-header-link"]')
		expect(link.exists()).toBe(true)
		expect(link.text()).toBe('Alle verkoopfacturen')
		expect(link.attributes('href')).toContain('/receivables')
		expect(w.find('[role="tablist"]').find('[data-testid="cn-tabs-widget-header-link"]').exists()).toBe(false)
	})

	it('follows the router route when clicked', async () => {
		const { w, router } = await mountWidget()
		await w.find('[data-testid="cn-tabs-widget-header-link"]').trigger('click')
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(router.currentRoute.value.name).toBe('AccountsReceivable')
	})

	it('changes with the tab: none for a widget without one, the content link for another', async () => {
		const { w } = await mountWidget()
		await w.findAll('[role="tab"]')[1].trigger('click')
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-header-link"]').exists()).toBe(false)

		await w.findAll('[role="tab"]')[2].trigger('click')
		await nextTick()
		const link = w.find('[data-testid="cn-tabs-widget-header-link"]')
		expect(link.text()).toBe('All reminder runs')
		expect(link.attributes('href')).toContain('/dunning-runs')
	})

	it('draws no route link without a router', async () => {
		const { w } = await mountWidget({ withRouter: false })
		expect(w.find('[data-testid="cn-tabs-widget-header-link"]').exists()).toBe(false)
	})
})
