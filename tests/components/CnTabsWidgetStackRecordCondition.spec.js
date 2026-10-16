/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * On a detail page a widget in a tab's stack (`widgetIds`) follows its own
 * `visibleWhen` against the record and `@context`, as a grid widget does
 * (board PqContactmoment: the interaction card only on interaction tickets).
 *
 * @spec openspec/changes/tab-stack-child-visible-when/specs/tab-stack-child-visible-when/spec.md
 */
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-data', type: 'data', title: 'Ticket' },
	{ id: 'w-interaction', type: 'custom', title: 'Contact moment', visibleWhen: { field: 'kind', op: 'eq', value: 'interaction' } },
	{ id: 'w-review', type: 'custom', title: 'Review', visibleWhen: { field: '@context.ticketType.review', op: 'eq', value: true } },
	{ id: 'w-note', type: 'text', title: 'Note' },
]

function mountTabs(objectData, provide = {}) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: [{ widgetIds: ['w-data', 'w-interaction', 'w-review', 'w-note'], label: 'Overview' }] }, availableWidgets: WIDGETS, objectData },
		global: {
			provide,
			stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
}

const shown = (w) => w.findAll('.host').map((h) => h.text())

describe('CnTabsWidget stack on a detail page', () => {
	it('draws a stacked widget only while its own condition holds for the record', async () => {
		const ticket = mountTabs({ id: 't1', kind: 'question' })
		await nextTick()
		expect(shown(ticket)).toEqual(['w-data', 'w-note'])
		const interaction = mountTabs({ id: 't2', kind: 'interaction' })
		await nextTick()
		expect(shown(interaction)).toEqual(['w-data', 'w-interaction', 'w-note'])
	})

	it('reads @context from the records the page names, and hides while they load', async () => {
		const rows = ref(null)
		const w = mountTabs({ id: 't2', kind: 'interaction' }, { cnDetailVisibilityRows: rows })
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-note'])
		rows.value = { ticketType: { review: true } }
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-interaction', 'w-review', 'w-note'])
	})

	it('hides nothing without a record, as on a dashboard', async () => {
		const w = mountTabs(null)
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-interaction', 'w-review', 'w-note'])
	})
})
