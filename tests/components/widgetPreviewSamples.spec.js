/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget picker draws each widget type as a miniature: the type's renderer
 * with its registry `sampleContent` and `preview` set. For the data widgets
 * that read a register or a flow (flow-runs, tasks, saved-view,
 * object-table) the miniature draws the sample rows and sends no request,
 * starts no poll and listens for nothing.
 */
var mockGet = jest.fn(() => Promise.resolve({ data: {} }))
var mockPost = jest.fn(() => Promise.resolve({ data: {} }))

jest.mock('@nextcloud/axios', () => {
	const client = {
		get: (...args) => mockGet(...args),
		post: (...args) => mockPost(...args),
		put: (...args) => mockPost(...args),
		patch: (...args) => mockPost(...args),
		delete: (...args) => mockPost(...args),
		request: (...args) => mockGet(...args),
	}
	return { __esModule: true, default: client }
})

import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
const { getWidgetTypeEntry } = require('../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js')
import { samplePayload } from '../../src/utils/samplePayload.js'
require('../../src/components/CnFlowRunsWidget/index.js')
require('../../src/components/CnTasksWidget/index.js')
require('../../src/components/CnWidgetGrid/registerDashboardWidgets.js')
require('../../src/components/CnWidgetObjectTable/dashboardRegistration.js')
const { objectTablePreviewProps } = require('../../src/components/CnWidgetObjectTable/dashboardRegistration.js')

const CnFlowRunsWidget = require('../../src/components/CnFlowRunsWidget/CnFlowRunsWidget.vue').default
const CnTasksWidget = require('../../src/components/CnTasksWidget/CnTasksWidget.vue').default
const CnSavedViewWidget = require('../../src/components/CnSavedViewWidget/CnSavedViewWidget.vue').default

let fetchSpy
let intervalSpy
let listenerSpy

beforeEach(() => {
	mockGet.mockClear()
	mockPost.mockClear()
	fetchSpy = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
	global.fetch = fetchSpy
	intervalSpy = jest.spyOn(global, 'setInterval')
	listenerSpy = jest.spyOn(document, 'addEventListener')
})

afterEach(() => {
	intervalSpy.mockRestore()
	listenerSpy.mockRestore()
	delete global.fetch
})

/**
 * Mount a renderer as a picker does: its sample content with `preview`.
 *
 * @param {object} component The renderer.
 * @param {string} type The registry type.
 * @return {Promise<object>} The wrapper, after pending reads would have settled.
 */
async function mountPreview(component, type) {
	const wrapper = mount(component, {
		propsData: { content: getWidgetTypeEntry(type).sampleContent, preview: true, translate: (k) => k },
		provide: { cnTranslate: (k) => k },
		stubs: { NcLoadingIcon: true },
	})
	await flushPromises()
	await new Promise((resolve) => setTimeout(resolve, 0))
	await flushPromises()
	return wrapper
}

function expectNoRequest() {
	expect(mockGet).not.toHaveBeenCalled()
	expect(mockPost).not.toHaveBeenCalled()
	expect(fetchSpy).not.toHaveBeenCalled()
}

