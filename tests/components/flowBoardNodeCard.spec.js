/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The step card on the canvas in the board's card look (board DqFlow): the
 * step's name, then a pill naming the app that does it, with the curated
 * short type ("dossiq · persoon vragen", "OpenRegister · beslistabel") in the
 * group's tone; the start step reads "Start".
 *
 * @spec openspec/changes/flow-board-node-card/specs/flow-board/spec.md#requirement-a-flow-step-on-the-board-canvas-is-a-card-with-its-app-pill
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { ocs: { data: [{ app: 'filinq', name: 'Filinq' }] }, results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u, generateOcsUrl: (u) => u }))

const { flushPromises, mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const CnFlowDetail = require('../../src/components/CnFlowDetail/CnFlowDetail.vue').default
const { clearAppDisplayNames } = require('../../src/utils/nextcloudApps.js')

const DetailStub = { name: 'CnFlowDetail', props: ['nodeBadge'], template: '<div class="detail" />' }
const stubs = { CnFlowDetail: DetailStub, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div><slot /></div>' } }
const CATALOG = [
	{ id: 'openregister.trigger-object', displayName: 'Als een object verandert', role: 'trigger' },
	{ id: 'dossiq.askPerson', displayName: 'Persoon vragen' },
	{ id: 'dossiq.setStatus', displayName: 'Status zetten' },
	{ id: 'openregister.decision-table', displayName: 'Beslistabel toepassen' },
	{ id: 'filinq.generate-document', displayName: 'Document genereren' },
]
const GROUPS = [
	{ app: 'dossiq', label: 'Dossiq', pill: 'dossiq', entries: [{ type: 'dossiq.setStatus' }, { type: 'dossiq.askPerson', short: 'persoon vragen' }] },
	{ label: 'OpenRegister', tone: 'purple', entries: [{ type: 'openregister.decision-table', label: 'Beslistabel', short: 'beslistabel' }] },
]

/**
 * @param {object} props The board props.
 * @return {Promise<object>} The board, with the catalogue seeded.
 */
async function mountBoard(props) {
	clearAppDisplayNames()
	const w = mount(CnFlowBoard, { props: { id: 'f1', app: 'dossiq', palette: 'column', paletteGroups: GROUPS, ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG })
	await flushPromises()
	return w
}

describe('flow step card on the board', () => {
	it('hands the canvas a badge only in the card look', async () => {
		expect((await mountBoard({})).findComponent(DetailStub).props('nodeBadge')).toBeFalsy()
		expect(typeof (await mountBoard({ nodeLook: 'card' })).findComponent(DetailStub).props('nodeBadge')).toBe('function')
	})

	it('names the app, the curated short type and the group tone', async () => {
		const badge = (await mountBoard({ nodeLook: 'card' })).vm.nodeBadge
		expect(badge({ type: 'dossiq.askPerson' })).toEqual({ label: 'dossiq · persoon vragen', variant: 'primary' })
		expect(badge({ type: 'dossiq.setStatus' })).toEqual({ label: 'dossiq', variant: 'primary' })
		expect(badge({ type: 'openregister.decision-table' })).toEqual({ label: 'OpenRegister · beslistabel', variant: 'purple' })
	})

	it('reads Start on the start step, and the app name on a step outside the palette', async () => {
		const badge = (await mountBoard({ nodeLook: 'card' })).vm.nodeBadge
		expect(badge({ type: 'openregister.trigger-object' })).toEqual({ label: 'Start', variant: 'default' })
		expect(badge({ type: 'filinq.generate-document' })).toEqual({ label: 'Filinq', variant: 'default' })
	})
})

describe('flow canvas with node badges', () => {
	it('carries the badge on each canvas node and marks the canvas', async () => {
		const w = mount(CnFlowDetail, {
			props: { nodeBadge: (node) => ({ label: `pill ${node.type}`, variant: 'teal' }) },
			global: { mocks: { t: (app, s) => s } },
			shallow: true,
		})
		w.vm.store.load = jest.fn().mockResolvedValue(undefined)
		Object.assign(w.vm.store, { flow: { id: 'f-1', name: 'A flow', nodes: [{ id: 'a', type: 'dossiq.setStatus', name: 'Status: ontvangen', config: {} }], edges: [] } })
		await flushPromises()
		expect(w.vm.canvasNodes[0].data.badge).toEqual({ label: 'pill dossiq.setStatus', variant: 'teal' })
		expect(w.classes()).toContain('cn-flow-detail--card-nodes')
	})
})
