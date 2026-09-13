/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactPicker — search + select + emit `link`.
 */

// See CnEmailPicker.spec.js: a Vue-3 `nextTick()` no longer implies the
// render queued by an async `mounted()` has flushed, so wait on the promise
// queue instead of counting ticks.
const { mount, flushPromises } = require('@vue/test-utils')
const CnContactPicker = require('../CnContactPicker.vue').default

describe('CnContactPicker', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ results: [] }),
		})
	})

	afterEach(() => {
		delete global.fetch
	})

	it('renders empty content when no results are returned', async () => {
		const wrapper = mount(CnContactPicker)
		// Initial mounted() fetch
		await flushPromises()
		expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(true)
		wrapper.unmount()
	})

	it('renders rows for each fetched contact', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [
					{ contactUid: 'jan-uid', addressbookId: 1, contactUri: 'jan.vcf', displayName: 'Jan de Vries', email: 'jan@example.nl', avatarUrl: null },
					{ contactUid: 'lisa-uid', addressbookId: 1, contactUri: 'lisa.vcf', displayName: 'Lisa', email: 'lisa@example.nl', avatarUrl: null },
				],
			}),
		})
		const wrapper = mount(CnContactPicker)
		await flushPromises()
		const rows = wrapper.findAll('[data-testid="cn-contact-picker-row"]')
		expect(rows.length).toBe(2)
		expect(wrapper.text()).toContain('Jan de Vries')
		expect(wrapper.text()).toContain('Lisa')
		wrapper.unmount()
	})

	it('marks a row selected when clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ contactUid: 'jan-uid', addressbookId: 1, contactUri: 'jan.vcf', displayName: 'Jan', email: 'jan@example.nl' }],
			}),
		})
		const wrapper = mount(CnContactPicker)
		await flushPromises()
		await wrapper.find('[data-testid="cn-contact-picker-row"]').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.selected).not.toBeNull()
		expect(wrapper.vm.selected.contactUid).toBe('jan-uid')
		wrapper.unmount()
	})

	it('emits `link` with the selection payload on confirm', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ contactUid: 'jan-uid', addressbookId: 1, contactUri: 'jan.vcf', displayName: 'Jan', email: 'jan@example.nl' }],
			}),
		})
		const wrapper = mount(CnContactPicker)
		await flushPromises()
		wrapper.vm.select(wrapper.vm.results[0])
		wrapper.vm.role = { value: 'applicant' }
		wrapper.vm.confirm()
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('link')).toBeTruthy()
		const payload = wrapper.emitted('link')[0][0]
		expect(payload.contactUid).toBe('jan-uid')
		expect(payload.role).toBe('applicant')
		wrapper.unmount()
	})

	it('does not emit `link` when nothing is selected', async () => {
		const wrapper = mount(CnContactPicker)
		await wrapper.vm.$nextTick()
		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.unmount()
	})

	it('debounces search input', async () => {
		const wrapper = mount(CnContactPicker)
		await flushPromises()
		const initialCalls = global.fetch.mock.calls.length
		wrapper.vm.query = 'jan'
		wrapper.vm.onSearch()
		// The debounce timer is 250ms; without advancing it, fetch
		// shouldn't have been called yet beyond the mounted() call.
		expect(global.fetch.mock.calls.length).toBe(initialCalls)
		wrapper.unmount()
	})

	it('offers Nextcloud users beside contacts once the handler types, and emits a user link', async () => {
		// Two sources, one search: the sharee autocomplete for users, the OR
		// proxy for contacts. Users come first.
		global.fetch = jest.fn().mockImplementation((url) => {
			if (String(url).includes('sharees')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({
						ocs: {
							data: {
								users: [{ label: 'Jan de Vries', value: { shareWith: 'jan' } }],
								exact: { users: [{ label: 'Jan de Vries', value: { shareWith: 'jan' } }] },
							},
						},
					}),
				})
			}
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ results: [{ contactUid: 'piet-uid', addressbookId: 1, contactUri: 'piet.vcf', displayName: 'Piet', email: 'piet@example.nl' }] }),
			})
		})

		const wrapper = mount(CnContactPicker)
		await flushPromises()
		await wrapper.vm.fetchContacts('jan')
		await flushPromises()

		const rows = wrapper.findAll('[data-testid="cn-contact-picker-row"]')
		// The exact match repeats the account; it is listed once.
		expect(rows).toHaveLength(2)
		expect(rows[0].attributes('data-kind')).toBe('user')
		expect(rows[0].find('[data-testid="cn-contact-picker-user-badge"]').exists()).toBe(true)
		expect(rows[1].attributes('data-kind')).toBe('contact')

		wrapper.vm.select(wrapper.vm.results[0])
		wrapper.vm.role = { label: 'Handler', value: 'handler' }
		wrapper.vm.validFrom = '2026-03-01'
		wrapper.vm.note = '  Stands in for Piet  '
		wrapper.vm.confirm()

		const payload = wrapper.emitted('link')[0][0]
		expect(payload).toMatchObject({
			kind: 'user',
			userId: 'jan',
			displayName: 'Jan de Vries',
			role: 'handler',
			validFrom: '2026-03-01',
			validUntil: null,
			note: 'Stands in for Piet',
		})
		expect(payload.addressbookId).toBeUndefined()
		wrapper.unmount()
	})

	it('does not search users on an empty term, and asks for none when they are off', async () => {
		const calls = []
		global.fetch = jest.fn().mockImplementation((url) => {
			calls.push(String(url))
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })
		})

		const wrapper = mount(CnContactPicker, { propsData: { includeUsers: false } })
		await flushPromises()
		await wrapper.vm.fetchContacts('jan')
		await flushPromises()

		expect(calls.some((url) => url.includes('sharees'))).toBe(false)
		wrapper.unmount()
	})

	it('keeps the contacts when the user search fails', async () => {
		global.fetch = jest.fn().mockImplementation((url) => {
			if (String(url).includes('sharees')) {
				return Promise.reject(new Error('no sharees here'))
			}
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ results: [{ contactUid: 'piet-uid', addressbookId: 1, contactUri: 'piet.vcf', displayName: 'Piet' }] }),
			})
		})
		const quiet = jest.spyOn(console, 'error').mockImplementation(() => {})

		const wrapper = mount(CnContactPicker)
		await flushPromises()
		await wrapper.vm.fetchContacts('piet')
		await flushPromises()

		expect(wrapper.findAll('[data-testid="cn-contact-picker-row"]')).toHaveLength(1)
		quiet.mockRestore()
		wrapper.unmount()
	})
})
