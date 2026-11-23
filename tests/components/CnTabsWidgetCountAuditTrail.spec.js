/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Board PqJourney draws "Geschiedenis 3": the History tab counts the record's
 * changes, not every read of it. `countFrom: { auditTrail: true,
 * excludeActions }` counts the record's audit entries the History card would
 * show.
 *
 * @spec openspec/changes/tab-count-audit-trail/specs/tab-counts/spec.md#requirement-a-history-tab-can-count-the-records-changes
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-data', type: 'data', title: 'Overview' },
	{ id: 'w-history', type: 'audit-trail', title: 'History' },
]

async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountTabs(tabs) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectId: 'j-1', objectData: { id: 'j-1' }, register: 'pipelinq', schema: 'journey' },
		global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } } },
	})
}

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve({
			results: [
				{ action: 'create' },
				{ action: 'read' },
				{ action: 'read' },
				{ action: 'update', changed: { status: { old: 'draft', new: 'active' } } },
				{ action: 'update', changed: { flowStatus: { old: 'not_compiled', new: 'compiled' } } },
			],
		}),
	})
})

describe('CnTabsWidget countFrom auditTrail', () => {
	it('counts the record\'s audit entries without the excluded actions', async () => {
		const w = mountTabs([{ widgetId: 'w-data' }, { widgetId: 'w-history', countFrom: { auditTrail: true, excludeActions: ['read'] } }])
		await flush()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(String(global.fetch.mock.calls[0][0])).toContain('/objects/pipelinq/journey/j-1/audit-trails')
		const texts = w.findAll('[role="tab"]').map((t) => t.text().replace(/\s+/g, ' ').trim())
		expect(texts[1]).toBe('History 3')
	})

	it('shows no count when the trail cannot be read', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
		const w = mountTabs([{ widgetId: 'w-history', countFrom: { auditTrail: true } }])
		await flush()
		expect(w.findAll('[role="tab"]')[0].text().trim()).toBe('History')
	})
})
