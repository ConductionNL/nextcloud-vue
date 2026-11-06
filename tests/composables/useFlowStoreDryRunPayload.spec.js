/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(() => Promise.resolve({ data: { status: 'completed', steps: [] } })), put: jest.fn(), delete: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

describe('dryRun', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		axios.post.mockClear()
	})

	it('sends a record as it always did', async () => {
		const store = useFlowStore()
		store.flow.id = 'f1'

		await store.dryRun({ uuid: 'o1', register: 'r', schema: 's' })

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/f1/dry-run', { register: 'r', schema: 's', objectId: 'o1' })
	})

	it('sends an example payload instead, and keeps it for Test again', async () => {
		const store = useFlowStore()
		store.flow.id = 'f1'

		await store.dryRun({ payload: { amount: 5 } })

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/f1/dry-run', { payload: { amount: 5 } })
		expect(store.dryRunResult.subject).toEqual({ payload: { amount: 5 } })
	})
})
