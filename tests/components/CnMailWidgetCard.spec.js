/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `mail` widget draws its own title row and stands in an untitled card on
 * a card surface (DqZaakEmail "E-mail"); bare in a grid cell and bare chrome.
 *
 * @spec openspec/changes/mail-widget-card/specs/mail-widget-card/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnMailTab/dashboardRegistration.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => new Promise(() => {})), post: jest.fn() } }))

const OBJECT = { id: 'z-1', '@self': { id: 'z-1', register: 'dossiq', schema: 'case' } }

function mountHost(props = {}) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'mail', type: 'mail', title: 'Email', content: { heading: 'Email' } }, chrome: 'card', objectId: 'z-1', object: OBJECT, ...props },
		global: { mocks: { t: (_a, s) => s }, stubs: { NcLoadingIcon: true, CnMailTab: { template: '<div class="cn-mail-tab" />' } } },
	})
}

describe('the mail widget on a card surface', () => {
	it('is registered as owning its title and asking for the card', () => {
		expect(getWidgetTypeEntry('mail')).toMatchObject({ ownsTitle: true, chrome: 'card' })
	})

	it('stands in an untitled card', () => {
		const card = mountHost().find('[data-testid="cn-detail-widget-self-titled-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__title').exists()).toBe(false)
		expect(card.find('.cn-mail-tab').exists()).toBe(true)
	})

	it('stays bare in a grid cell and in bare chrome', () => {
		expect(mountHost({ inGridCell: true }).find('[data-testid="cn-detail-widget-self-titled-card"]').exists()).toBe(false)
		expect(mountHost({ chrome: 'bare' }).find('[data-testid="cn-detail-widget-self-titled-card"]').exists()).toBe(false)
	})
})
