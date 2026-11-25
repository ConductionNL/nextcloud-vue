/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage reads the take-along set while offline (manifest-offline-block
 * task 3, design D5): the downloaded rows with a status bar, searched and
 * sorted on the device; an expired set shows the sentence and no rows; a
 * page whose manifest takes nothing along never opens the offline database.
 *
 * @spec openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline
 */

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: { results: [] } })) } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url, generateOcsUrl: (url) => url }))

const mockRead = jest.fn()
jest.mock('../../src/integrations/offline/takeAlong.js', () => ({
	readTakeAlong: (...args) => mockRead(...args),
}))

const { flushPromises, mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const DOWNLOADED = new Date(2026, 10, 25, 8, 14).toISOString()

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
 * Mount the inspections list.
 *
 * @param {object} [extra] More props.
 * @return {object} The wrapper.
 */
function mountPage(extra = {}) {
	const $route = { query: {}, params: {}, path: '/inspections' }
	const $router = { replace: jest.fn(() => Promise.resolve()), push: jest.fn() }
	return mount(CnIndexPage, {
		propsData: {
			title: 'Inspections',
			register: 'toezicht',
			schema: 'inspection',
			objects: [],
			offlineTakeAlong: true,
			selectable: true,
			columns: [{ key: 'title', label: 'Title' }],
			...extra,
		},
		global: { mocks: { $route, $router } },
		stubs: { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnContextMenu: true, CnIndexSidebar: true },
	})
}

describe('CnIndexPage offline', () => {
	beforeEach(() => {
		mockRead.mockReset()
		mockRead.mockResolvedValue({
			rows: [{ id: 'i2', title: 'Molenweg 4' }, { id: 'i1', title: 'Kerkstraat 12' }],
			syncedAt: DOWNLOADED,
			expiresAt: new Date(Date.now() + 3600000).toISOString(),
			expired: false,
		})
	})

	afterAll(() => setOnline(true))

	it('shows the downloaded rows with how many and when, and turns selection off', async () => {
		setOnline(false)
		const wrapper = mountPage()
		await flushPromises()

		expect(mockRead).toHaveBeenCalledWith('toezicht', 'inspection')
		expect(wrapper.find('[data-testid="cn-index-page-offline"]').text()).toBe('You are offline. Showing 2 records downloaded at 08:14.')
		expect(wrapper.vm.effectiveObjects.map((row) => row.title)).toEqual(['Molenweg 4', 'Kerkstraat 12'])
		const table = wrapper.findComponent({ name: 'CnDataTable' })
		expect(table.exists()).toBe(true)
		expect(table.attributes('selectable')).toBe('false')
	})

	it('searches and sorts the downloaded rows on the device', async () => {
		setOnline(false)
		const wrapper = mountPage({ sortKey: 'title', searchValue: 'straat' })
		await flushPromises()

		expect(wrapper.vm.effectiveObjects.map((row) => row.title)).toEqual(['Kerkstraat 12'])
		await wrapper.setProps({ searchValue: '' })
		expect(wrapper.vm.effectiveObjects.map((row) => row.title)).toEqual(['Kerkstraat 12', 'Molenweg 4'])
		expect(wrapper.find('[data-testid="cn-index-page-offline"]').text()).toBe('You are offline. Showing 2 records downloaded at 08:14.')
	})

	it('shows no rows and says so once the set has expired', async () => {
		setOnline(false)
		mockRead.mockResolvedValue({ rows: [], syncedAt: DOWNLOADED, expiresAt: DOWNLOADED, expired: true })
		const wrapper = mountPage({ objects: [{ id: 'stale', title: 'Should not show' }] })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-index-page-offline"]').text()).toBe('The records on this device have expired. Connect to download them again.')
		expect(wrapper.vm.effectiveObjects).toEqual([])
	})

	it('comes back to the page\'s own rows once online', async () => {
		setOnline(false)
		const wrapper = mountPage({ objects: [{ id: 'live', title: 'Live' }] })
		await flushPromises()
		expect(wrapper.vm.effectiveObjects.map((row) => row.id)).toEqual(['i2', 'i1'])

		setOnline(true)
		window.dispatchEvent(new Event('online'))
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-index-page-offline"]').exists()).toBe(false)
		expect(wrapper.vm.effectiveObjects.map((row) => row.id)).toEqual(['live'])
	})

	it('keeps today\'s behaviour when nothing was ever downloaded', async () => {
		setOnline(false)
		mockRead.mockResolvedValue({ rows: [], syncedAt: null, expiresAt: null, expired: false })
		const wrapper = mountPage({ objects: [{ id: 'x', title: 'X' }] })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-index-page-offline"]').exists()).toBe(false)
		expect(wrapper.vm.effectiveObjects.map((row) => row.id)).toEqual(['x'])
	})

	it('never opens the offline database when the manifest takes nothing along', async () => {
		setOnline(false)
		const wrapper = mountPage({ offlineTakeAlong: false })
		await flushPromises()
		window.dispatchEvent(new Event('offline'))
		await flushPromises()

		expect(mockRead).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-index-page-offline"]').exists()).toBe(false)
	})
})
