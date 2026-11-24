/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `download: true` puts a "Download" button in the dashboard header that is
 * disabled until the figures are read and saves them as
 * `<downloadName>-<yyyy-mm-dd>.csv` (dashboard-download-csv).
 *
 * @spec openspec/changes/dashboard-download-csv/specs/dashboard-download-csv/spec.md#requirement-a-dashboard-can-be-downloaded-as-csv
 */

jest.mock('gridstack', () => ({ GridStack: { init: jest.fn() } }), { virtual: true })
jest.mock('gridstack/dist/gridstack.min.css', () => ({}), { virtual: true })

const pending = { resolve: null }
jest.mock('@/utils/dashboardDownload.js', () => {
	const actual = jest.requireActual('@/utils/dashboardDownload.js')
	return {
		...actual,
		readDownloadRows: jest.fn(() => new Promise((resolve) => { pending.resolve = resolve })),
		saveTextFile: jest.fn(),
	}
})

import { mount } from '@vue/test-utils'
import CnDashboardPage from '@/components/CnDashboardPage/CnDashboardPage.vue'
import { readDownloadRows, saveTextFile } from '@/utils/dashboardDownload.js'

const stubs = {
	CnDashboardGrid: { template: '<div />', props: ['layout', 'editable', 'columns', 'cellHeight', 'margin'] },
	CnWidgetWrapper: { template: '<div><slot /></div>' },
	NcButton: { props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
}

const widgets = [
	{ id: 'pub', type: 'stat', title: 'Published', content: { label: 'Published', source: { register: 'r', schema: 's', metric: 'count', filter: { status: 'published' } } } },
	{ id: 'note', type: 'text', title: 'Note', content: { text: 'hi' } },
]
const layout = [
	{ id: '1', widgetId: 'pub', gridX: 0, gridY: 0, gridWidth: 3, gridHeight: 2 },
	{ id: '2', widgetId: 'note', gridX: 3, gridY: 0, gridWidth: 3, gridHeight: 2 },
]

function mountPage(props = {}) {
	return mount(CnDashboardPage, { propsData: { title: 'Report', widgets, layout, ...props }, stubs })
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnDashboardPage — download', () => {
	beforeEach(() => {
		readDownloadRows.mockClear()
		saveTextFile.mockClear()
	})

	it('offers no Download without the flag', () => {
		expect(mountPage().find('[data-testid="cn-dashboard-download"]').exists()).toBe(false)
		expect(readDownloadRows).not.toHaveBeenCalled()
	})

	it('keeps Download disabled until the figures are read, then saves the CSV', async () => {
		const wrapper = mountPage({ download: true, downloadName: 'buildiq-applications' })
		const button = wrapper.find('[data-testid="cn-dashboard-download"]')
		expect(button.exists()).toBe(true)
		expect(button.attributes('disabled')).toBeDefined()

		// Only the stat tile is planned; the text widget is left out.
		const [plan] = readDownloadRows.mock.calls.at(-1)
		expect(plan.map((entry) => entry.id)).toEqual(['pub'])

		pending.resolve([['Published', 'Published', 5]])
		await flush()
		await wrapper.vm.$nextTick()
		expect(button.attributes('disabled')).toBeUndefined()

		await button.trigger('click')
		expect(saveTextFile).toHaveBeenCalledTimes(1)
		const [text, fileName] = saveTextFile.mock.calls[0]
		expect(text).toBe('﻿widget,label,value\r\nPublished,Published,5\r\n')
		expect(fileName).toMatch(/^buildiq-applications-\d{4}-\d{2}-\d{2}\.csv$/)
	})

	it('stays disabled while the page itself is loading', async () => {
		const wrapper = mountPage({ download: true, loading: true })
		pending.resolve([])
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-dashboard-download"]').attributes('disabled')).toBeDefined()
	})
})
