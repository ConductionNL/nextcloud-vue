/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

describe('canvasEdges conditions', () => {
	const logic = { '>': [{ var: 'json.amount' }, 1000] }

	beforeEach(() => setActivePinia(createPinia()))

	it('carries the exit\'s condition on the line, as JSONLogic and in words', () => {
		const store = useFlowStore()
		store.flow = {
			nodes: [
				{ id: 'check', type: 'openregister.switch', exits: [{ id: 'large', condition: logic }, { id: 'small' }] },
				{ id: 'tell', type: 'openregister.set-fields' },
				{ id: 'mark', type: 'openregister.set-fields' },
			],
			edges: [
				{ from: 'check', fromExit: 'large', to: 'tell' },
				{ from: 'check', fromExit: 'small', to: 'mark' },
			],
		}

		expect(store.canvasEdges.map((line) => line.data.condition)).toEqual([logic, null])
		expect(store.canvasEdges.map((line) => line.data.conditionText)).toEqual(['amount is more than 1000', 'Otherwise'])
	})

	it('leaves the stored document alone', () => {
		const store = useFlowStore()
		const edges = [{ from: 'a', to: 'b' }]
		store.flow = { nodes: [{ id: 'a' }, { id: 'b' }], edges }

		expect(store.canvasEdges[0].data.conditionText).toBe('')
		expect(store.flow.edges).toEqual([{ from: 'a', to: 'b' }])
	})
})
