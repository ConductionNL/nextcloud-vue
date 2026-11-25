/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailPage opens a record from the take-along set while offline
 * (manifest-offline-block task 3, design D5): the device's copy with its
 * download time, edit and the menu's actions disabled with the reason, and
 * no not-found page for a record the device holds.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline
 */

const mockRead = jest.fn()
jest.mock('../../src/integrations/offline/takeAlong.js', () => ({
	readTakeAlong: (...args) => mockRead(...args),
}))

const { flushPromises, shallowMount } = require('@vue/test-utils')
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const DOWNLOADED = new Date(2026, 10, 25, 8, 14).toISOString()
const schema = { title: 'Inspection', properties: { title: { type: 'string' } } }
const record = { id: 'i1', title: 'Kerkstraat 12' }

/**
 * Set navigator.onLine.
 *
 * @param {boolean} value Online or not.
 * @return {void}
 */
function setOnline(value) {
	Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
}

/**
 * Mount the inspection detail page with a store that cannot reach the server.
 *
 * @param {object} [extra] More props.
 * @return {object} The wrapper.
 */
function mountDetail(extra = {}) {
	const store = {
		schemas: { 'toezicht-inspection': schema },
		objects: {},
		fetchObject: jest.fn(() => Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true }))),
		fetchSchema: jest.fn(() => Promise.resolve()),
		getError: jest.fn().mockReturnValue(null),
	}
	return shallowMount(CnDetailPage, {
		propsData: {
			title: 'Inspection',
			register: 'toezicht',
			schema: 'inspection',
			objectId: 'i1',
			objectStore: store,
			showEditAction: true,
			offlineTakeAlong: true,
			...extra,
		},
	})
}

describe('CnDetailPage offline', () => {
	beforeEach(() => {
		mockRead.mockReset()
		mockRead.mockResolvedValue({ rows: [record, { id: 'i2', title: 'Molenweg 4' }], syncedAt: DOWNLOADED, expiresAt: new Date(Date.now() + 3600000).toISOString(), expired: false })
		jest.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	afterAll(() => setOnline(true))

	it('opens the record from the device with its download time and edit disabled', async () => {
		setOnline(false)
		const wrapper = mountDetail()
		await flushPromises()

		expect(mockRead).toHaveBeenCalledWith('toezicht', 'inspection')
		expect(wrapper.vm.currentObject).toEqual(record)
		expect(wrapper.find('[data-testid="cn-detail-page-offline"]').text()).toBe('You are offline. Downloaded at 08:14.')
		expect(wrapper.find('[data-testid="cn-detail-page-not-found"]').exists()).toBe(false)
		const edit = wrapper.find('[data-testid="cn-detail-page-edit"]')
		expect(edit.exists()).toBe(true)
		expect(edit.attributes('disabled')).toBe('true')
		expect(edit.attributes('title')).toBe('Not available offline.')
	})

	it('disables every menu action with the reason', async () => {
		setOnline(false)
		const wrapper = mountDetail({ headerActions: [{ id: 'close', label: 'Close inspection', type: 'emit', event: 'close' }] })
		await flushPromises()
		wrapper.vm.menuHeaderActions = [{ id: 'close', label: 'Close inspection', run: jest.fn() }]
		await flushPromises()

		const entries = wrapper.vm.headerMenuGroups.flatMap((group) => group.entries)
		expect(entries.length).toBeGreaterThan(0)
		expect(entries.every((entry) => entry.disabled === true && entry.disabledReason === 'Not available offline.')).toBe(true)
	})

	it('says the copy expired and shows no record once the set has expired', async () => {
		setOnline(false)
		mockRead.mockResolvedValue({ rows: [], syncedAt: DOWNLOADED, expiresAt: DOWNLOADED, expired: true })
		const wrapper = mountDetail()
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-detail-page-offline"]').text()).toBe('The records on this device have expired. Connect to download them again.')
		expect(wrapper.vm.currentObject).toBeNull()
	})

	it('never opens the offline database when the manifest takes nothing along', async () => {
		setOnline(false)
		const wrapper = mountDetail({ offlineTakeAlong: false })
		await flushPromises()

		expect(mockRead).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-detail-page-offline"]').exists()).toBe(false)
	})
})
