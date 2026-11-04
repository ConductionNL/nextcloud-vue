/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A sub-record's trail can name its parent record: a crumb with `parent`
 * names a `visibilityContext` entry, shows the parent's label and links to
 * the parent's page. A record without a parent drops the crumb.
 *
 * @spec openspec/changes/detail-parent-crumb/specs/detail-page/spec.md#requirement-a-sub-record-trail-can-show-its-parent-record
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnBreadcrumbs from '../../src/components/CnBreadcrumbs/CnBreadcrumbs.vue'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import { parentCrumb } from '../../src/utils/parentCrumb.js'

const mockFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => {
	const actual = jest.requireActual('../../src/utils/cnFetch.js')
	return { ...actual, cnFetchJson: (...a) => mockFetchJson(...a) }
})

const PARENT = { id: 'p-1', title: 'Parent record', identifier: 'R-2026-001' }

describe('CnDetailPage: a parent crumb on a sub-record trail', () => {
	const records = {
		'c-1': { id: 'c-1', title: 'Child record', parent: 'p-1' },
		'c-2': { id: 'c-2', title: 'Top record', parent: null },
	}
	const store = {
		objects: { 'reg-item': records },
		schemas: {},
		objectTypeRegistry: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
	const breadcrumb = [
		{ label: 'Records', route: 'Records' },
		{ parent: 'parentRecord', labelField: 'identifier', route: 'RecordDetail' },
	]
	const mountPage = (objectId, crumbs = breadcrumb) => mount(CnDetailPage, {
		propsData: {
			title: 'Record',
			register: 'reg',
			schema: 'item',
			objectId,
			objectStore: store,
			breadcrumb: crumbs,
			visibilityContext: { parentRecord: { field: 'parent', register: 'reg', schema: 'item' } },
		},
		mocks: { $route: { params: {}, query: {}, name: 'RecordDetail' }, $router: { push: jest.fn(), replace: jest.fn() } },
	})

	beforeEach(() => {
		mockFetchJson.mockReset()
		mockFetchJson.mockImplementation(async (url) => (url.endsWith('/p-1') ? PARENT : null))
	})

	it('shows the parent label linked to the parent page', async () => {
		const wrapper = mountPage('c-1')
		await flushPromises()
		await flushPromises()
		expect(mockFetchJson).toHaveBeenCalledWith('/apps/openregister/api/objects/reg/item/p-1')
		expect(wrapper.findComponent(CnBreadcrumbs).props('crumbs')).toEqual([
			{ label: 'Records', to: { name: 'Records' } },
			{ label: 'R-2026-001', to: { name: 'RecordDetail', params: { id: 'p-1' } } },
			{ label: 'Child record' },
		])
	})

	it('drops the parent crumb for a record without a parent', async () => {
		const wrapper = mountPage('c-2')
		await flushPromises()
		expect(wrapper.findComponent(CnBreadcrumbs).props('crumbs')).toEqual([
			{ label: 'Records', to: { name: 'Records' } },
			{ label: 'Top record' },
		])
	})

	it('draws no trail when the parent crumb is the only one and there is no parent', async () => {
		const wrapper = mountPage('c-2', [{ parent: 'parentRecord', route: 'RecordDetail' }])
		await flushPromises()
		expect(wrapper.findComponent(CnBreadcrumbs).exists()).toBe(false)
	})
})

describe('parentCrumb', () => {
	const refs = [{ key: 'parentRecord', id: 'p 1' }]
	const translate = (s) => `T:${s}`

	it('falls back to the parent name, then to the translated crumb label', () => {
		expect(parentCrumb({ parent: 'parentRecord', labelField: 'missing' }, refs, { parentRecord: { title: 'Parent record' } }, translate))
			.toEqual({ label: 'Parent record' })
		expect(parentCrumb({ parent: 'parentRecord', label: 'Parent' }, refs, { parentRecord: null }, translate))
			.toEqual({ label: 'T:Parent' })
		expect(parentCrumb({ parent: 'parentRecord' }, refs, {}, translate)).toBeNull()
	})

	it('fills the id into a custom route param and an href', () => {
		const rows = { parentRecord: PARENT }
		expect(parentCrumb({ parent: 'parentRecord', route: 'Case', param: 'caseId', params: { tab: 'x' } }, refs, rows, translate).to)
			.toEqual({ name: 'Case', params: { tab: 'x', caseId: 'p 1' } })
		expect(parentCrumb({ parent: 'parentRecord', href: '/records/{id}' }, refs, rows, translate).href).toBe('/records/p%201')
	})

	it('drops the crumb when the context entry is unknown or empty', () => {
		expect(parentCrumb({ parent: 'other' }, refs, {}, translate)).toBeNull()
		expect(parentCrumb({ parent: 'parentRecord' }, [{ key: 'parentRecord', id: '' }], { parentRecord: PARENT }, translate)).toBeNull()
	})
})
