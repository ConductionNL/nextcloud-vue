/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactsTab — Tier-2 picker/create wiring + unlink path.
 */

const { flushPromises, mount } = require('@vue/test-utils')
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
		await flushPromises()
		// The NcEmptyContent stub renders only its children/slots, so
		// assert on the stub being present + the model state instead of
		// the (slot-bound) prop text.
		expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(true)
		expect(wrapper.vm.contacts.length).toBe(0)
		wrapper.unmount()
	})

	it('renders the two header buttons (link existing + add new)', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()
		const buttons = wrapper.findAll('.stub.NcButton')
		expect(buttons.length).toBeGreaterThanOrEqual(2)
		wrapper.unmount()
	})

	it('shows the picker dialog when the link button toggles showLinkDialog', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()
		expect(wrapper.findComponent({ name: 'CnContactPicker' }).exists()).toBe(false)
		wrapper.vm.showLinkDialog = true
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContactPicker' }).exists()).toBe(true)
		wrapper.unmount()
	})

	it('shows the create dialog when showCreateDialog toggles', async () => {
		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()
		wrapper.vm.showCreateDialog = true
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'CnContactCreate' }).exists()).toBe(true)
		wrapper.unmount()
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
		await flushPromises()

		await wrapper.vm.onPickerLink({ contactUid: 'jan', addressbookId: 1, contactUri: 'jan.vcf', role: 'applicant' })
		await flushPromises()

		// Find the POST call (verb 'POST' against /contacts).
		const postCall = global.fetch.mock.calls.find(([url, opts]) => opts?.method === 'POST' && url.endsWith('/contacts'))
		expect(postCall).toBeTruthy()
		expect(JSON.parse(postCall[1].body).contactUid).toBe('jan')
		expect(wrapper.vm.showLinkDialog).toBe(false)
		expect(wrapper.vm.contacts.length).toBe(1)
		wrapper.unmount()
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
		await flushPromises()

		await wrapper.vm.onCreateSubmit({ displayName: 'Lisa', email: 'lisa@example.nl', phone: null, org: null, role: 'advisor' })
		await flushPromises()

		const postCall = global.fetch.mock.calls.find(([url, opts]) => opts?.method === 'POST' && url.endsWith('/contacts/new'))
		expect(postCall).toBeTruthy()
		expect(JSON.parse(postCall[1].body).displayName).toBe('Lisa')
		expect(wrapper.vm.showCreateDialog).toBe(false)
		expect(wrapper.vm.contacts.length).toBe(1)
		wrapper.unmount()
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
		await flushPromises()

		await wrapper.vm.unlink(wrapper.vm.contacts[0])
		await wrapper.vm.$nextTick()

		const deleteCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'DELETE')
		expect(deleteCall).toBeTruthy()
		expect(deleteCall[0]).toContain('/contacts/jan-uid')
		expect(wrapper.vm.contacts.length).toBe(0)
		wrapper.unmount()
	})

	it('skips the fetch when register or schema is empty', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
		const skipped = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: '', schema: '' },
		})
		await flushPromises()

		// The assertion here is a negative, which holds before the component
		// has done anything at all. Anchor it: a second tab mounted with both
		// ids DOES fetch, so once its call is on record a fetch was reachable
		// by this point and the skipped tab's zero calls mean it refused.
		const fetching = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		expect(global.fetch.mock.calls[0][0]).toContain('r1')

		skipped.unmount()
		fetching.unmount()
	})

	it('takes the server\'s grouping and role vocabulary when the listing carries them', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ id: 1, contactUid: 'user:jan', kind: 'user', displayName: 'Jan de Vries', role: 'handler', active: true },
					{ id: 2, contactUid: 'piet-uid', kind: 'contact', displayName: 'Piet', role: 'initiator', active: false, validUntil: '2026-01-31' },
				],
				total: 2,
				byRole: {
					handler: [{ id: 1, contactUid: 'user:jan', kind: 'user', displayName: 'Jan de Vries', role: 'handler', active: true }],
					initiator: [{ id: 2, contactUid: 'piet-uid', kind: 'contact', displayName: 'Piet', role: 'initiator', active: false, validUntil: '2026-01-31' }],
				},
				roles: [
					{ key: 'initiator', label: 'Indiener' },
					{ key: 'handler', label: 'Behandelaar' },
				],
			}),
		})

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()

		// The server grouped, so the tab does not re-bucket: its own buckets
		// would have called both of these "Other".
		expect(wrapper.vm.groupedContacts.map((group) => group.label)).toEqual(['Behandelaar', 'Indiener'])
		// And the picker is offered the schema's vocabulary, not the defaults.
		expect(wrapper.vm.pickerRoleOptions.roleOptions).toEqual([
			{ label: 'Indiener', value: 'initiator' },
			{ label: 'Behandelaar', value: 'handler' },
		])
		expect(wrapper.find('[data-testid="cn-contacts-tab-inactive"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-contacts-tab-period"]').text()).toContain('2026-01-31')
		wrapper.unmount()
	})

	it('falls back to its own buckets when the server sends a bare list', async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				results: [{ id: 1, contactUid: 'jan-uid', displayName: 'Jan', role: 'applicant' }],
				total: 1,
			}),
		})

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()

		expect(wrapper.vm.groupedContacts.map((group) => group.key)).toEqual(['applicant'])
		expect(wrapper.vm.pickerRoleOptions).toEqual({})
		wrapper.unmount()
	})

	it('removes the row\'s role, not the person, when a person holds several', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url, options) => {
			calls.push({ url: String(url), method: options?.method ?? 'GET' })
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [], total: 0 }) })
		})

		const wrapper = mount(CnContactsTab, {
			propsData: { objectId: 'o1', register: 'r1', schema: 's1' },
		})
		await flushPromises()
		await wrapper.vm.unlink({ id: 7, contactUid: 'user:jan', role: 'advisor' })

		const deletes = calls.filter((call) => call.method === 'DELETE')
		expect(deletes).toHaveLength(1)
		expect(deletes[0].url).toContain('/contacts/user%3Ajan?role=advisor')
		wrapper.unmount()
	})
})
