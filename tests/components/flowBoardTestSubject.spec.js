/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFlow's "Testen met een zaak": with a `testSubject`, the board header
 * draws a button that opens a dialog to pick a record, and runs the saved
 * flow once with that record as its subject.
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

	it('runs the saved flow with the picked record as its subject, then closes', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		const run = jest.spyOn(w.vm.store, 'run').mockResolvedValue({ uuid: 'run-1' })
		await w.find('[data-testid="flow-board-test"]').trigger('click')
		expect(w.find('[data-testid="flow-board-test-run"]').attributes('disabled')).toBeDefined()
		w.vm.testRecord = 'case-82'
		await w.vm.$nextTick()
		await w.find('[data-testid="flow-board-test-run"]').trigger('click')
		await w.vm.$nextTick()
		expect(run).toHaveBeenCalledWith({ uuid: 'case-82', register: 'dossiq', schema: 'case' })
		expect(w.find('[data-testid="flow-board-test-dialog"]').exists()).toBe(false)
	})

	it('cannot test an unsaved flow', async () => {
		const w = await mountBoard({ testSubject: { register: 'dossiq', schema: 'case' } })
		Object.assign(w.vm.store, { flow: { ...FLOW, id: '' } })
		await w.vm.$nextTick()
		expect(w.find('[data-testid="flow-board-test"]').attributes('disabled')).toBeDefined()
	})
})
