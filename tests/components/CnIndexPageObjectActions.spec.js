/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row and bulk object actions on CnIndexPage (object-actions-ui):
 * `actionsFrom: "openregister"` and `type: "object-action"` in a page's row
 * actions expand per row against the actions OpenRegister lists for that row;
 * in its bulk actions they expand against the actions offered on a selection,
 * and run on the selection through CnObjectActionDialog. OpenRegister is
 * mocked at the HTTP edge.
 *
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md#requirement-actionsfrom-renders-the-listed-actions-on-a-surface
 */
import { flushPromises, shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { showSuccess } = require('@nextcloud/dialogs')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROW_LIST = {
	actions: [
		{ key: 'claim', label: 'Claim', available: false, reason: 'Already claimed', surfaces: ['header', 'row', 'bulk'] },
		{ key: 'hold', label: 'Put on hold', available: true, surfaces: ['row'] },
		{ key: 'publish', label: 'Publish', available: true, surfaces: ['header'] },
		{ key: 'note', label: 'Add note', available: true, surfaces: ['row'], inputs: { type: 'object', properties: { text: { type: 'string' } } } },
	],
}
const SELECTION_LIST = { actions: [{ key: 'assign-to-me', label: 'Assign to me', available: true, surfaces: ['bulk'] }] }

const ROW = { id: 'c-1', '@self': { id: 'c-1', register: 'zaken', schema: 'case' } }

/**
 * Mount the page.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountPage(props = {}) {
	return shallowMount(CnIndexPage, {
		props: {
			title: 'Cases',
			objects: [ROW],
			register: 'zaken',
			schema: { title: 'Case', slug: 'case', properties: {} },
			showViewAction: false,
			showEditAction: false,
			showCopyAction: false,
			showDeleteAction: false,
			...props,
		},
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	// The page's own list read, which these tests do not look at.
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, json: () => Promise.resolve({ results: [] }) }))
	axios.get.mockImplementation((url) => Promise.resolve({ data: url.includes('/api/object-actions/') ? SELECTION_LIST : ROW_LIST }))
	axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed' } })
})

describe('CnIndexPage row object actions', () => {
	it('expands actionsFrom per row once the row\'s list is in, beside the declared actions', async () => {
		const wrapper = mountPage({ actions: [{ id: 'mail', label: 'Mail', handler: () => {} }, { id: 'or', actionsFrom: 'openregister' }] })
		expect(wrapper.vm.rowActionsFor(ROW).map((a) => a.id)).toEqual(['mail'])
		await flushPromises()
		expect(axios.get.mock.calls.some(([url]) => url.includes('/apps/openregister/api/objects/zaken/case/c-1/actions'))).toBe(true)
		const items = wrapper.vm.rowActionsFor(ROW)
		expect(items.map((a) => a.id)).toEqual(['mail', 'or:claim', 'or:hold', 'or:note'])
		expect(items[1]).toMatchObject({ label: 'Claim', disabled: true, title: 'Already claimed' })
	})

	it('reads each row once', async () => {
		const wrapper = mountPage({ actions: [{ id: 'or', actionsFrom: 'openregister' }] })
		wrapper.vm.rowActionsFor(ROW)
		wrapper.vm.rowActionsFor(ROW)
		await flushPromises()
		wrapper.vm.rowActionsFor(ROW)
		expect(axios.get.mock.calls.filter(([url]) => url.includes('/objects/zaken/case/c-1/actions'))).toHaveLength(1)
	})

	it('runs a plain row action at once', async () => {
		const wrapper = mountPage({ actions: [{ id: 'or', actionsFrom: 'openregister' }] })
		wrapper.vm.rowActionsFor(ROW)
		await flushPromises()
		const hold = wrapper.vm.rowActionsFor(ROW).find((a) => a.id === 'or:hold')
		await hold.handler(ROW)
		await flushPromises()
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-1/actions/hold')
		expect(showSuccess).toHaveBeenCalledWith('Put on hold: done')
		expect(wrapper.emitted('refresh')).toBeTruthy()
	})

	it('opens the dialog for a row action with inputs', async () => {
		const wrapper = mountPage({ actions: [{ id: 'note', type: 'object-action', action: 'note' }] })
		wrapper.vm.rowActionsFor(ROW)
		await flushPromises()
		await wrapper.vm.rowActionsFor(ROW)[0].handler(ROW)
		expect(wrapper.vm.objectActionDialog).toMatchObject({ register: 'zaken', schema: 'case', objectId: 'c-1', ids: [] })
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('does not run an unavailable row action', async () => {
		const wrapper = mountPage({ actions: [{ id: 'or', actionsFrom: 'openregister', include: ['claim'] }] })
		wrapper.vm.rowActionsFor(ROW)
		await flushPromises()
		await wrapper.vm.rowActionsFor(ROW)[0].handler(ROW)
		expect(axios.post).not.toHaveBeenCalled()
		expect(wrapper.vm.objectActionDialog).toBeNull()
	})
})

describe('CnIndexPage bulk object actions', () => {
	it('expands actionsFrom against the selection list and runs it on the selection in the dialog', async () => {
		const wrapper = mountPage({ bulkActions: [{ id: 'or', actionsFrom: 'openregister' }] })
		await flushPromises()
		expect(axios.get.mock.calls.some(([url]) => url.includes('/apps/openregister/api/object-actions/zaken/case'))).toBe(true)
		expect(wrapper.vm.mergedBulkActions.map((a) => a.id)).toEqual(['or:assign-to-me'])
		wrapper.vm.onBulkAction({ id: 'or:assign-to-me', selectedIds: ['a', 'b', 'c'] })
		expect(wrapper.vm.objectActionDialog).toMatchObject({ register: 'zaken', schema: 'case', objectId: '', ids: ['a', 'b', 'c'] })
		expect(wrapper.vm.objectActionDialog.action.key).toBe('assign-to-me')
	})

	it('reads no selection list when no bulk action asks for one', async () => {
		mountPage({ bulkActions: [{ id: 'export', label: 'Export', handler: 'emit' }] })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
	})
})
