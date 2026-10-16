/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 */

/**
 * THE FLOW EDITOR AND RUN VIEW IN THE BOARD LOOK (boards PqFlow, PqFlowRun,
 * DqFlow).
 *
 * What could go wrong quietly: a run view that reads every failed step as
 * fatal (a step whose run went on is a warning), a log that loses a step's
 * own lines in favour of the derived one, and a page that keeps the canvas
 * toolbar's Save beside the header's Save.
 */

var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: (...args) => mockPost(...args),
	},
}))

const { mount } = require('@vue/test-utils')
const { createPinia, setActivePinia } = require('pinia')
const { flowRunDurationMs, flowRunLogLines, flowRunName, flowRunSteps, flowStepLevel, formatFlowDuration } = require('../../src/utils/flowRunLog.js')
const CnFlowRunSummary = require('../../src/components/CnFlowDetail/CnFlowRunSummary.vue').default
const CnFlowStepLog = require('../../src/components/CnFlowDetail/CnFlowStepLog.vue').default
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const { useFlowStore } = require('../../src/composables/useFlowStore.js')

const RUN = {
	uuid: 'run-1',
	status: 'completed',
	created: '2026-10-07T08:41:02.000Z',
	updated: '2026-10-07T08:41:02.900Z',
	trigger: 'object.created',
	log: [
		{ transition: 'start', type: 'openregister.trigger-object', status: 'completed', itemsIn: 1, itemsOut: 1, durationMs: 10 },
		{ transition: 'mail', type: 'integriq.send', status: 'completed', durationMs: 300 },
		{ transition: 'portal', type: 'portal.post', status: 'failed', error: 'No account on the portal.', durationMs: 96 },
		{
			transition: 'own',
			type: 'x.step',
			status: 'completed',
			durationMs: 5,
			startedAt: '2026-10-07T08:41:02.500Z',
			report: { lines: [{ at: '2026-10-07T08:41:02.501Z', level: 'info', message: 'Looked up the account.' }, { level: 'nonsense', message: 'Odd level.' }] },
		},
	],
}

beforeEach(() => {
	setActivePinia(createPinia())
	mockPost.mockReset()
})

describe('reading a run log', () => {
	it('reads a failed step on a run that went on as a warning, on a failed run as an error', () => {
		expect(flowStepLevel({ status: 'failed' }, { status: 'completed' })).toBe('warning')
		expect(flowStepLevel({ status: 'failed' }, { status: 'failed' })).toBe('error')
		expect(flowStepLevel({ status: 'stopped' })).toBe('warning')
		expect(flowStepLevel({ status: 'suspended' })).toBe('info')
	})

	it('dates each step from the run start plus the durations before it, unless it says when it started', () => {
		const steps = flowRunSteps(RUN)
		expect(steps.map((step) => step.startedAt.toISOString())).toEqual([
			'2026-10-07T08:41:02.000Z',
			'2026-10-07T08:41:02.010Z',
			'2026-10-07T08:41:02.310Z',
			'2026-10-07T08:41:02.500Z',
		])
		expect(steps.map((step) => step.index)).toEqual([1, 2, 3, 4])
	})

	it('keeps a step\'s own lines and builds one line for any other step', () => {
		const lines = flowRunLogLines(RUN)
		expect(lines).toHaveLength(5)
		expect(lines[2]).toMatchObject({ nodeId: 'portal', level: 'warning', message: 'No account on the portal.' })
		expect(lines[3]).toMatchObject({ nodeId: 'own', level: 'info', message: 'Looked up the account.' })
		expect(lines[4].level).toBe('info')
		expect(flowRunLogLines(RUN, 'mail')).toHaveLength(1)
	})

	it('names and times a run as people read it', () => {
		expect(flowRunDurationMs(RUN)).toBe(900)
		expect(formatFlowDuration(900)).toBe('900 ms')
		expect(formatFlowDuration(96)).toBe('96 ms')
		expect(formatFlowDuration(125000)).toBe('2 min 5 s')
		expect(formatFlowDuration(null)).toBe('')
		expect(flowRunName({ uuid: 'abcdef123456' })).toBe('abcdef12')
		expect(flowRunName(RUN)).toMatch(/^2026-10-07-\d{4}$/)
	})
})

describe('CnFlowRunSummary', () => {
	it('states the outcome, duration, trigger and steps run of total', async () => {
		const w = mount(CnFlowRunSummary, { props: { run: RUN, stepsTotal: 8, canRetry: true } })

		expect(w.text()).toContain('Finished')
		expect(w.find('[data-testid="flow-run-duration"]').text()).toBe('900 ms')
		expect(w.find('[data-testid="flow-run-trigger"]').text()).toBe('object.created')
		expect(w.find('[data-testid="flow-run-steps"]').text()).toBe('4 of 8 run')

		await w.find('[data-testid="flow-run-retry"]').trigger('click')
		await w.find('[data-testid="flow-run-back"]').trigger('click')
		expect(w.emitted('retry')[0][0]).toBe(RUN)
		expect(w.emitted('back')).toHaveLength(1)
	})

	it('offers no Run again unless asked', () => {
		const w = mount(CnFlowRunSummary, { props: { run: { ...RUN, status: 'running' } } })
		expect(w.find('[data-testid="flow-run-retry"]').exists()).toBe(false)
	})
})

