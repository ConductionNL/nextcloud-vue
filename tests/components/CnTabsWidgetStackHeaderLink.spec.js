/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A stack of cards in a tab (`widgetIds`) draws each later card's own
 * manifest header link in its card header. The strip draws the first
 * widget's link (#1658); the links of the cards below it had no place.
 *
 * @spec openspec/changes/stack-card-header-link/specs/stack-card-header-link/spec.md#requirement-a-stacked-card-draws-its-own-header-link
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'open', type: 'object-table', title: 'Open invoices', headerLink: { label: 'All sales invoices', route: 'AccountsReceivable' } },
	{ id: 'runs', type: 'object-table', title: 'Reminder runs', content: { headerLink: { label: 'All reminder runs', route: 'DunningRuns' } } },
]

const HostStub = { props: ['widget', 'showHeaderLink'], template: '<div class="host" />' }

describe('a stack of cards in a tab', () => {
	it('asks the cards after the first to draw their own header link', async () => {
		const w = mount(CnTabsWidget, {
			props: { content: { tabs: [{ widgetIds: ['open', 'runs'], label: 'Openstaand' }] }, availableWidgets: WIDGETS },
			global: { stubs: { CnDetailWidgetHost: HostStub } },
		})
		await nextTick()
		const hosts = w.findAllComponents(HostStub)
		expect(hosts.map((host) => host.props('widget').id)).toEqual(['open', 'runs'])
		expect(hosts[0].props('showHeaderLink')).toBeFalsy()
		expect(hosts[1].props('showHeaderLink')).toBe(true)
	})
})

describe('CnDetailWidgetHost card header link', () => {
	const cardHeaderLink = CnDetailWidgetHost.computed.cardHeaderLink

	it('takes the manifest link when asked and the renderer reports none', () => {
		const link = cardHeaderLink.call({ rendererHeader: { link: null }, showHeaderLink: true, widget: WIDGETS[1] })
		expect(link).toEqual({ label: 'All reminder runs', route: 'DunningRuns' })
	})

	it('keeps the renderer\'s own link first', () => {
		const own = { label: 'Own', href: '#own' }
		expect(cardHeaderLink.call({ rendererHeader: { link: own }, showHeaderLink: true, widget: WIDGETS[1] })).toBe(own)
	})

	it('draws no manifest link unless asked', () => {
		expect(cardHeaderLink.call({ rendererHeader: { link: null }, showHeaderLink: false, widget: WIDGETS[1] })).toBeNull()
	})
})
