/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card's header link can open another tab of the same page
 * (`headerLink: { label, tab }`, DqZaaktype: the side Historie card's
 * "Alles bekijken" opens the Historie tab). The link is a `#<tab>` anchor, and
 * the tab strip follows a hash that changes while the page is open.
 *
 * @spec openspec/changes/header-link-switches-tab/specs/header-link/spec.md#requirement-a-header-link-can-open-another-tab-of-the-page
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { headerLinkTarget } from '../../src/utils/contentHeaderLink.js'

const WIDGETS = [
	{ id: 'w-overview', type: 'custom', title: 'Overview' },
	{ id: 'w-history', type: 'custom', title: 'History' },
]

describe('header link to a tab', () => {
	it('draws a tab link as a #<tab> anchor, router or not', () => {
		expect(headerLinkTarget({ label: 'Alles bekijken', tab: 'history' }, true)).toEqual({ tag: 'a', attrs: { href: '#history' } })
		expect(headerLinkTarget({ label: 'Alles bekijken', tab: 'history' }, false)).toEqual({ tag: 'a', attrs: { href: '#history' } })
	})

	it('opens the tab a hash names when the hash changes on an open page', async () => {
		window.history.replaceState(null, '', window.location.pathname)
		const w = mount(CnTabsWidget, {
			props: {
				content: { tabs: [{ id: 'overview', widgetId: 'w-overview', label: 'Overview' }, { id: 'history', widgetId: 'w-history', label: 'History' }] },
				availableWidgets: WIDGETS,
				objectData: { id: 'ct-1' },
			},
			global: { stubs: { CnWidgetRenderer: true, CnDetailWidgetHost: true } },
			attachTo: document.body,
		})
		expect(w.vm.activeTab.id).toBe('overview')
		window.history.replaceState(null, '', `${window.location.pathname}#history`)
		window.dispatchEvent(new HashChangeEvent('hashchange'))
		await nextTick()
		expect(w.vm.activeTab.id).toBe('history')
		w.unmount()
	})
})