describe('CnFlowStepLog', () => {
	it('draws one line per entry with its pill and time, and says so when empty', () => {
		const w = mount(CnFlowStepLog, { props: { lines: flowRunLogLines(RUN, 'portal') } })
		const lines = w.findAll('[data-testid="flow-step-log-line"]')
		expect(lines).toHaveLength(1)
		expect(lines[0].text()).toContain('Warning')
		expect(lines[0].text()).toContain('No account on the portal.')
		expect(lines[0].find('time').attributes('datetime')).toBe('2026-10-07T08:41:02.310Z')

		const empty = mount(CnFlowStepLog, { props: { lines: [], emptyText: 'Nothing here.' } })
		expect(empty.text()).toBe('Nothing here.')
	})
})

describe('CnFlowBoard', () => {
	const stubs = { CnFlowDetail: true, CnFlowSidebar: true, NcNoteCard: { template: '<div class="note"><slot /></div>' } }

	it('draws the header, the path and the validity bar, and keeps Save out of the canvas toolbar', () => {
		const store = useFlowStore()
		store.flow = { ...store.flow, id: 'f1', name: 'Confirm receipt', trigger: 'manual', version: 4, nodes: [{ id: 'a', type: 'openregister.trigger-manual' }] }

		const w = mount(CnFlowBoard, { props: { id: 'f1', notice: 'This flow is the way the case type works.' }, global: { stubs } })

		expect(w.find('[data-testid="flow-board-title"]').text()).toBe('Confirm receipt')
		expect(w.find('[data-testid="flow-board-path"]').text()).toContain('Run by hand · 1 step · version 4')
		expect(w.find('[data-testid="flow-board-validity"]').text()).toContain('Not checked yet')
		expect(w.find('.note').text()).toContain('the way the case type works')
		expect(w.find('[data-testid="flow-board-run"]').exists()).toBe(true)
		const canvas = w.findComponent({ name: 'CnFlowDetail' })
		expect(canvas.attributes('toolbaractions')).toBe('false')
	})

	it('says the flow is valid once the engine said so', () => {
		const store = useFlowStore()
		store.checkResult = { valid: true, blocking: [], warnings: [] }
		const w = mount(CnFlowBoard, { props: { id: 'f1' }, global: { stubs } })
		expect(w.find('[data-testid="flow-board-validity"]').text()).toBe('The flow is valid.')
	})

	it('groups the palette by the app that provides each step', () => {
		const store = useFlowStore()
		store.nodeCatalog = [{ id: 'dossiq.set-status', displayName: 'Set status' }, { id: 'integriq.call', displayName: 'External call' }, { id: 'dossiq.ask', displayName: 'Ask a person' }]
		const w = mount(CnFlowBoard, { props: { id: 'f1', palette: 'column', paletteFootnote: 'Only what a case can do itself.' }, global: { stubs } })

		expect(w.vm.paletteGroups.map((group) => [group.app, group.entries.length])).toEqual([['dossiq', 2], ['integriq', 1]])
		expect(w.find('[data-testid="flow-board-palette"]').text()).toContain('Only what a case can do itself.')
		expect(w.findComponent({ name: 'CnFlowDetail' }).attributes('addstep')).toBe('false')
	})

	it('shows a run with its card and both log tabs, and retries into the new run', async () => {
		mockPost.mockResolvedValue({ data: { uuid: 'run-2' } })
		const store = useFlowStore()
		store.flow = { ...store.flow, id: 'f1', name: 'Confirm receipt' }
		store.inspectedRunUuid = 'run-1'
		store.runDetail = RUN
		store.selectedNodeId = 'portal'
		const push = jest.fn(() => Promise.resolve())

		const w = mount(CnFlowBoard, { props: { id: 'f1', run: 'run-1' }, global: { stubs, mocks: { $router: { push, resolve: (to) => ({ href: `/app${to}` }) } } } })

		expect(w.find('[data-testid="flow-run-summary"]').exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-run-tab-step"]').text()).toContain('1')
		expect(w.find('[data-testid="flow-board-run-tab-run"]').text()).toContain('5')
		expect(w.find('[data-testid="flow-board-legend"]').exists()).toBe(true)
		expect(w.find('[data-testid="flow-board-save"]').exists()).toBe(false)

		await w.vm.onRetry()
		expect(mockPost.mock.calls[0][0]).toContain('/api/flow-runs/run-1/retry')
		expect(push).toHaveBeenCalledWith({ path: '/flows/f1', query: { run: 'run-2' } })
	})
})
