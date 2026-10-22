/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFlow's "Testen met een zaak": with a `testSubject`, the board header
 * draws a button that opens a dialog to pick a record, and tries the saved
 * flow with that record through OpenRegister's dry-run: nothing is changed or
 * sent, and the per-step result shows beside the canvas.
 *
 * @spec openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-testing-a-flow-with-a-record-changes-nothing
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = {
	CnFlowDetail: true,
	CnFlowSidebar: true,
	CnBuildiqEditButton: true,
	CnResourceSelect: { name: 'CnResourceSelect', props: ['register', 'schema', 'labelField', 'modelValue'], template: '<div class="resource-select" />' },
	CnDialog: { name: 'CnDialog', props: ['name'], template: '<div class="dialog" :data-name="name"><slot /><slot name="actions" /></div>' },
	NcNoteCard: { template: '<div class="note"><slot /></div>' },
}
const FLOW = { id: 'f1', name: 'Bevestig ontvangst', trigger: 'manual', version: 4, enabled: true, nodes: [], edges: [] }

/**
 * Mount the board with the store's flow set.
 *
 * @param {object} props The board props.
 * @return {Promise<object>} The wrapper.
 */
async function mountBoard(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { flow: { ...FLOW } })
	await w.vm.$nextTick()
	return w
}

describe('CnFlowBoard test with a record', () => {
	it('draws no test button without a test subject', async () => {
		const w = await mountBoard({})
		expect(w.find('[data-testid="flow-board-test"]').exists()).toBe(false)
	})

	it('draws the page\'s label and opens a picker on the declared register and schema', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case', labelField: 'title', label: 'Testen met een zaak' } })
		const button = w.find('[data-testid="flow-board-test"]')
		expect(button.text()).toContain('Testen met een zaak')
		await button.trigger('click')
		const picker = w.findComponent({ name: 'CnResourceSelect' })
		expect(picker.props()).toMatchObject({ register: 'dossiq', schema: 'case', labelField: 'title' })
	})

	it('tries the saved flow with the picked record, never runs it, then closes', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		const run = jest.spyOn(w.vm.store, 'run')
		const dryRun = jest.spyOn(w.vm.store, 'dryRun').mockResolvedValue({ status: 'completed', steps: [] })
		await w.find('[data-testid="flow-board-test"]').trigger('click')
		expect(w.find('[data-testid="flow-board-test-run"]').attributes('disabled')).toBeDefined()
		w.vm.testRecord = 'case-82'
		await w.vm.$nextTick()
		await w.find('[data-testid="flow-board-test-run"]').trigger('click')
		await w.vm.$nextTick()
		expect(dryRun).toHaveBeenCalledWith({ uuid: 'case-82', register: 'dossiq', schema: 'case' })
		expect(run).not.toHaveBeenCalled()
		expect(w.find('[data-testid="flow-board-test-dialog"]').exists()).toBe(false)
	})

	it('says in the dialog that nothing is changed or sent', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		await w.find('[data-testid="flow-board-test"]').trigger('click')
		expect(w.find('.cn-flow-board__test-intro').text()).toBe('The saved flow is tried with the record you pick. Nothing is changed or sent.')
	})

	it('shows the per-step result beside the canvas, and closes it', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		Object.assign(w.vm.store, { dryRunResult: { status: 'completed', subject: { uuid: 'case-82' }, steps: [{ nodeId: 'check', label: 'Large?', type: 'switch', status: 'completed', preview: { performed: true, summary: 'Switch' } }] } })
		await w.vm.$nextTick()
		const panel = w.findComponent({ name: 'CnFlowDryRunResult' })
		expect(panel.exists()).toBe(true)
		expect(panel.props('result').steps[0].nodeId).toBe('check')
		const clear = jest.spyOn(w.vm.store, 'clearDryRun')
		panel.vm.$emit('close')
		expect(clear).toHaveBeenCalled()
	})

	it('cannot test an unsaved flow', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		Object.assign(w.vm.store, { flow: { ...FLOW, id: '' } })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="flow-board-test"]').attributes('disabled')).toBeDefined()
	})
})
