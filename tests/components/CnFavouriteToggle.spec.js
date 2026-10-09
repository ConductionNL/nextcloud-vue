/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-2
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockSetFavourite = jest.fn()
jest.mock('../../src/utils/recordInteractions.js', () => ({ __esModule: true, setFavourite: (...a) => mockSetFavourite(...a) }))
const mockPatch = jest.fn()
jest.mock('../../src/utils/patchStoredSelf.js', () => ({ __esModule: true, patchStoredSelf: (...a) => mockPatch(...a) }))
const mockShowError = jest.fn()
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: (...a) => mockShowError(...a) }))

import CnFavouriteToggle from '../../src/components/CnFavouriteToggle/CnFavouriteToggle.vue'

const stubs = { NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>' } }
const mountIt = (props = {}) => mount(CnFavouriteToggle, { props: { register: 'pipelinq', schema: 'ticket', objectId: 'c1', ...props }, global: { stubs } })

beforeEach(() => {
	mockSetFavourite.mockReset()
	mockPatch.mockReset()
	mockShowError.mockReset()
})

describe('CnFavouriteToggle', () => {
	it('reflects the marker in aria-pressed', () => {
		expect(mountIt({ favourite: true }).get('button').attributes('aria-pressed')).toBe('true')
		expect(mountIt({ favourite: false }).get('button').attributes('aria-pressed')).toBe('false')
	})

	it('flips at once, sends PUT, and writes the answer into the store', async () => {
		let resolve
		mockSetFavourite.mockReturnValue(new Promise((r) => {
			resolve = r
		}))
		const w = mountIt()
		await w.get('button').trigger('click')
		expect(w.get('button').attributes('aria-pressed')).toBe('true')
		expect(mockSetFavourite).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', true)
		resolve({ ok: true, status: 200 })
		await flushPromises()
		expect(mockPatch).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', { favourite: true })
		expect(w.emitted('change')[0][0]).toEqual({ favourite: true })
	})

	it('sends DELETE to unstar', async () => {
		mockSetFavourite.mockResolvedValue({ ok: true, status: 204 })
		const w = mountIt({ favourite: true })
		await w.get('button').trigger('click')
		await flushPromises()
		expect(mockSetFavourite).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', false)
	})

	it('reverts and shows the server message on failure', async () => {
		mockSetFavourite.mockResolvedValue({ ok: false, status: 500, message: 'Database down' })
		const w = mountIt()
		await w.get('button').trigger('click')
		await flushPromises()
		expect(w.get('button').attributes('aria-pressed')).toBe('false')
		expect(mockShowError).toHaveBeenCalledWith('Database down')
		expect(mockPatch).not.toHaveBeenCalled()
	})

	it('says the record is gone on a 404 and emits not-found', async () => {
		mockSetFavourite.mockResolvedValue({ ok: false, status: 404, message: 'x' })
		const w = mountIt()
		await w.get('button').trigger('click')
		await flushPromises()
		expect(mockShowError).toHaveBeenCalledWith('You can no longer see this record.')
		expect(w.emitted('not-found')).toBeTruthy()
	})
})
