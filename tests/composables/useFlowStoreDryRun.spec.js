/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Trying a flow against a record asks OpenRegister's dry-run, which changes
 * and sends nothing, and keeps the per-step answer for the board to show.
 *
 * @spec openspec/changes/flow-test-with-a-record/specs/flow-test-with-a-record/spec.md#requirement-testing-a-flow-with-a-record-changes-nothing
 */

import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: { status: 'completed', steps: [{ nodeId: 'check', preview: { performed: true } }] } })),
	},
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

function store() {
	setActivePinia(createPinia())
	const s = useFlowStore()
	s.flow = { id: 'f-1', name: 'A flow', nodes: [], edges: [] }
	return s
}

describe('useFlowStore dryRun', () => {
	beforeEach(() => axios.post.mockClear())

	it('posts the record to the dry-run endpoint and keeps the steps, never the run endpoint', async () => {
		const s = store()
		const result = await s.dryRun({ uuid: 'case-82', register: 'dossiq', schema: 'case' })

		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/flows/f-1/dry-run', { register: 'dossiq', schema: 'case', objectId: 'case-82' })
		expect(axios.post.mock.calls.some(([url]) => String(url).endsWith('/run'))).toBe(false)
		expect(result.steps[0].nodeId).toBe('check')
		expect(s.dryRunResult).toEqual({ ...result, subject: { uuid: 'case-82', register: 'dossiq', schema: 'case' } })
		expect(s.dryRunning).toBe(false)
	})

	it('refuses an unsaved flow', async () => {
		const s = store()
		s.flow.id = ''
		expect(await s.dryRun({ uuid: 'case-82', register: 'dossiq', schema: 'case' })).toBeNull()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('keeps the error and no result when the dry-run is refused', async () => {
		const s = store()
		axios.post.mockRejectedValueOnce(new Error('403'))
		expect(await s.dryRun({ uuid: 'case-82', register: 'dossiq', schema: 'case' })).toBeNull()
		expect(s.dryRunResult).toBeNull()
		expect(s.error).toBeTruthy()
	})

	it('clears the result', async () => {
		const s = store()
		await s.dryRun({ uuid: 'case-82', register: 'dossiq', schema: 'case' })
		s.clearDryRun()
		expect(s.dryRunResult).toBeNull()
	})
})
