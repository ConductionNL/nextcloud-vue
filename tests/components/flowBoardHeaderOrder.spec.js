/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqFlow's header order: Testen met een zaak, the Actief switch,
 * Controleren, the buildiq square, Opslaan. Run, where a page shows it,
 * follows Check.
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
	CnBuildiqEditButton: { template: '<div data-testid="buildiq" />' },
	CnResourceSelect: true,
	CnDialog: true,
	NcNoteCard: true,
}
const FLOW = { id: 'f1', name: 'Bevestig ontvangst', trigger: 'manual', version: 4, enabled: true, nodes: [], edges: [] }

/**
 * The test ids of the header's actions, in order.
 *
 * @param {object} props The board props.
 * @return {Promise<string[]>} The ids.
 */
async function headerOrder(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { flow: { ...FLOW } })
	await w.vm.$nextTick()
	return Array.from(w.find('.cn-flow-board__actions').element.children).map((el) => el.getAttribute('data-testid'))
}

describe('CnFlowBoard header order', () => {
	it('draws Test with a record first and Save last', async () => {
		expect(await headerOrder({ testSubject: { register: 'dossiq', schema: 'case', label: 'Testen met een zaak' } })).toEqual([
			'flow-board-test',
			'flow-board-enabled',
			'flow-board-check',
			'buildiq',
			'flow-board-save',
		])
	})

	it('keeps the order without a test subject', async () => {
		expect(await headerOrder({})).toEqual(['flow-board-enabled', 'flow-board-check', 'buildiq', 'flow-board-save'])
	})
})
