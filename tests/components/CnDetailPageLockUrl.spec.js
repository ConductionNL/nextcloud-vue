/**
 * The lock URL CnDetailPage sends, with the REAL useObjectLock behind it.
 *
 * 🔴 EVERY OTHER DETAIL-PAGE LOCK SPEC MOCKS THE COMPOSABLE, AND THAT IS HOW
 * THIS SHIPPED. CnDetailPage hands useObjectLock getter functions
 * (`() => props.objectId`), and the composable read them with `unref`, which
 * returns a function untouched. So the getter's source went into the path:
 * pipelinq's detail pages sent
 * `/apps/openregister/api/objects/()=>pn/()=>Ct.schema||Bn/()=>Ct.objectId/lock`
 * and got a 404 on every page. A spec that replaces the composable with refs
 * cannot see what the page and the composable say to each other; this one
 * keeps both real and asserts the request.
 *
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */

import { mount } from '@vue/test-utils'

const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: mockAxios }))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
	generateOcsUrl: (path) => path,
	imagePath: (app, file) => `/${app}/img/${file}`,
}))
jest.mock('../../src/composables/useObjectSubscription.js', () => ({
	__esModule: true,
	useObjectSubscription: () => ({ status: { value: 'open' }, lastEventAt: { value: null } }),
}))

const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const stubs = {
	CnIcon: { template: '<div />' },
	CnLockedBanner: { template: '<div class="locked-banner" />' },
	NcEmptyContent: { template: '<div />' },
	NcLoadingIcon: { template: '<div />' },
	NcButton: { template: '<div />' },
}

/**
 * Mount the page on the lock path with a store double behind it.
 *
 * @param {object} props Extra props for the page.
 * @return {object} The wrapper.
 */
function mountPage(props) {
	return mount(CnDetailPage, {
		propsData: {
			title: 'Client',
			objectStore: { objects: {}, fetchObject: jest.fn().mockResolvedValue({}) },
			subscribe: true,
			...props,
		},
		stubs,
	})
}

describe('CnDetailPage sends the lock to the object, not to its getters', () => {
	beforeEach(() => {
		mockAxios.post.mockReset().mockResolvedValue({ data: {} })
		mockAxios.get.mockReset().mockResolvedValue({ data: {} })
	})

	it('🔴 acquires on /<register>/<schema>/<objectId>/lock', async () => {
		const wrapper = mountPage({ objectType: 'pipelinq-client', register: 'pipelinq', schema: 'client', objectId: 'abc-123' })

		await wrapper.vm.lockState.acquire()

		const lockCalls = mockAxios.post.mock.calls.filter(([url]) => String(url).endsWith('/lock'))
		expect(lockCalls).toHaveLength(1)
		expect(lockCalls[0][0]).toBe('/apps/openregister/api/objects/pipelinq/client/abc-123/lock')
		expect(lockCalls[0][0]).not.toMatch(/=>/)
		wrapper.unmount()
	})

	it('🔴 follows the object when the page moves to another record', async () => {
		const wrapper = mountPage({ objectType: 'pipelinq-client', register: 'pipelinq', schema: 'client', objectId: 'abc-123' })
		await wrapper.setProps({ objectId: 'def-456' })

		await wrapper.vm.lockState.acquire()

		expect(mockAxios.post).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/pipelinq/client/def-456/lock',
			{ duration: 1800 },
		)
		wrapper.unmount()
	})

	it('sends nothing while the register is unknown', async () => {
		const wrapper = mountPage({ objectType: 'pipelinq-client', objectId: 'abc-123' })

		await wrapper.vm.lockState.acquire()

		expect(mockAxios.post.mock.calls.filter(([url]) => String(url).includes('/lock'))).toHaveLength(0)
		wrapper.unmount()
	})
})

describe('CnDetailPage reads the lock target when it locks, not when it mounts', () => {
	beforeEach(() => {
		mockAxios.post.mockReset().mockResolvedValue({ data: {} })
	})

	it('🔴 uses a register that arrives after mount', async () => {
		const wrapper = mountPage({ objectType: 'pipelinq-client', schema: 'client', objectId: 'abc-123' })
		await wrapper.setProps({ register: 'pipelinq' })

		await wrapper.vm.lockState.acquire()

		expect(mockAxios.post).toHaveBeenCalledWith(
			'/apps/openregister/api/objects/pipelinq/client/abc-123/lock',
			{ duration: 1800 },
		)
		wrapper.unmount()
	})
})
