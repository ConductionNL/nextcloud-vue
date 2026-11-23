/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An index page offers the bulk actions OpenRegister lists for its schema
 * and runs one on the selection in a single request.
 *
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md
 */
const mockList = jest.fn()
const mockRun = jest.fn()
jest.mock('../../src/composables/useObjectActions.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectActions.js')
	return { ...actual, fetchSelectionActions: (...a) => mockList(...a), runSelectionAction: (...a) => mockRun(...a) }
})
const mockSuccess = jest.fn()
const mockError = jest.fn()
jest.mock('@nextcloud/dialogs', () => ({ showSuccess: (...a) => mockSuccess(...a), showError: (...a) => mockError(...a) }))

const { flushPromises, shallowMount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ACTIONS = [
	{ key: 'archive', label: { nl: 'Archiveren', en: 'Archive' }, surfaces: ['bulk', 'row'] },
	{ key: 'publish', label: 'Publish', surfaces: ['header'] },
	{ key: 'close', label: 'Close', surfaces: ['bulk'] },
]

function mountPage(extra = {}) {
	return shallowMount(CnIndexPage, { props: { title: 'Decisions', register: 'decidiq', schema: 'decision', objects: [], ...extra } })
}

describe('CnIndexPage actionsFrom', () => {
	beforeEach(() => {
		mockList.mockReset()
		mockRun.mockReset()
		mockSuccess.mockReset()
		mockError.mockReset()
		mockList.mockResolvedValue(ACTIONS)
	})

	it('lists only the bulk-surface actions, narrowed and ordered by actionsInclude', async () => {
		const w = mountPage({ actionsFrom: 'openregister' })
		await flushPromises()
		expect(mockList).toHaveBeenCalledWith({ register: 'decidiq', schema: 'decision' })
		expect(w.vm.objectBulkEntries.map((e) => e.action)).toEqual(['archive', 'close'])
		expect(w.vm.objectBulkEntries[0]).toMatchObject({ id: 'or-action-archive', type: 'object-action' })
		const narrowed = mountPage({ actionsFrom: 'openregister', actionsInclude: ['close', 'archive'] })
		await flushPromises()
		expect(narrowed.vm.objectBulkEntries.map((e) => e.action)).toEqual(['close', 'archive'])
	})

	it('reads nothing without actionsFrom', async () => {
		const w = mountPage()
		await flushPromises()
		expect(mockList).not.toHaveBeenCalled()
		expect(w.vm.objectBulkEntries).toEqual([])
	})

	it('runs the action on the selection and reports the outcome', async () => {
		const w = mountPage({ actionsFrom: 'openregister' })
		await flushPromises()
		mockRun.mockResolvedValueOnce({ ok: true, queued: false })
		await w.vm.runBulkObjectAction({ action: 'archive' }, ['a', 'b'])
		expect(mockRun).toHaveBeenCalledWith({ register: 'decidiq', schema: 'decision' }, 'archive', ['a', 'b'], {})
		expect(mockSuccess).toHaveBeenCalledWith('Action completed.')
		mockRun.mockResolvedValueOnce({ ok: true, queued: true })
		await w.vm.runBulkObjectAction({ action: 'archive' }, ['a'])
		expect(mockSuccess).toHaveBeenLastCalledWith('Started. It finishes in the background.')
		mockRun.mockResolvedValueOnce({ ok: false, message: 'Not allowed.' })
		await w.vm.runBulkObjectAction({ action: 'archive' }, ['a'])
		expect(mockError).toHaveBeenCalledWith('Not allowed.')
		await w.vm.runBulkObjectAction({ action: 'archive' }, [])
		expect(mockRun).toHaveBeenCalledTimes(3)
	})
})
