/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A library widget that draws its own title row (registry `ownsTitle`) and
 * asks for the card (`chrome: "card"`), such as the retention widget, stands
 * in an untitled card on a card surface (a tab stack, the side column). In a
 * tab stack it was drawn bare, without border or background (board
 * DqZaakArchivering). A body grid cell and bare chrome keep it bare.
 *
 * @spec openspec/changes/retention-card-in-tab-stack/specs/detail-page/spec.md
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../src/components/CnTimelineWidget/dashboardRegistration.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: { id: 'z-1', '@self': {} } })), post: jest.fn() } }))

const OBJECT = { id: 'z-1', '@self': { id: 'z-1', register: 'dossiq', schema: 'case' } }

function mountHost(props = {}) {
	return mount(CnDetailWidgetHost, {
		props: { widget: { id: 'w', type: 'retention', title: 'Archiving' }, chrome: 'card', objectId: 'z-1', object: OBJECT, ...props },
		global: { mocks: { t: (_a, s) => s }, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnDetailWidgetHost: a self-titled library widget on a card surface', () => {
	it('is registered as owning its title and asking for the card', () => {
		expect(getWidgetTypeEntry('retention')).toMatchObject({ ownsTitle: true, chrome: 'card' })
	})

	it('registers the timeline the same way, so a case history in a tab stack is a card', () => {
		expect(getWidgetTypeEntry('timeline')).toMatchObject({ ownsTitle: true, chrome: 'card' })
	})

	it('stands in an untitled card, its own title row inside', () => {
		const w = mountHost()
		const card = w.find('[data-testid="cn-detail-widget-self-titled-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__title').exists()).toBe(false)
		expect(card.find('[data-testid="cn-retention"]').exists()).toBe(true)
	})

	it('stays bare in a body grid cell and in bare chrome', () => {
		expect(mountHost({ inGridCell: true }).find('[data-testid="cn-detail-widget-self-titled-card"]').exists()).toBe(false)
		expect(mountHost({ chrome: 'bare' }).find('[data-testid="cn-detail-widget-self-titled-card"]').exists()).toBe(false)
		expect(mountHost({ chrome: 'bare' }).find('[data-testid="cn-retention"]').exists()).toBe(true)
	})
})
