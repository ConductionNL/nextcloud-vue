/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/record-favourite-and-follow/tasks.md#task-2
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockSetWatching = jest.fn()
const mockListWatchers = jest.fn()
const mockSetWatcher = jest.fn()
jest.mock('../../src/utils/recordInteractions.js', () => ({
	__esModule: true,
	setWatching: (...a) => mockSetWatching(...a),
	listWatchers: (...a) => mockListWatchers(...a),
	setWatcher: (...a) => mockSetWatcher(...a),
}))
jest.mock('../../src/utils/patchStoredSelf.js', () => ({ __esModule: true, patchStoredSelf: jest.fn() }))
const mockShowError = jest.fn()
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: (...a) => mockShowError(...a) }))
jest.mock('../../src/utils/userAutocomplete.js', () => ({ __esModule: true, searchNextcloudUsers: jest.fn(async () => [{ id: 'jan', label: 'Jan' }]) }))

import CnFollowToggle from '../../src/components/CnFollowToggle/CnFollowToggle.vue'

const stubs = {
	NcButton: { template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>' },
	NcPopover: { props: ['shown'], template: '<div><slot name="trigger" /><div v-if="shown"><slot /></div></div>' },
	NcAvatar: true,
	NcLoadingIcon: true,
	NcSelect: { template: '<div class="picker" />' },
}
function mountIt(props = {}) {
	return mount(CnFollowToggle, {
		props: { register: 'pipelinq', schema: 'ticket', objectId: 'c1', currentUser: 'ruben', ...props },
		global: { stubs },
	})
}
const toggle = (w) => w.get('[data-testid="cn-follow-toggle-button"]')

beforeEach(() => {
	mockSetWatching.mockReset()
	mockListWatchers.mockReset()
	mockSetWatcher.mockReset()
	mockShowError.mockReset()
})

describe('CnFollowToggle', () => {
	it('reads Follow or Following with aria-pressed', () => {
		const off = mountIt()
		expect(toggle(off).text()).toBe('Follow')
		expect(toggle(off).attributes('aria-pressed')).toBe('false')
		const on = mountIt({ watching: true })
		expect(toggle(on).text()).toBe('Following')
		expect(toggle(on).attributes('aria-pressed')).toBe('true')
	})

	it('flips before the answer arrives, sends PUT .../watch and moves the count', async () => {
		let resolve
		mockSetWatching.mockReturnValue(new Promise((r) => {
			resolve = r
		}))
		const w = mountIt({ watcherCount: 2 })
		await toggle(w).trigger('click')
		expect(toggle(w).text()).toBe('Following')
		expect(w.get('[data-testid="cn-follow-toggle-count"]').text()).toBe('3')
		expect(mockSetWatching).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', true)
		resolve({ ok: true, status: 200 })
		await flushPromises()
		expect(w.emitted('change')[0][0]).toEqual({ watching: true, count: 3 })
	})

	it('sends DELETE to unfollow', async () => {
		mockSetWatching.mockResolvedValue({ ok: true, status: 204 })
		const w = mountIt({ watching: true })
		await toggle(w).trigger('click')
		expect(mockSetWatching).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', false)
		expect(toggle(w).text()).toBe('Follow')
	})

	it('reverts and shows the server message when the call fails', async () => {
		mockSetWatching.mockResolvedValue({ ok: false, status: 500, message: 'Nope' })
		const w = mountIt({ watcherCount: 2 })
		await toggle(w).trigger('click')
		await flushPromises()
		expect(toggle(w).text()).toBe('Follow')
		expect(w.get('[data-testid="cn-follow-toggle-count"]').text()).toBe('2')
		expect(mockShowError).toHaveBeenCalledWith('Nope')
	})

	it('says the record is gone on a 404 and emits not-found', async () => {
		mockSetWatching.mockResolvedValue({ ok: false, status: 404, message: '' })
		const w = mountIt()
		await toggle(w).trigger('click')
		await flushPromises()
		expect(mockShowError).toHaveBeenCalledWith('You can no longer see this record.')
		expect(w.emitted('not-found')).toBeTruthy()
	})

	it('changes the tooltip when the register sends no notifications', () => {
		expect(toggle(mountIt({ notifies: false })).attributes('title')).toContain('sends no change notifications')
		expect(toggle(mountIt()).attributes('title')).not.toContain('no change notifications')
	})

	it('shows no count and never lists watchers without watcherCount', async () => {
		const w = mountIt()
		await flushPromises()
		expect(w.find('[data-testid="cn-follow-toggle-count"]').exists()).toBe(false)
		expect(mockListWatchers).not.toHaveBeenCalled()
	})

	it('fetches the followers only when the popover opens', async () => {
		mockListWatchers.mockResolvedValue({ ok: true, data: { results: [{ userId: 'ruben', created: '2026-10-01T10:00:00Z' }, { userId: 'jan' }], total: 2 } })
		const w = mountIt({ watcherCount: 2 })
		expect(mockListWatchers).not.toHaveBeenCalled()
		w.vm.open = true
		await flushPromises()
		expect(mockListWatchers).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1')
		expect(w.findAll('.cn-follow-toggle__row')).toHaveLength(2)
	})

	it('closes the popover without a toast on a 403', async () => {
		mockListWatchers.mockResolvedValue({ ok: false, status: 403, message: 'Forbidden' })
		const w = mountIt({ watcherCount: 2 })
		w.vm.open = true
		await flushPromises()
		expect(w.vm.open).toBe(false)
		expect(mockShowError).not.toHaveBeenCalled()
	})

	it('offers the picker and a remove on every row only with manage', async () => {
		mockListWatchers.mockResolvedValue({ ok: true, data: { results: [{ userId: 'ruben' }, { userId: 'jan' }], total: 2 } })
		const managed = mountIt({ watcherCount: 2, canManage: true })
		managed.vm.open = true
		await flushPromises()
		expect(managed.find('.picker').exists()).toBe(true)
		expect(managed.findAll('[data-testid="cn-follow-toggle-remove"]')).toHaveLength(2)
		const plain = mountIt({ watcherCount: 2, canManage: false })
		plain.vm.open = true
		await flushPromises()
		expect(plain.find('.picker').exists()).toBe(false)
		expect(plain.findAll('[data-testid="cn-follow-toggle-remove"]')).toHaveLength(1)
	})

	it('adds a colleague with PUT .../watchers/{user} and relists', async () => {
		mockListWatchers.mockResolvedValue({ ok: true, data: { results: [{ userId: 'ruben' }], total: 1 } })
		mockSetWatcher.mockResolvedValue({ ok: true, status: 200 })
		const w = mountIt({ watcherCount: 1, canManage: true })
		w.vm.open = true
		await flushPromises()
		await w.vm.addWatcher({ id: 'jan', label: 'Jan' })
		expect(mockSetWatcher).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', 'jan', true)
		expect(mockListWatchers).toHaveBeenCalledTimes(2)
	})

	it('keeps the popover open and shows the server message on a 400', async () => {
		mockListWatchers.mockResolvedValue({ ok: true, data: { results: [], total: 0 } })
		mockSetWatcher.mockResolvedValue({ ok: false, status: 400, message: 'Unknown user' })
		const w = mountIt({ watcherCount: 0, canManage: true })
		w.vm.open = true
		await flushPromises()
		await w.vm.addWatcher({ id: 'nobody' })
		await flushPromises()
		expect(w.vm.open).toBe(true)
		expect(w.get('[data-testid="cn-follow-toggle-error"]').text()).toBe('Unknown user')
	})

	it('removes a follower with DELETE', async () => {
		mockListWatchers.mockResolvedValue({ ok: true, data: { results: [{ userId: 'jan' }], total: 1 } })
		mockSetWatcher.mockResolvedValue({ ok: true, status: 204 })
		const w = mountIt({ watcherCount: 1, canManage: true })
		w.vm.open = true
		await flushPromises()
		await w.vm.removeWatcher({ userId: 'jan' })
		expect(mockSetWatcher).toHaveBeenCalledWith('pipelinq', 'ticket', 'c1', 'jan', false)
	})
})
