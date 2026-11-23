/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow board that saves as the next version: it tells the store while it
 * is on screen, and its path says "version 4 · changes apply to new cases"
 * (board DqFlow) instead of the trigger and step count.
 *
 * @spec openspec/changes/flow-board-save-as-version/specs/flow-board/spec.md#requirement-a-flow-page-can-save-edits-as-the-next-version
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })), post: jest.fn() },
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }

/**
 * @param {object} props The board props.
 * @return {Promise<object>} The board over a published version 4.
 */
async function mountBoard(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { flow: { ...w.vm.store.flow, id: 'f1', name: 'Omgevingsvergunning regulier', version: 4, trigger: 'manual', lifecycleStatus: 'published' } })
	await flushPromises()
	return w
}

describe('flow board saving as the next version', () => {
	it('says only the version and the page note after the name', async () => {
		const w = await mountBoard({ metaParts: ['version'], metaNote: 'changes apply to new cases' })
		expect(w.find('.cn-flow-board__meta').text()).toBe('· version 4 · changes apply to new cases')
	})

	it('keeps the trigger, the step count and the version by default', async () => {
		const w = await mountBoard({})
		expect(w.find('.cn-flow-board__meta').text()).toContain('trigger')
		expect(w.find('.cn-flow-board__meta').text()).toContain('version 4')
	})

	it('unlocks the published flow while on screen, and locks it again after', async () => {
		const w = await mountBoard({ saveAsVersion: true })
		expect(w.vm.store.graphLocked).toBe(false)
		const store = w.vm.store
		w.unmount()
		expect(store.savesAsVersion).toBe(false)
		expect(store.graphLocked).toBe(true)
	})
})
