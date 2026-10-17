/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * THE FLOWS INDEX IN THE BOARD LOOK (board PqFlows).
 *
 * The run figures beside each flow come from ONE summary request, not from a
 * page of runs: a list that derived "runs this week" from the latest 200 runs
 * would undercount any busy flow and still look right. These tests pin that
 * request, the tab narrowing and counts, the page tabs and the runs source.
 */

var mockGet = jest.fn()
var mockPut = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		put: (...args) => mockPut(...args),
	},
}))

const { flushPromises, mount } = require('@vue/test-utils')
const { createPinia, setActivePinia } = require('pinia')
const { flowRunStatuses, flowTriggerCell, indexSources, startOfWeek } = require('../../src/composables/indexSources.js')
const CnCellRenderer = require('../../src/components/CnCellRenderer/CnCellRenderer.vue').default

const FLOWS = [
	{ id: 'f1', name: 'Confirm receipt', description: 'Mails the ticket number.', trigger: 'object.created', triggerSchema: 'ticket', enabled: true, owner: 'pieter' },
	{ id: 'f2', name: 'Remind the handler', description: '', trigger: 'schedule', cron: '0 7 * * *', enabled: true, owner: 'pieter' },
	{ id: 'f3', name: 'Weekly overview', description: '', trigger: 'manual', enabled: false, owner: 'pieter' },
]

const SUMMARY = {
	f1: { lastRun: { uuid: 'r1', status: 'completed', created: '2026-10-16T08:41:00+00:00' }, runsSince: 31 },
	f2: { lastRun: { uuid: 'r2', status: 'failed', created: '2026-10-15T15:12:00+00:00' }, runsSince: 7 },
	f3: { lastRun: null, runsSince: 0 },
}

/**
 * Answer the flow list, the summary, the run history and the catalogue.
 *
 * @param {string} url The request URL.
 * @return {Promise<object>} The response.
 */
function answer(url) {
	if (url.includes('/api/flow-runs/summary')) {
		return Promise.resolve({ data: { results: SUMMARY } })
	}
	if (url.includes('/api/flow-runs')) {
		return Promise.resolve({ data: { results: [{ uuid: 'r1', flowId: 'f1', status: 'completed', created: '2026-10-16T08:41:00+00:00', trigger: 'object.created' }] } })
	}
	if (url.includes('/api/flow/event-catalog')) {
		return Promise.resolve({ data: { results: [{ id: 'object.created', label: 'Object created' }] } })
	}
	if (url.includes('/api/flows')) {
		return Promise.resolve({ data: { results: FLOWS } })
	}
	return Promise.resolve({ data: { results: [] } })
}

beforeEach(() => {
	setActivePinia(createPinia())
	mockGet.mockReset()
	mockGet.mockImplementation(answer)
	mockPut.mockReset()
})

describe('the flows source reads its run figures from the summary', () => {
	it('asks the summary once, for every listed flow, since Monday', async () => {
		const source = indexSources.flows()
		await source.load({ app: 'pipelinq' })

		const calls = mockGet.mock.calls.filter(([url]) => url.includes('/api/flow-runs/summary'))
		expect(calls).toHaveLength(1)
		expect(calls[0][1].params).toEqual({ flowIds: 'f1,f2,f3', since: startOfWeek() })
	})

	it('shows the last run, its time, the week count and how each flow starts', async () => {
		const source = indexSources.flows()
		await source.load({ app: 'pipelinq' })
		await flushPromises()
		const rows = source.rows()

		expect(rows.map((row) => row.lastRunLabel)).toEqual(['Finished', 'Failed', 'Not run yet'])
		expect(rows[0].lastRunAt).not.toBe('')
		expect(rows[2].lastRunAt).toBe('')
		expect(rows.map((row) => row.runsThisWeek)).toEqual([31, 7, 0])
		expect(rows.map((row) => row.statusLabel)).toEqual(['Active', 'Active', 'Paused'])
		expect(rows[0].triggerLabel).toBe('Object created')
		expect(rows[0].triggerDetail).toBe('ticket')
		expect(rows[1].triggerDetail).toBe('0 7 * * *')
	})

	it('narrows to the active tab and counts every tab from the loaded list', async () => {
		const source = indexSources.flows()
		await source.load({ app: 'pipelinq', state: 'errors' })

		expect(source.rows().map((row) => row.id)).toEqual(['f2'])
		expect(source.tabCounts()).toEqual({ 0: 3, 1: 2, 2: 1, 3: 1 })

		await source.load({ app: 'pipelinq', state: 'paused' })
		expect(source.rows().map((row) => row.id)).toEqual(['f3'])
	})

	it('offers the flows and this week\'s runs as page tabs, with their totals', async () => {
		const source = indexSources.flows()
		await source.load({ app: 'pipelinq' })

		expect(source.pageTabs()).toEqual([
			{ id: 'flows', label: 'Flows', to: '/flows', count: 3 },
			{ id: 'runs', label: 'Runs this week', to: '/flow-runs', count: 38 },
		])
		expect(source.footerNote).toContain('paused flow')
	})

	it('switches a flow off by writing the stored flow back whole', async () => {
		mockGet.mockImplementation((url) => (url.endsWith('/api/flows/f1')
			? Promise.resolve({ data: { ...FLOWS[0], nodes: [{ id: 'n1' }] } })
			: answer(url)))
		mockPut.mockImplementation((url, body) => Promise.resolve({ data: body }))
		const source = indexSources.flows()
		await source.load({ app: 'pipelinq' })

		const status = source.columns.find((column) => column.key === 'statusLabel')
		await status.widgetProps.onToggle({ id: 'f1' }, false)

		expect(mockPut.mock.calls[0][1]).toMatchObject({ enabled: false, nodes: [{ id: 'n1' }] })
		expect(source.rows().find((row) => row.id === 'f1').statusLabel).toBe('Paused')
	})
})

