/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * With `badgeSource: "readState"` a tab says what is new on its part of the
 * record, and opening it marks that part read. The record itself is marked
 * read by the detail page; this only stamps the part a tab names, so a
 * document that arrived stays counted until the documents are looked at.
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-opening-a-tab-marks-its-part-read
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { setSubResourceRead } from '../../src/utils/recordInteractions.js'

jest.mock('../../src/utils/recordInteractions.js', () => ({
	__esModule: true,
	setSubResourceRead: jest.fn(),
}))

const WIDGETS = [
	{ id: 'w-overview', type: 'data', title: 'Overview' },
	{ id: 'w-documents', type: 'files', title: 'Documents' },
	{ id: 'w-notes', type: 'notes', title: 'Notes' },
]

const RECORD = { id: 'r-1', '@self': { id: 'r-1', unreadCounts: { files: 3, notes: 0 } } }

async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountTabs(content) {
	return mount(CnTabsWidget, {
		props: { content, availableWidgets: WIDGETS, objectId: 'r-1', objectData: RECORD, register: 'myapp', schema: 'item' },
		global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } } },
	})
}

const TABS = [
	{ id: 'overview', widgetId: 'w-overview' },
	{ id: 'documents', widgetId: 'w-documents', unreadKey: 'files' },
	{ id: 'notes', widgetId: 'w-notes' },
]

beforeEach(() => {
	setSubResourceRead.mockReset()
	setSubResourceRead.mockResolvedValue({ ok: true, status: 200, data: {}, message: '' })
})

describe('CnTabsWidget — read state per tab', () => {
	it('says how many are new for assistive technology', async () => {
		const w = mountTabs({ tabs: TABS, badgeSource: 'readState' })
		await flush()
		const hidden = w.findAll('[data-testid="cn-tabs-count-label"]')
		expect(hidden).toHaveLength(1)
		expect(hidden[0].text()).toBe('3 new')
	})

	it('marks the part read when its tab opens, and the count goes', async () => {
		const w = mountTabs({ tabs: TABS, badgeSource: 'readState' })
		await flush()
		expect(setSubResourceRead).not.toHaveBeenCalled()
		await w.findAll('[role="tab"]')[1].trigger('click')
		await flush()
		expect(setSubResourceRead).toHaveBeenCalledWith('myapp', 'item', 'r-1', 'files')
		expect(w.findAll('[data-testid="cn-tabs-count-label"]')).toHaveLength(0)
	})

	it('keeps the count when the write is refused', async () => {
		setSubResourceRead.mockResolvedValue({ ok: false, status: 403, data: null, message: 'No' })
		const w = mountTabs({ tabs: TABS, badgeSource: 'readState' })
		await flush()
		await w.findAll('[role="tab"]')[1].trigger('click')
		await flush()
		expect(w.findAll('[data-testid="cn-tabs-count-label"]')).toHaveLength(1)
	})

	it('marks nothing without badgeSource', async () => {
		const w = mountTabs({ tabs: TABS })
		await flush()
		await w.findAll('[role="tab"]')[1].trigger('click')
		await flush()
		expect(setSubResourceRead).not.toHaveBeenCalled()
		expect(w.findAll('[data-testid="cn-tabs-count-label"]')).toHaveLength(0)
	})
})
