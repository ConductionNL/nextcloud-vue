/**
 * Tests for the lock CnDetailPage takes when an edit form opens.
 *
 * 🔴 WHAT THIS GUARDS IS TWO PEOPLE EDITING ONE RECORD. The page has rendered a
 * locked banner for months and has never TAKEN a lock: `openEditForm()` set a
 * flag and nothing else, so the banner only ever showed a lock some other
 * surface had written. Two handlers opening the same case therefore both got a
 * form, and the second Save overwrote the first with nobody told.
 *
 * Three properties, and each fails differently:
 *
 *  - opening ACQUIRES. Without it the banner is decoration.
 *  - closing and saving RELEASE. Without it the lock outlives the editor and
 *    the next person is refused by somebody who left twenty minutes ago.
 *  - the Edit button is WITHDRAWN while another user holds the lock, rather
 *    than offered and then refused by the write. A form you fill in and then
 *    lose is worse than a button that is not there.
 *
 * 🔑 THE FORM OPENS SYNCHRONOUSLY. Awaiting the acquire inside `openEditForm()`
 * turned it async and reddened 10 of the 17 `CnDetailPageFormDialogSlot` tests,
 * which call it and render on the next tick. So the acquire runs beside the
 * open and a conflict closes the form again, which is the same outcome one tick
 * later.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), delete: jest.fn(), put: jest.fn() },
}))

const mockLockRefs = {
	locked: ref(false),
	lockedByMe: ref(false),
	lockedBy: ref(null),
	expiresAt: ref(null),
	acquire: jest.fn(),
	release: jest.fn(),
}

/** What the page asked the composable for, so the slug can be asserted. */
const mockLockArgs = { calls: [] }

jest.mock('../../src/composables/useObjectLock.js', () => ({
	__esModule: true,
	useObjectLock: (...args) => {
		mockLockArgs.calls.push(args)
		return mockLockRefs
	},
}))
jest.mock('../../src/composables/useObjectSubscription.js', () => ({
	__esModule: true,
	useObjectSubscription: () => ({ status: { value: 'open' }, lastEventAt: { value: null } }),
}))

const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const stubs = {
	CnIcon: { template: '<div />' },
	CnLockedBanner: {
		name: 'CnLockedBanner',
		props: ['lockedBy', 'lockedByMe', 'expiresAt', 'unlocking'],
		template: '<div class="locked-banner" />',
	},
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	NcButton: { template: '<div />' },
	AlertCircleOutline: { template: '<div />' },
	InformationOutline: { template: '<div />' },
	Refresh: { template: '<div />' },
}

/**
 * Mount the page with the lock path live and no store behind it.
 *
 * @return {object} The wrapper.
 */
function mountDetail() {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Test',
			objectType: 'dossiq-case',
			register: 'dossiq',
			schema: 'case',
			objectId: 'abc-123',
			objectStore: {},
			subscribe: true,
		},
		stubs,
	})
}

describe('CnDetailPage — the edit form takes the lock', () => {
	beforeEach(() => {
		mockLockRefs.locked.value = false
		mockLockRefs.lockedByMe.value = false
		mockLockRefs.lockedBy.value = null
		mockLockRefs.acquire.mockReset().mockResolvedValue(undefined)
		mockLockRefs.release.mockReset().mockResolvedValue(undefined)
		mockLockArgs.calls = []
	})

	it('🔴 asks for the lock when the edit form opens', () => {
		const wrapper = mountDetail()

		expect(mockLockRefs.acquire).not.toHaveBeenCalled()
		wrapper.vm.openEditForm()

		expect(mockLockRefs.acquire).toHaveBeenCalledTimes(1)
		// And the form is open in the same tick, which is the contract every
		// existing consumer of openEditForm() relies on.
		expect(wrapper.vm.editFormOpen).toBe(true)
	})

	it('hands the composable the schema SLUG for the url, not the cache key', () => {
		mountDetail()

		const options = mockLockArgs.calls[0][4]
		expect(typeof options.schemaSlug).toBe('function')
		expect(options.schemaSlug()).toBe('case')
	})

	it('🔴 releases the lock when the form is closed without saving', () => {
		const wrapper = mountDetail()
		wrapper.vm.openEditForm()
		mockLockRefs.lockedByMe.value = true

		wrapper.vm.closeEditForm()

		expect(wrapper.vm.editFormOpen).toBe(false)
		expect(mockLockRefs.release).toHaveBeenCalledTimes(1)
	})

	it('does not release a lock the viewer does not hold', () => {
		const wrapper = mountDetail()
		mockLockRefs.lockedByMe.value = false

		wrapper.vm.closeEditForm()

		expect(mockLockRefs.release).not.toHaveBeenCalled()
	})

	it('🔴 closes the form and names the holder when the lock is refused', async () => {
		const conflict = new Error('Being edited by Anna since 09:12')
		conflict.name = 'LockConflictError'
		mockLockRefs.acquire.mockRejectedValueOnce(conflict)

		const wrapper = mountDetail()
		wrapper.vm.openEditForm()
		await new Promise((resolve) => setTimeout(resolve, 0))

		expect(wrapper.vm.editFormOpen).toBe(false)
		expect(wrapper.vm.editLockRefusal).toBe('Being edited by Anna since 09:12')
	})

	it('leaves the form open when the acquire fails for any other reason', async () => {
		mockLockRefs.acquire.mockRejectedValueOnce(new Error('network down'))

		const wrapper = mountDetail()
		wrapper.vm.openEditForm()
		await new Promise((resolve) => setTimeout(resolve, 0))

		// The server re-checks on the write, so an unreachable lock costs an
		// optimistic edit rather than an editor who cannot work at all.
		expect(wrapper.vm.editFormOpen).toBe(true)
		expect(wrapper.vm.editLockRefusal).toBe('')
	})

	it('🔴 withdraws Edit while another user holds the lock', () => {
		const wrapper = mountDetail()
		expect(wrapper.vm.editLockedByOther).toBe(false)

		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = false

		expect(wrapper.vm.editLockedByOther).toBe(true)
		expect(wrapper.vm.canEditRecord).toBe(false)
	})

	it('leaves Edit alone for a lock the viewer holds themselves', () => {
		const wrapper = mountDetail()
		mockLockRefs.locked.value = true
		mockLockRefs.lockedByMe.value = true

		expect(wrapper.vm.editLockedByOther).toBe(false)
	})
})
