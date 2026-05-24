/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactsTab — bespoke vCard tab for the `contacts`
 * integration leaf.
 *
 * Covers:
 *  - Loading / error / empty states (ADR-017 "every async surface")
 *  - Role-grouped rendering (AD-1)
 *  - Unlink (DELETE)
 *  - Reverse-lookup event emission (AD-3)
 *
 * @spec openspec/changes/integration-contacts/specs/integrations/contacts/spec.md
 */

import { mount } from '@vue/test-utils'

import CnContactsTab from '../../../src/integrations/builtin/contacts/CnContactsTab.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Stub material-design-icons + Nc components so the tab renders without
 * pulling in the full UI library.
 */
const stubs = {
	NcButton: { name: 'NcButton', template: '<button @click="$emit(\'click\')"><slot /></button>' },
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	NcEmptyContent: {
		name: 'NcEmptyContent',
		props: ['name', 'description'],
		template: '<div class="empty"><span class="name">{{ name }}</span><span class="desc">{{ description }}</span></div>',
	},
	AccountPlus: true,
	AccountMultipleOutline: true,
	AlertCircleOutline: true,
	Close: true,
}

describe('CnContactsTab', () => {
	let originalFetch

	beforeEach(() => {
		originalFetch = global.fetch
		global.fetch = jest.fn()
	})

	afterEach(() => {
		global.fetch = originalFetch
		jest.restoreAllMocks()
	})

	it('renders the loading state before the fetch resolves', async () => {
		global.fetch.mockReturnValue(new Promise(() => {})) // never resolves
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.loading').exists()).toBe(true)
	})

	it('renders the empty state when no contacts are returned', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], total: 0 }),
		})
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.empty').exists()).toBe(true)
		expect(wrapper.findAll('.cn-contacts-tab__item').length).toBe(0)
	})

	it('renders the error state when the fetch fails', async () => {
		global.fetch.mockResolvedValue({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			json: async () => ({}),
		})
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		const empties = wrapper.findAll('.empty')
		expect(empties.length).toBeGreaterThan(0)
		expect(empties.at(0).text()).toContain('Could not load')
	})

	it('groups contacts by normalised role bucket (AD-1)', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [
					{ id: 1, displayName: 'Jan de Vries', email: 'jan@example.nl', role: 'applicant' },
					{ id: 2, displayName: 'Mia Bakker', email: 'mia@example.nl', role: 'handler' },
					{ id: 3, displayName: 'Piet Smit', email: 'piet@example.nl', role: 'aanvrager' },
					{ id: 4, displayName: 'Anne Mol', email: 'anne@example.nl', role: null },
					{ id: 5, displayName: 'Behandelaar B', email: 'b@example.nl', role: 'behandelaar' },
				],
				total: 5,
			}),
		})
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		const groups = wrapper.findAll('.cn-contacts-tab__group')
		// applicant (Jan + Piet), handler (Mia + Behandelaar B), other (Anne)
		expect(groups.length).toBe(3)
		const titles = groups.wrappers.map((g) => g.find('.cn-contacts-tab__group-title').text())
		expect(titles[0]).toContain('Applicants')
		expect(titles[1]).toContain('Handlers')
		expect(titles[2]).toContain('Other')
	})

	it('emits open-reverse-lookup with contactUid when an item is clicked (AD-3)', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [
					{ id: 1, contactUid: 'uid-jan', displayName: 'Jan', email: 'j@x.nl', role: 'applicant' },
				],
				total: 1,
			}),
		})
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		await wrapper.find('.cn-contacts-tab__item').trigger('click')
		expect(wrapper.emitted('open-reverse-lookup')).toBeTruthy()
		expect(wrapper.emitted('open-reverse-lookup')[0][0]).toEqual({
			contactUid: 'uid-jan',
			displayName: 'Jan',
		})
	})

	it('builds initials from display name', () => {
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: { objectId: '', register: '', schema: '' },
		})
		expect(wrapper.vm.initialsFor({ displayName: 'Jan de Vries' })).toBe('JV')
		expect(wrapper.vm.initialsFor({ displayName: 'Jan' })).toBe('J')
		expect(wrapper.vm.initialsFor({ displayName: '' })).toBe('?')
		expect(wrapper.vm.initialsFor({})).toBe('?')
	})

	it('does not throw when the response body is a non-iterable shape', async () => {
		// Phase A / D-1 bug: groupedContacts threw "this.contacts is
		// not iterable" because the old `data.results || data || []`
		// fallback would assign a bare object to `this.contacts`.
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({ unexpected: { foo: 'bar' } }),
		})
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		// Empty state renders (we treat unknown shapes as empty),
		// no TypeError surfaces in console.
		expect(wrapper.find('.empty').exists()).toBe(true)
		expect(errSpy).not.toHaveBeenCalled()
		errSpy.mockRestore()
	})

	it('calls DELETE when unlink is clicked and removes the item', async () => {
		global.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{ id: 7, contactUid: 'uid-x', displayName: 'X', email: 'x@x.nl', role: 'applicant' },
					],
					total: 1,
				}),
			})
			.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) })

		const wrapper = mount(CnContactsTab, {
			stubs,
			propsData: {
				objectId: 'obj-1',
				register: 'reg',
				schema: 'sch',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.findAll('.cn-contacts-tab__item').length).toBe(1)

		await wrapper.find('.cn-contacts-tab__unlink').trigger('click')
		await flush()
		await wrapper.vm.$nextTick()

		expect(global.fetch).toHaveBeenCalledTimes(2)
		const [url, opts] = global.fetch.mock.calls[1]
		expect(url).toContain('/integrations/contacts/7')
		expect(opts.method).toBe('DELETE')
		expect(wrapper.vm.contacts.length).toBe(0)
	})
})
