/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CnFlowDetail from '../../src/components/CnFlowDetail/CnFlowDetail.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: {} })),
		put: jest.fn(() => Promise.resolve({ data: {} })),
		delete: jest.fn(() => Promise.resolve({ data: {} })),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

/**
 * @param {Array<object>} nodes The flow's nodes.
 * @return {Map<string, object>} The data of each drawn node, by id.
 */
async function drawn(nodes) {
	setActivePinia(createPinia())
	const { vm } = mount(CnFlowDetail, {
		global: { stubs: { CnGraphCanvas: true, NcEmptyContent: true, Sitemap: true }, mocks: { t: (app, s) => s } },
	})
	vm.store.flow = { id: 'f1', nodes, edges: [] }
	await vm.$nextTick()

	return new Map(vm.canvasNodes.map((node) => [node.id, node.data]))
}

describe('CnFlowDetail step names', () => {
	it('draws a step with the label it was authored with', async () => {
		const data = await drawn([{ id: 'a', type: 'mail', label: 'Melder bevestigen', config: { recipients: 'admin', subject: 'x' } }])

		expect(data.get('a')).toMatchObject({ label: 'Melder bevestigen', named: true, summary: 'recipients: admin +1' })
	})

	it('lets a name given in the editor win over the label', async () => {
		const data = await drawn([{ id: 'a', type: 'mail', name: 'Mail the resident', label: 'Melder bevestigen' }])

		expect(data.get('a')).toMatchObject({ label: 'Mail the resident', named: true, summary: '' })
	})

	it('keeps the configuration summary for a step without a name', async () => {
		const data = await drawn([{ id: 'a', type: 'mail', config: { recipients: 'admin' } }, { id: 'b', type: 'end' }])

		expect(data.get('a')).toMatchObject({ label: 'recipients: admin', named: false })
		expect(data.get('b')).toMatchObject({ label: 'not configured', named: false })
	})
})
