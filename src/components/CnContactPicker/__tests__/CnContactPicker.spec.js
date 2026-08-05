/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactPicker — search + select + emit `link`.
 */

const { mount } = require('@vue/test-utils')
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
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.stub.NcEmptyContent').exists()).toBe(true)
		wrapper.destroy()
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
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const rows = wrapper.findAll('[data-testid="cn-contact-picker-row"]')
		expect(rows.length).toBe(2)
		expect(wrapper.text()).toContain('Jan de Vries')
		expect(wrapper.text()).toContain('Lisa')
		wrapper.destroy()
	})

	it('marks a row selected when clicked', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ contactUid: 'jan-uid', addressbookId: 1, contactUri: 'jan.vcf', displayName: 'Jan', email: 'jan@example.nl' }],
			}),
		})
		const wrapper = mount(CnContactPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		await wrapper.find('[data-testid="cn-contact-picker-row"]').trigger('click')
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.selected).not.toBeNull()
		expect(wrapper.vm.selected.contactUid).toBe('jan-uid')
		wrapper.destroy()
	})

	it('emits `link` with the selection payload on confirm', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({
				results: [{ contactUid: 'jan-uid', addressbookId: 1, contactUri: 'jan.vcf', displayName: 'Jan', email: 'jan@example.nl' }],
			}),
		})
		const wrapper = mount(CnContactPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		wrapper.vm.select(wrapper.vm.results[0])
		wrapper.vm.role = { value: 'applicant' }
		wrapper.vm.confirm()
		await wrapper.vm.$nextTick()
		expect(wrapper.emitted('link')).toBeTruthy()
		const payload = wrapper.emitted('link')[0][0]
		expect(payload.contactUid).toBe('jan-uid')
		expect(payload.role).toBe('applicant')
		wrapper.destroy()
	})

	it('does not emit `link` when nothing is selected', async () => {
		const wrapper = mount(CnContactPicker)
		await wrapper.vm.$nextTick()
		wrapper.vm.confirm()
		expect(wrapper.emitted('link')).toBeFalsy()
		wrapper.destroy()
	})

	it('debounces search input', async () => {
		const wrapper = mount(CnContactPicker)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		const initialCalls = global.fetch.mock.calls.length
		wrapper.vm.query = 'jan'
		wrapper.vm.onSearch()
		// The debounce timer is 250ms; without advancing it, fetch
		// shouldn't have been called yet beyond the mounted() call.
		expect(global.fetch.mock.calls.length).toBe(initialCalls)
		wrapper.destroy()
	})
})
