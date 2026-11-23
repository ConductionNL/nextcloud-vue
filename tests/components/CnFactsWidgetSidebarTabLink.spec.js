/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A facts card's foot link can open the page's object sidebar on one of its
 * tabs: DqContact / DqOrganisatie "Historie bekijken" under the side history card.
 *
 * @spec openspec/changes/facts-link-opens-sidebar-tab/specs/record-widgets/spec.md#requirement-a-facts-link-can-open-a-sidebar-tab
 */
import { mount } from '@vue/test-utils'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const HISTORY = {
	fields: [{ as: 'text', parts: [{ text: 'Last changed on' }, { path: 'updated' }], separator: ' ' }],
	link: { label: 'View history', icon: 'History', sidebarTab: 'audit' },
}

function mountFacts(provide) {
	return mount(CnFactsWidget, {
		props: { content: HISTORY, objectId: 'r-1', objectData: { id: 'r-1', updated: '3 oktober' } },
		global: { provide, stubs: { NcLoadingIcon: true } },
	})
}

describe('CnFactsWidget — a link that opens a sidebar tab', () => {
	it('opens the object sidebar on the named tab', async () => {
		const objectSidebarState = { open: false, requestedTab: null }
		const w = mountFacts({ objectSidebarState })
		const link = w.find('[data-testid="cn-facts-link"]')
		expect(link.element.tagName).toBe('BUTTON')
		expect(link.attributes('type')).toBe('button')
		expect(link.text()).toBe('View history')
		await link.trigger('click')
		expect(objectSidebarState.open).toBe(true)
		expect(objectSidebarState.requestedTab).toBe('audit')
	})

	it('draws no link on a page without an object sidebar', () => {
		const w = mountFacts({})
		expect(w.find('[data-testid="cn-facts-link"]').exists()).toBe(false)
	})
})
