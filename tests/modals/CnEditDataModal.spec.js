/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditDataModal — derives the app's register slugs from the
 * manifest, loads matching OpenRegister registers/schemas, and persists schema
 * add/edit/remove + register-linking via the OpenRegister API.
 */
import { mount } from '@vue/test-utils'

import axios from '@nextcloud/axios'
import CnEditDataModal, { invalidateDataCache } from '../../src/modals/CnEditDataModal.vue'

jest.mock('@nextcloud/router', () => ({ generateUrl: (p) => p }))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /></div>' })

function mountModal(manifest, provide = {}) {
	return mount(CnEditDataModal, {
		propsData: { manifest },
		provide,
		stubs: {
			NcModal: Stub('NcModal'),
			NcButton: Stub('NcButton', ['type', 'disabled']),
			NcTextField: Stub('NcTextField', ['value', 'label']),
			NcSelect: Stub('NcSelect', ['value', 'options']),
			NcLoadingIcon: Stub('NcLoadingIcon'),
			CnSchemaFormDialog: Stub('CnSchemaFormDialog', ['item']),
		},
	})
}

const MANIFEST = {
	pages: [
		{ id: 'a', config: { register: 'app-reg' } },
		{ id: 'b', config: { register: 'app-reg' } },
		{ id: 'c', config: {} },
	],
}

beforeEach(() => {
	// The modal keeps a process-lifetime cache of registers + resolved schemas.
	// Reset it between cases so each test loads from its own axios mocks instead
	// of a previous case's cached list/schemas.
	invalidateDataCache()
	axios.get.mockReset(); axios.post.mockReset(); axios.put.mockReset(); axios.patch.mockReset(); axios.delete.mockReset()
})

describe('CnEditDataModal', () => {
	it('manifestRegisterSlugs is the distinct set of page register slugs', () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const wrapper = mountModal(MANIFEST)
		expect(wrapper.vm.manifestRegisterSlugs).toEqual(['app-reg'])
	})

	it('loads only the registers referenced by the manifest, then their schemas', async () => {
		axios.get
			.mockResolvedValueOnce({
				data: {
					results: [
						{ id: 1, slug: 'app-reg', title: 'App', schemas: [10] },
						{ id: 2, slug: 'other', title: 'Other', schemas: [] },
					],
				},
			})
			.mockResolvedValueOnce({ data: { result: { id: 10, title: 'Thing', properties: { name: {} } } } })
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.registers.map((r) => r.slug)).toEqual(['app-reg'])
		expect(wrapper.vm.schemas.map((s) => s.id)).toEqual([10])
		expect(wrapper.vm.propertyCount(wrapper.vm.schemas[0])).toContain('1')
	})

	it('creating a schema POSTs it then links the new id onto the register', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10] }] } })
			.mockResolvedValueOnce({ data: { result: { id: 10, title: 'Thing', properties: {} } } })
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		axios.post.mockResolvedValue({ data: { result: { id: 11, title: 'New' } } })
		axios.patch.mockResolvedValue({ data: {} })
		axios.get.mockResolvedValue({ data: { result: { id: 11, title: 'New', properties: {} } } })
		wrapper.vm.editingSchema = null
		await wrapper.vm.onSchemaConfirm({ title: 'New', properties: {} })
		expect(axios.post).toHaveBeenCalledWith('/apps/openregister/api/schemas', { title: 'New', properties: {} }, expect.any(Object))
		// linkSchema PATCHes the register with the appended id.
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/registers/1', { schemas: [10, 11] }, expect.any(Object))
	})

	it('editing a schema PUTs to its id (no POST/link)', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10] }] } })
			.mockResolvedValueOnce({ data: { result: { id: 10, title: 'Thing', properties: {} } } })
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		axios.put.mockResolvedValue({ data: {} })
		axios.get.mockResolvedValue({ data: { result: { id: 10, title: 'Thing2', properties: {} } } })
		wrapper.vm.editingSchema = { id: 10, title: 'Thing' }
		await wrapper.vm.onSchemaConfirm({ id: 10, title: 'Thing2', properties: {} })
		expect(axios.put).toHaveBeenCalledWith('/apps/openregister/api/schemas/10', { id: 10, title: 'Thing2', properties: {} }, expect.any(Object))
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('mirrors loaded schemas into the injected cnDataSources (so page-config pickers see them)', async () => {
		const ds = { registers: [{ value: 'app-reg', label: 'App', schemas: [] }] }
		axios.get
			.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10, 11] }] } })
			.mockResolvedValueOnce({ data: { result: { id: 10, slug: 'thing', title: 'Thing', properties: { a: {} } } } })
			.mockResolvedValueOnce({ data: { result: { id: 11, slug: 'two', title: 'Two', properties: { b: {}, c: {} } } } })
		mountModal(MANIFEST, { cnDataSources: ds })
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(ds.registers[0].schemas).toEqual([
			{ value: 'thing', label: 'Thing', columns: ['a'] },
			{ value: 'two', label: 'Two', columns: ['b', 'c'] },
		])
	})

	it('removing a schema unlinks it from the register then DELETEs it', async () => {
		axios.get
			.mockResolvedValueOnce({ data: { results: [{ id: 1, slug: 'app-reg', title: 'App', schemas: [10, 11] }] } })
			.mockResolvedValueOnce({ data: { result: { id: 10, title: 'Thing', properties: {} } } })
			.mockResolvedValueOnce({ data: { result: { id: 11, title: 'Two', properties: {} } } })
		const wrapper = mountModal(MANIFEST)
		await new Promise((resolve) => setTimeout(resolve, 0))
		await wrapper.vm.$nextTick()
		axios.patch.mockResolvedValue({ data: {} })
		axios.delete.mockResolvedValue({ data: {} })
		axios.get.mockResolvedValue({ data: { result: { id: 11, title: 'Two', properties: {} } } })
		await wrapper.vm.removeSchema({ id: 10 })
		expect(axios.patch).toHaveBeenCalledWith('/apps/openregister/api/registers/1', { schemas: [11] }, expect.any(Object))
		expect(axios.delete).toHaveBeenCalledWith('/apps/openregister/api/schemas/10', expect.any(Object))
	})
})
