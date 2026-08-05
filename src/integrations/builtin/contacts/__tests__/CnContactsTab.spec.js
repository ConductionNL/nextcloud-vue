/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactsTab — Tier-2 picker/create wiring + unlink path.
 */

const { mount } = require('@vue/test-utils')
const CnContactsTab = require('../CnContactsTab.vue').default

describe('CnContactsTab', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [], total: 0 }),
		})
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders empty content stub when the object has no linked contacts', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		// The NcEmptyContent stub renders only its children/slots, so
		// assert on the stub being present + the model state instead of
		// the (slot-bound) prop text.
		expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(true)
		expect(wrapper.vm.contacts.length).toBe(0)
		wrapper.destroy()
	})

	it('renders the two header buttons (link existing + add new)', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const buttons = wrapper.findAll('.stub.NcButton')
		expect(buttons.length).toBeGreaterThanOrEqual(2)
		wrapper.destroy()
	})

	it('shows the picker dialog when the link button toggles showLinkDialog', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContactPicker' }).exists()).toBe(false)
		wrapper.vm.showLinkDialog = true
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContactPicker' }).exists()).toBe(true)
		wrapper.destroy()
	})

	it('shows the create dialog when showCreateDialog toggles', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.showCreateDialog = true
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContactCreate' }).exists()).toBe(true)
		wrapper.destroy()
	})

	it('POSTs to `/contacts` on picker link + refreshes', async () => {
		// First call: initial fetchContacts (empty list)
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
			// POST link
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
			// Refresh
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [{ id: 1, contactUid: 'jan', displayName: 'Jan', email: 'jan@example.nl' }], total: 1 }),
			})

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onPickerLink({ contactUid: 'jan', addressbookId: 1, contactUri: 'jan.vcf', role: 'applicant' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		// Find the POST call (verb 'POST' against /contacts).
		const postCall = global.fetch.mock.calls.find(([url, opts]) => opts?.method === 'POST' && url.endsWith('/contacts'))
		expect(postCall).toBeTruthy()
		expect(JSON.parse(postCall[1].body).contactUid).toBe('jan')
		expect(wrapper.vm.showLinkDialog).toBe(false)
		expect(wrapper.vm.contacts.length).toBe(1)
		wrapper.destroy()
	})

	it('POSTs to `/contacts/new` on create + refreshes', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ results: [{ id: 2, contactUid: 'lisa', displayName: 'Lisa' }], total: 1 }),
			})

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.onCreateSubmit({ displayName: 'Lisa', email: 'lisa@example.nl', phone: null, org: null, role: 'advisor' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		const postCall = global.fetch.mock.calls.find(([url, opts]) => opts?.method === 'POST' && url.endsWith('/contacts/new'))
		expect(postCall).toBeTruthy()
		expect(JSON.parse(postCall[1].body).displayName).toBe('Lisa')
		expect(wrapper.vm.showCreateDialog).toBe(false)
		expect(wrapper.vm.contacts.length).toBe(1)
		wrapper.destroy()
	})

	it('DELETEs `/contacts/{contactUid}` on row-unlink', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					results: [{ id: 1, contactUid: 'jan-uid', displayName: 'Jan', email: 'jan@example.nl' }],
					total: 1,
				}),
			})
			.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		await wrapper.vm.unlink(wrapper.vm.contacts[0])
		await wrapper.vm.$nextTick()

		const deleteCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'DELETE')
		expect(deleteCall).toBeTruthy()
		expect(deleteCall[0]).toContain('/contacts/jan-uid')
		expect(wrapper.vm.contacts.length).toBe(0)
		wrapper.destroy()
	})

	it('skips the fetch when register or schema is empty', async () => {
		global.fetch = jest.fn()
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: '', schema: '' },
		})
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(global.fetch).not.toHaveBeenCalled()
		wrapper.destroy()
	})
})
