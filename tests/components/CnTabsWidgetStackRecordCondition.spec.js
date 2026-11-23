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
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'

const mockEvaluate = jest.fn()
jest.mock('../../src/utils/visibleWhen.js', () => {
	const actual = jest.requireActual('../../src/utils/visibleWhen.js')
	return { ...actual, evaluateVisibleWhen: (...a) => mockEvaluate(...a) }
})

import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-data', type: 'data', title: 'Ticket' },
	{ id: 'w-interaction', type: 'custom', title: 'Contact moment', visibleWhen: { field: 'kind', op: 'eq', value: 'interaction' } },
	{ id: 'w-review', type: 'custom', title: 'Review', visibleWhen: { field: '@context.ticketType.review', op: 'eq', value: true } },
	{ id: 'w-note', type: 'text', title: 'Note' },
	{ id: 'w-checklist', type: 'record-list', title: 'Checklist', visibleWhen: { endpoint: '/api/checklist', field: 'items', op: 'notEmpty' } },
]

function mountTabs(objectData, provide = {}, widgetIds = ['w-data', 'w-interaction', 'w-review', 'w-note']) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: [{ widgetIds, label: 'Overview' }] }, availableWidgets: WIDGETS, objectData, objectId: objectData?.id },
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
		const state = reactive({ rows: null })
		const holder = {
			get value() {
				return state.rows
			},
		}
		const w = mountTabs({ id: 't2', kind: 'interaction' }, { cnDetailVisibilityRows: holder })
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-note'])
		state.rows = { ticketType: { review: true } }
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-interaction', 'w-review', 'w-note'])
	})

	it('draws a stacked widget with a request condition only once the answer holds', async () => {
		let answer
		mockEvaluate.mockReturnValueOnce(new Promise((resolve) => {
			answer = resolve
		}))
		const w = mountTabs({ id: 't1' }, {}, ['w-data', 'w-checklist'])
		await flushPromises()
		expect(shown(w)).toEqual(['w-data'])
		answer(true)
		await flushPromises()
		expect(shown(w)).toEqual(['w-data', 'w-checklist'])
		expect(mockEvaluate.mock.calls[0][1].objectId).toBe('t1')
	})

	it('leaves a stacked widget out when the request condition does not hold', async () => {
		mockEvaluate.mockResolvedValueOnce(false)
		const w = mountTabs({ id: 't1' }, {}, ['w-data', 'w-checklist'])
		await flushPromises()
		expect(shown(w)).toEqual(['w-data'])
	})

	it('asks again for another record and hides until that answer is in', async () => {
		mockEvaluate.mockResolvedValueOnce(true)
		const w = mountTabs({ id: 't1' }, {}, ['w-data', 'w-checklist'])
		await flushPromises()
		expect(shown(w)).toEqual(['w-data', 'w-checklist'])
		mockEvaluate.mockResolvedValueOnce(false)
		await w.setProps({ objectId: 't2', objectData: { id: 't2' } })
		await flushPromises()
		expect(shown(w)).toEqual(['w-data'])
	})

	it('hides nothing without a record, as on a dashboard', async () => {
		const w = mountTabs(null)
		await nextTick()
		expect(shown(w)).toEqual(['w-data', 'w-interaction', 'w-review', 'w-note'])
	})
})
