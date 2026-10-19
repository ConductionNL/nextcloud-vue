/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The flow palette names each group by the app's display name, not its id,
 * and puts the app that owns the flow first (board DqFlow: "Dossiq" above
 * "Integriq").
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn((url) => Promise.resolve(String(url).includes('core/navigation/apps')
			? { data: { ocs: { data: [{ app: 'integriq', name: 'Integriq' }, { app: 'dossiq', name: 'Dossiq' }] } } }
			: { data: { results: [] } })),
		post: jest.fn(),
	},
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnFlowBoard = require('../../src/components/CnFlowsPage/CnFlowBoard.vue').default
const { appDisplayNames, clearAppDisplayNames } = require('../../src/utils/nextcloudApps.js')

const stubs = { CnFlowDetail: true, CnFlowSidebar: true, CnBuildiqEditButton: true, NcNoteCard: { template: '<div class="note"><slot /></div>' } }
const CATALOG = [
	{ id: 'integriq.call', app: 'integriq', displayName: 'External call' },
	{ id: 'dossiq.set-status', app: 'dossiq', displayName: 'Set status' },
	{ id: 'openregister.wait', displayName: 'Wait' },
]

/**
 * @param {object} props The board props.
 * @return {Promise<object>} The wrapper, with the catalogue seeded.
 */
async function mountBoard(props) {
	const w = mount(CnFlowBoard, { props: { id: 'f1', palette: 'column', ...props }, global: { stubs } })
	Object.assign(w.vm.store, { nodeCatalog: CATALOG })
	await flushPromises()
	return w
}

beforeEach(() => clearAppDisplayNames())

describe('flow palette groups', () => {
	it('names each group by the app display name', async () => {
		const w = await mountBoard({})
		const titles = w.findAll('.cn-flow-board__palette-app').map((h) => h.text())
		expect(titles).toEqual(expect.arrayContaining(['Integriq', 'Dossiq']))
	})

	it('keeps the id for an app Nextcloud does not name', async () => {
		const w = await mountBoard({})
		expect(w.findAll('.cn-flow-board__palette-app').map((h) => h.text())).toContain('openregister')
	})

	it('puts the host app first', async () => {
		const w = await mountBoard({ app: 'dossiq' })
		expect(w.vm.paletteGroups.map((group) => group.app)).toEqual(['dossiq', 'integriq', 'openregister'])
	})

	it('reads the names once', async () => {
		const { default: axios } = require('@nextcloud/axios')
		axios.get.mockClear()
		await appDisplayNames(axios)
		await appDisplayNames(axios)
		expect(axios.get.mock.calls.filter(([url]) => String(url).includes('core/navigation/apps'))).toHaveLength(1)
	})
})
