/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A menu entry whose `count` is `{ register, schema, filter }` gets the
 * total of that filtered list: one request per entry, straight through
 * axios with `_limit: 1` and the filter's tokens resolved, written under
 * the entry's id so the index page's whole-schema total is untouched.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-menu-entry-counts-a-filtered-list
 */
import { mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { post: jest.fn().mockRejectedValue(new Error('no batch route')), get: jest.fn() },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: jest.fn(() => ({ uid: 'pieter', displayName: 'Pieter' })) }))

const axios = require('@nextcloud/axios').default
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve))

function mountRoot(menu) {
	return mount(CnAppRoot, {
		propsData: {
			manifest: {
				version: '1.0.0',
				menu,
				pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'dossiq', schema: 'case' } }],
			},
			appId: 'dossiq',
			requiresApps: [],
		},
		mocks: { $route: { name: 'Cases' } },
		stubs: { 'router-view': true, NcAppSettingsDialog: true, NcAppSettingsSection: true },
	})
}

describe('CnAppRoot — filtered menu-entry counts', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('provides an empty cnMenuItemCounts and fetches nothing for integer and auto counts', async () => {
		const wrapper = mountRoot([{ id: 'all', label: 'All', route: 'Cases', count: 'auto' }, { id: 'n', label: 'N', route: 'Cases', count: 3 }])
		await flush()
		expect(wrapper.vm.$options.provide.call(wrapper.vm).cnMenuItemCounts).toEqual({})
		expect(axios.get.mock.calls.filter(([url]) => String(url).includes('/api/objects/'))).toHaveLength(0)
	})

	it('fetches each object count with the resolved filter and writes the total under the entry id', async () => {
		axios.get.mockImplementation(async (url, { params }) => ({ data: { total: params.assignee === 'pieter' ? 6 : 3, results: [] } }))
		const wrapper = mountRoot([
			{ id: 'mine', label: 'My work', route: 'Cases', count: { register: 'dossiq', schema: 'case', filter: { assignee: '@me' } } },
			{
				id: 'group',
				label: 'Group',
				children: [{ id: 'queue', label: 'Queue', route: 'Cases', count: { register: 'dossiq', schema: 'case', filter: { assignee: 'none' } } }],
			},
		])
		await flush()
		await flush()
		const calls = axios.get.mock.calls.filter(([url]) => String(url).includes('/api/objects/'))
		expect(calls).toHaveLength(2)
		expect(calls[0][0]).toContain('/apps/openregister/api/objects/dossiq/case')
		expect(calls[0][1]).toEqual({ params: { _limit: 1, assignee: 'pieter' } })
		expect(wrapper.vm.cnMenuItemCounts).toEqual({ mine: 6, queue: 3 })
		expect(wrapper.vm.cnMenuCounts).toEqual({})
	})

	it('leaves the badge unrendered when the request fails', async () => {
		axios.get.mockRejectedValue(new Error('500'))
		const wrapper = mountRoot([{ id: 'mine', label: 'My work', route: 'Cases', count: { register: 'dossiq', schema: 'case' } }])
		await flush()
		expect(wrapper.vm.cnMenuItemCounts).toEqual({})
	})
})
