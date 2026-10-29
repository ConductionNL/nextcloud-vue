/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Boards PqFlow and PqFlowRun on a `layout: "canvas"` flow page: the header's
 * More menu, the last run on the path line, the legend as one card with the
 * zoom, the inspector and the run panel as the boards draw them.
 *
 * @spec openspec/changes/flow-board-canvas-chrome/specs/flow-board/spec.md
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnFlowRunSummary = require('../../src/components/CnFlowDetail/CnFlowRunSummary.vue').default

const DetailStub = {
	name: 'CnFlowDetail',
	props: { id: String, app: String, run: String, layoutDirection: String, fitMaxZoom: Number, nodeBadge: Function, toolbarActions: Boolean, addStep: Boolean, quietRun: Boolean },
	template: '<div class="detail"><slot name="toolbar-start" /><slot name="toolbar-end" /></div>',
}
const stubs = {
	CnFlowDetail: DetailStub,
	CnFlowSidebar: { name: 'CnFlowSidebar', template: '<div class="runs" />' },
	CnBuildiqEditButton: { name: 'CnBuildiqEditButton', template: '<span class="buildiq" />' },
	CnFlowRunSummary: { name: 'CnFlowRunSummary', props: { iconActions: Boolean }, template: '<div class="run-card" />' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
	NcActions: { name: 'NcActions', template: '<div class="more-menu"><slot name="icon" /><slot /></div>' },
	NcActionButton: { name: 'NcActionButton', emits: ['click'], template: '<button type="button" class="more-item" @click="$emit(\'click\')"><slot /></button>' },
}

const CATALOG = [{
	id: 'openregister.send-email',
	displayName: 'Send an e-mail',
	role: 'step',
	configForm: [
		{ key: 'template', label: 'Template', required: true, description: 'Holds the ticket number.' },
		{ key: 'continueOnError', label: 'Continue on error', type: 'boolean', description: 'Log a warning and go on.' },
	],
}]
const FLOW = {
	id: 'f1',
	name: 'Confirm receipt',
	version: 1,
	updated: '2026-10-28T10:00:00Z',
	nodes: [
		{ id: 'n1', type: 'openregister.send-email', name: 'Mail the resident', config: { template: 'receipt', continueOnError: true } },
		{ id: 'n2', type: 'openregister.write', name: 'Post', config: {} },
	],
	edges: [],
}
const RUN = {
	uuid: 'r1',
	status: 'completed',
	created: '2026-10-07T08:41:00Z',
	log: [
		{ transition: 'n1', status: 'completed', durationMs: 12 },
		{ transition: 'n2', status: 'failed', durationMs: 96 },
	],
}

/**
 * @param {object} props Extra props.
 * @param {object} state Store fields to set.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(props = {}, state = {}) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG, flow: FLOW, nodes: FLOW.nodes, runs: [], ...state })
	await w.vm.$nextTick()
	return w
}

const more = (w) => w.find('[data-testid="flow-board-more"]')
const inspector = (w) => w.find('[data-testid="flow-board-inspector"]')
const runState = { inspectedRunUuid: 'r1', runDetail: RUN, runs: [RUN] }

describe('the header and the path line', () => {
	it('🔴 draws a More menu with Show runs in the editor', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		expect(more(w).exists()).toBe(true)
		expect(more(w).text()).toContain('Show runs')
		await more(w).findAll('.more-item')[0].trigger('click')
		expect(inspector(w).find('.runs').exists()).toBe(true)
	})

	it('🔴 keeps buildiq and the More menu in a run, with play and back', async () => {
		const w = await mountBoard({ layout: 'canvas', run: 'r1' }, runState)
		const replay = jest.spyOn(w.vm.store, 'requestReplay').mockImplementation(() => {})
		expect(w.find('.cn-flow-board__header .buildiq').exists()).toBe(true)
		expect(more(w).text()).toContain('Play on the canvas')
		expect(more(w).text()).toContain('Back to the flow')
		await more(w).find('[data-testid="flow-board-more-play"]').trigger('click')
		expect(replay).toHaveBeenCalled()
	})

	it('🔴 starts the path line with the last run', async () => {
		const w = await mountBoard({ layout: 'canvas' }, { runs: [RUN] })
		const pill = w.find('[data-testid="flow-board-last-run"]')
		expect(pill.exists()).toBe(true)
		expect(pill.text()).toMatch(/^Last run .+ done$/)
	})

	it('keeps the card layout free of the menu and the last run pill', async () => {
		const w = await mountBoard({}, { runs: [RUN] })
		expect(more(w).exists()).toBe(false)
		expect(w.find('[data-testid="flow-board-last-run"]').exists()).toBe(false)
	})

	it('🔴 names when the flow was saved for metaParts saved only', async () => {
		const w = await mountBoard({ layout: 'canvas', metaParts: ['steps', 'version', 'saved'] })
		expect(w.find('[data-testid="flow-board-path"]').text()).toMatch(/version 1, saved /)
		const plain = await mountBoard({ layout: 'canvas' })
		expect(plain.find('[data-testid="flow-board-path"]').text()).not.toContain('saved')
	})
})

describe('the legend card', () => {
	it('🔴 puts the titled legend with the routes in the canvas toolbar in a run', async () => {
		const w = await mountBoard({ layout: 'canvas', run: 'r1' }, runState)
		const legend = w.find('.detail [data-testid="flow-board-legend"]')
		expect(legend.exists()).toBe(true)
		expect(legend.text()).toContain('Outcome per step')
		expect(legend.text()).toContain('Taken route')
		expect(legend.text()).toContain('Not taken')
		expect(w.findAll('[data-testid="flow-board-legend"]')).toHaveLength(1)
	})

	it('keeps the legend under the canvas in the card layout', async () => {
		const w = await mountBoard({ run: 'r1' }, runState)
		expect(w.find('.detail [data-testid="flow-board-legend"]').exists()).toBe(false)
		expect(w.find('[data-testid="flow-board-legend"]').exists()).toBe(true)
	})

	it('🔴 gives the fit button a Dutch name', () => {
		const nl = require('../../l10n/nl.json')
		const strings = nl.translations || nl
		expect(strings['Fit the whole flow in view']).toBe('Hele flow in beeld passen')
	})
})

describe('the canvas inspector', () => {
	it('🔴 heads the step with its kind and type and edits its name', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		const rename = jest.spyOn(w.vm.store, 'setNodeName').mockImplementation(() => {})
		w.vm.store.selectedNodeId = 'n1'
		await w.vm.$nextTick()
		expect(inspector(w).find('[data-testid="flow-board-step-kind"]').text()).toBe('Action · Send an e-mail')
		expect(inspector(w).find('[data-testid="flow-board-step-type"]').exists()).toBe(false)
		const field = inspector(w).findAllComponents({ name: 'NcTextField' }).find((c) => c.attributes('data-testid') === 'flow-board-step-name-field')
		expect(field.attributes('modelvalue')).toBe('Mail the resident')
		field.vm.$attrs['onUpdate:modelValue']('Mail the citizen')
		field.vm.$attrs.onBlur()
		expect(rename).toHaveBeenCalledWith('n1', 'Mail the citizen')
	})

	it('🔴 shows the settings with their descriptions and a switch as a card', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		w.vm.store.selectedNodeId = 'n1'
		await w.vm.$nextTick()
		expect(inspector(w).text()).toContain('Holds the ticket number.')
		const card = inspector(w).find('.cn-flow-board__setting--card')
		expect(card.exists()).toBe(true)
		expect(card.text()).toContain('Log a warning and go on.')
	})

	it('🔴 shows the recent log lines open and Done as the primary action', async () => {
		const w = await mountBoard({ layout: 'canvas' })
		w.vm.store.selectedNodeId = 'n1'
		await w.vm.$nextTick()
		expect(inspector(w).find('details').exists()).toBe(false)
		expect(inspector(w).text()).toContain('Recent log lines of this step')
		const done = inspector(w).findAllComponents({ name: 'NcButton' }).find((b) => b.attributes('data-testid') === 'flow-board-done')
		expect(done.attributes('variant')).toBe('primary')
	})

	it('keeps the card inspector as it was', async () => {
		const w = await mountBoard()
		w.vm.store.selectedNodeId = 'n1'
		await w.vm.$nextTick()
		expect(inspector(w).find('[data-testid="flow-board-step-type"]').exists()).toBe(true)
		expect(inspector(w).find('details').exists()).toBe(true)
		expect(inspector(w).find('[data-testid="flow-board-step-name-field"]').exists()).toBe(false)
	})
})

describe('the run panel', () => {
	it('🔴 heads the selected step with its outcome, the note and play', async () => {
		const w = await mountBoard({ layout: 'canvas', run: 'r1' }, runState)
		const replay = jest.spyOn(w.vm.store, 'requestReplay').mockImplementation(() => {})
		w.vm.store.selectedNodeId = 'n2'
		await w.vm.$nextTick()
		const head = inspector(w).find('[data-testid="flow-board-run-step"]')
		expect(head.exists()).toBe(true)
		expect(head.text()).toContain('Post')
		expect(head.text()).toContain('Warning')
		expect(inspector(w).find('[data-testid="flow-board-run-step-note"]').exists()).toBe(true)
		expect(inspector(w).find('[data-testid="flow-board-inspector-close"]').exists()).toBe(false)
		await inspector(w).find('[data-testid="flow-board-run-play"]').trigger('click')
		expect(replay).toHaveBeenCalled()
	})

	it('🔴 hands the run card its icons', async () => {
		const w = await mountBoard({ layout: 'canvas', run: 'r1' }, runState)
		expect(w.findComponent({ name: 'CnFlowRunSummary' }).props('iconActions')).toBe(true)
	})

	it('🔴 the run card draws Back as a secondary button with iconActions', () => {
		const w = mount(CnFlowRunSummary, { props: { run: RUN, stepsTotal: 2, canRetry: true, iconActions: true } })
		const back = w.findAllComponents({ name: 'NcButton' }).find((b) => b.attributes('data-testid') === 'flow-run-back')
		expect(back.attributes('variant')).toBe('secondary')
		const plain = mount(CnFlowRunSummary, { props: { run: RUN, stepsTotal: 2, canRetry: true } })
		const plainBack = plain.findAllComponents({ name: 'NcButton' }).find((b) => b.attributes('data-testid') === 'flow-run-back')
		expect(plainBack.attributes('variant')).toBe('tertiary')
	})
})
