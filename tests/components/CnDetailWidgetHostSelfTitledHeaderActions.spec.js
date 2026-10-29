/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A self-titled widget in a card (the timeline as PqKlant's Activiteit) draws
 * the manifest `headerActions` in its own title row, beside its title. The
 * untitled card around it drew them in a row of their own above the title.
 *
 * @spec openspec/changes/self-titled-widget-header-actions/specs/widget-header-actions/spec.md#requirement-a-self-titled-widget-draws-its-header-actions-beside-its-title
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'

import '../../src/components/CnWidgetGrid/registerDashboardWidgets.js'
import '../../src/components/CnTimelineWidget/dashboardRegistration.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() } }))

const OBJECT = { id: 'k-1', '@self': { id: 'k-1', register: 'pipelinq', schema: 'client' } }

function mountHost(widget) {
	return mount(CnDetailWidgetHost, {
		props: { widget, chrome: 'card', objectId: 'k-1', object: OBJECT },
		global: { mocks: { t: (_a, s) => s }, stubs: { NcLoadingIcon: true } },
	})
}

const ACTIVITY = {
	id: 'client-activity',
	type: 'timeline',
	title: 'Activity',
	headerActions: [
		{ label: 'Link email', action: { type: 'navigate', target: '/x' } },
		{ label: 'Compose in Mail', action: { type: 'navigate', target: '/y' } },
	],
	content: { title: 'Activity', layout: 'feed', endpointSource: { url: '/apps/pipelinq/api/timeline' } },
}

describe('CnDetailWidgetHost: header actions of a self-titled widget', () => {
	it('stand in the widget\'s title row, beside the title', () => {
		const w = mountHost(ACTIVITY)
		const header = w.find('[data-testid="cn-timeline-widget-header"]')
		expect(header.exists()).toBe(true)
		expect(header.find('.cn-timeline-widget__title').text()).toBe('Activity')
		expect(header.text()).toContain('Link email')
		expect(header.text()).toContain('Compose in Mail')
	})

	it('are not drawn a second time by the card around it', () => {
		const card = mountHost(ACTIVITY).find('[data-testid="cn-detail-widget-self-titled-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__header').exists()).toBe(false)
	})

	it('leave a self-titled widget without actions as it was', () => {
		const w = mountHost({ ...ACTIVITY, headerActions: undefined })
		expect(w.find('.cn-timeline-widget__title').text()).toBe('Activity')
		expect(w.findAll('.cn-timeline-widget__header button')).toHaveLength(0)
	})
})