describe('the flow runs source', () => {
	it('lists this week\'s runs of the app\'s flows and opens one on its canvas', async () => {
		const source = indexSources.flowRuns()
		await source.load({ app: 'pipelinq' })

		const history = mockGet.mock.calls.find(([url]) => url.endsWith('/api/flow-runs'))
		expect(history[1].params).toEqual({ flowIds: 'f1,f2,f3', since: startOfWeek(), limit: 200 })

		const rows = source.rows()
		expect(rows[0]).toMatchObject({ id: 'r1', flowName: 'Confirm receipt', statusLabel: 'Finished' })
		expect(source.rowTarget(rows[0])).toEqual({ path: '/flows/f1', query: { run: 'r1' } })
		expect(source.showAdd).toBe(false)
	})
})

describe('helpers', () => {
	it('starts the week on Monday at midnight', () => {
		const start = new Date(startOfWeek(new Date(2026, 9, 18, 15, 0)))
		expect(start.getDay()).toBe(1)
		expect(start.getDate()).toBe(12)
		expect(start.getHours()).toBe(0)
	})

	it('reads a manual flow and an unknown status honestly', () => {
		expect(flowTriggerCell({ trigger: 'manual' }).label).toBe('Run by hand')
		expect(flowTriggerCell({ trigger: 'object.deleted' }, []).label).toBe('object.deleted')
		expect(flowRunStatuses().dead_letter.variant).toBe('error')
	})
})

describe('CnCellRenderer switch and iconLabel widgets', () => {
	it('shows the new state at once and puts it back when the toggle fails', async () => {
		let reject
		const onToggle = jest.fn(() => new Promise((resolve, no) => {
			reject = no
		}))
		const error = jest.spyOn(console, 'error').mockImplementation(() => {})
		const w = mount(CnCellRenderer, {
			props: { widget: 'switch', value: 'Active', row: { id: 'f1', enabled: true }, widgetProps: { checked: (row) => row.enabled, onToggle } },
		})

		expect(w.vm.switchChecked).toBe(true)
		w.vm.onSwitchToggle(false)
		expect(w.vm.switchChecked).toBe(false)
		expect(onToggle).toHaveBeenCalledWith({ id: 'f1', enabled: true }, false)

		reject(new Error('refused'))
		await flushPromises()
		expect(w.vm.switchChecked).toBe(true)
		expect(w.text()).toContain('Active')
		error.mockRestore()
	})

	it('draws the icon a row asks for beside the label', () => {
		const Icon = { name: 'TestIcon', props: ['size'], template: '<i class="test-icon" />' }
		const w = mount(CnCellRenderer, {
			props: { widget: 'iconLabel', value: 'Object created', row: { icon: Icon }, widgetProps: { icon: (row) => row.icon } },
		})

		expect(w.find('.test-icon').exists()).toBe(true)
		expect(w.find('[data-testid="cn-cell-icon-label"]').text()).toBe('Object created')
	})
})

describe('CnIndexPage reads page tabs, tab counts and the footer note from a named source', () => {
	const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default
	const computed = CnIndexPage.computed
	const source = {
		pageTabs: () => [{ id: 'flows', label: 'Flows', to: '/flows', count: 3 }, { id: 'broken', label: '', to: '/x' }],
		tabCounts: () => ({ 0: 3, 1: 2 }),
		footerNote: 'A paused flow keeps its steps.',
	}

	it('draws the source\'s page tabs and drops one without a label', () => {
		expect(computed.sourcePageTabs.call({ isNamedSource: true, namedSource: source })).toEqual([
			{ id: 'flows', label: 'Flows', to: '/flows', count: 3 },
		])
		expect(computed.sourcePageTabs.call({ isNamedSource: false, namedSource: null })).toEqual([])
	})

	it('counts the quick filters from the source unless the manifest declared its own', () => {
		expect(computed.effectiveTabCounts.call({ isNamedSource: true, namedSource: source, quickFilters: null, tabCounts: null })).toEqual({ 0: 3, 1: 2 })
		expect(computed.effectiveTabCounts.call({ isNamedSource: true, namedSource: source, quickFilters: [{ label: 'Mine' }], tabCounts: { 0: 9 } })).toEqual({ 0: 9 })
	})

	it('uses the manifest footer note first, the source\'s otherwise', () => {
		const cnTranslate = (key) => `T(${key})`
		expect(computed.effectiveFooterNote.call({ footerNote: 'Own note', cnTranslate, isNamedSource: true, namedSource: source })).toBe('T(Own note)')
		expect(computed.effectiveFooterNote.call({ footerNote: '', cnTranslate, isNamedSource: true, namedSource: source })).toBe('A paused flow keeps its steps.')
	})

	it('marks the tab of the current route as the current page', () => {
		const isActive = CnIndexPage.methods.isActivePageTab
		expect(isActive.call({ $route: { path: '/flows/' } }, { to: '/flows' })).toBe(true)
		expect(isActive.call({ $route: { path: '/flow-runs' } }, { to: '/flows' })).toBe(false)
	})
})
