/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab's stack can follow the order of a list on the record (`orderFrom`),
 * as a case type's `overviewCards` orders the cards of a case's Overview tab.
 *
 * @spec openspec/changes/tab-stack-order-from/specs/tab-stack-order-from/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = ['summary', 'request', 'details', 'terms', 'hours'].map((id) => ({ id, type: 'custom', title: id }))

function mountTabs(objectData, tab, provide = {}) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: [{ widgetIds: ['summary', 'request', 'details', 'terms', 'hours'], label: 'Overview', ...tab }] }, availableWidgets: WIDGETS, objectData, objectId: objectData?.id },
		global: {
			provide,
			stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
}

const shown = (w) => w.findAll('.host').map((h) => h.text())
const rows = (value) => ({ cnDetailVisibilityRows: { value } })

describe('CnTabsWidget stack orderFrom', () => {
	it('draws the listed widgets in the list\'s order and keeps the others in their places', async () => {
		const w = mountTabs({ id: 'c1' }, { orderFrom: '@context.caseType.overviewCards' }, rows({ caseType: { overviewCards: ['terms', 'unknown', 'request'] } }))
		await nextTick()
		expect(shown(w)).toEqual(['summary', 'terms', 'details', 'request', 'hours'])
	})

	it('reads a path on the record itself', async () => {
		const w = mountTabs({ id: 'c1', order: ['hours', 'summary'] }, { orderFrom: 'order' })
		await nextTick()
		expect(shown(w)).toEqual(['hours', 'request', 'details', 'terms', 'summary'])
	})

	it('keeps the authored order without a list, with an empty list, or without orderFrom', async () => {
		const authored = ['summary', 'request', 'details', 'terms', 'hours']
		const none = mountTabs({ id: 'c1' }, { orderFrom: 'order' })
		const empty = mountTabs({ id: 'c1', order: [] }, { orderFrom: 'order' })
		const off = mountTabs({ id: 'c1', order: ['hours'] }, {})
		await nextTick()
		expect(shown(none)).toEqual(authored)
		expect(shown(empty)).toEqual(authored)
		expect(shown(off)).toEqual(authored)
	})
})