describe('widget miniatures of the data widgets (preview)', () => {
	it.each(['flow-runs', 'tasks', 'saved-view', 'object-table'])('%s registers sample content with sample rows', (type) => {
		const sample = getWidgetTypeEntry(type).sampleContent
		expect(sample).toBeTruthy()
		expect(Array.isArray(sample.sampleRows)).toBe(true)
		expect(sample.sampleRows.length).toBeGreaterThan(0)
	})

	it('flow-runs draws its sample runs without a request, a poll or a listener', async () => {
		const w = await mountPreview(CnFlowRunsWidget, 'flow-runs')
		const rows = w.findAll('.cn-flow-runs-widget__row')
		expect(rows).toHaveLength(3)
		expect(w.text()).toContain('Permit intake')
		expect(w.find('.cn-flow-runs-widget__error').exists()).toBe(false)
		expectNoRequest()
		expect(intervalSpy).not.toHaveBeenCalled()
		expect(listenerSpy).not.toHaveBeenCalledWith('visibilitychange', expect.anything())
		w.unmount()
	})

	it('tasks draws its sample tasks without a request, a poll or a listener', async () => {
		const w = await mountPreview(CnTasksWidget, 'tasks')
		expect(w.text()).toContain('Review permit Dorpsstraat 12')
		expect(w.text()).toContain('Prepare the council meeting')
		expectNoRequest()
		expect(intervalSpy).not.toHaveBeenCalled()
		expect(listenerSpy).not.toHaveBeenCalledWith('visibilitychange', expect.anything())
		w.unmount()
	})

	it('saved-view draws its sample rows without reading a view or an object', async () => {
		const api = { fetchViews: jest.fn(() => Promise.resolve([])) }
		const w = mount(CnSavedViewWidget, {
			propsData: { content: getWidgetTypeEntry('saved-view').sampleContent, preview: true, api },
			stubs: { NcLoadingIcon: true },
		})
		await flushPromises()
		await new Promise((resolve) => setTimeout(resolve, 0))
		await flushPromises()
		expect(api.fetchViews).not.toHaveBeenCalled()
		expect(w.text()).toContain('Permit Dorpsstraat 12')
		expect(w.text()).not.toContain('No saved view chosen')
		expectNoRequest()
		w.unmount()
	})

	it('saved-view without preview still reads its view', async () => {
		const api = { fetchViews: jest.fn(() => Promise.resolve([])) }
		mount(CnSavedViewWidget, { propsData: { content: { viewId: '7' }, api } })
		await flushPromises()
		expect(api.fetchViews).toHaveBeenCalledTimes(1)
	})

	it('object-table hands the table its sample rows and no source as a miniature', async () => {
		const sample = getWidgetTypeEntry('object-table').sampleContent
		const props = objectTablePreviewProps(sample)
		expect(props.rows.map((row) => row.title)).toContain('Permit Dorpsstraat 12')
		expect(props.columns.map((column) => column.key)).toEqual(['title', 'status', 'owner'])
		expect(props.source).toBeUndefined()
		expect(props.endpointSource).toBeUndefined()

		const Host = getWidgetTypeEntry('object-table').renderer
		const w = mount({ render: () => h(Host, { content: sample, preview: true }) }, { provide: { cnTranslate: (k) => k } })
		await flushPromises()
		await new Promise((resolve) => setTimeout(resolve, 0))
		await flushPromises()
		expect(w.text()).toContain('Permit Dorpsstraat 12')
		expectNoRequest()
		w.unmount()
	})

	it('object-table without preview still folds register and schema into its source', () => {
		const { objectTableContentToProps } = require('../../src/components/CnWidgetObjectTable/dashboardRegistration.js')
		expect(objectTableContentToProps({ register: 'r', schema: 's' }).source).toMatchObject({ register: 'r', schema: 's' })
	})
})

describe('samplePayload', () => {
	const now = Date.UTC(2026, 10, 27, 12)

	it('states the honest total and keeps rows as given', () => {
		expect(samplePayload([{ uuid: 'a' }, { uuid: 'b' }], now)).toEqual({ results: [{ uuid: 'a' }, { uuid: 'b' }], total: 2 })
	})

	it('turns relative times into the read\'s fields', () => {
		const [run, due, late] = samplePayload([{ ageMinutes: 5 }, { dueInDays: 2 }, { dueInDays: -1 }], now).results
		expect(run.created).toBe(new Date(now - 5 * 60000).toISOString())
		expect(due).toMatchObject({ dueAt: new Date(now + 2 * 86400000).toISOString(), overdue: false, daysUntilDue: 2, daysOverdue: null })
		expect(late).toMatchObject({ overdue: true, daysUntilDue: null, daysOverdue: 1 })
		expect(run.ageMinutes).toBeUndefined()
	})

	it('answers an empty payload for anything but rows', () => {
		expect(samplePayload(undefined, now)).toEqual({ results: [], total: 0 })
		expect(samplePayload([null, 'x'], now)).toEqual({ results: [], total: 0 })
	})
})
