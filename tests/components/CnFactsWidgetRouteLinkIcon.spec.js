/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts foot link to a route draws its icon, as a sidebar-tab or an href
 * link does: DqContact Woonadres and DqOrganisatie KvK en adres draw the map
 * pin before "Zaken op de kaart".
 *
 * @spec openspec/changes/facts-route-link-icon/specs/facts-widget/spec.md#requirement-a-route-link-keeps-its-icon
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/index.php${url}` }))

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

/**
 * @param {object} link The foot link.
 * @return {object} The wrapper.
 */
function mountWith(link) {
	return mount(CnFactsWidget, {
		props: { content: { fields: [{ path: 'street' }], link }, objectId: 'p-1', objectData: { id: 'p-1', street: 'Lindelaan 14' } },
		global: {
			stubs: {
				NcLoadingIcon: true,
				CnIcon: { props: ['name'], template: '<i class="stub-icon" :data-name="name" />' },
				RouterLink: { props: ['to'], template: '<a class="stub-link"><slot /></a>' },
			},
		},
	})
}

describe('CnFactsWidget route link icon', () => {
	it('draws the icon of a link to a route', () => {
		const w = mountWith({ label: 'Cases on the map', icon: 'MapMarkerOutline', route: { name: 'Cases', query: { requester: '@objectId' } } })
		const link = w.find('[data-testid="cn-facts-link"]')
		expect(link.text()).toBe('Cases on the map')
		expect(link.find('.stub-icon').attributes('data-name')).toBe('MapMarkerOutline')
	})

	it('draws no icon when the link names none', () => {
		const w = mountWith({ label: 'Cases on the map', route: { name: 'Cases' } })
		expect(w.find('[data-testid="cn-facts-link"] .stub-icon').exists()).toBe(false)
	})
})
