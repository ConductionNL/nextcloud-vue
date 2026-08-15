/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnContactsCard — vCard widget across the four surfaces
 * (`user-dashboard`, `app-dashboard`, `detail-page`, `single-entity`).
 *
 * Covers:
 *  - Loading / error / empty states
 *  - `single-entity` chip renders without fetching when `contact` is
 *    provided (canonical person chip path — AD-2)
 *  - Compact surfaces render count + recent + view-all
 *
 * @spec openspec/changes/integration-contacts/specs/integrations/contacts/spec.md
 */

import { mount } from '@vue/test-utils'

import CnContactsCard from '../../../src/integrations/builtin/contacts/CnContactsCard.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
	AccountMultiple: true,
	AlertCircleOutline: true,
}

describe('CnContactsCard — single-entity surface (canonical person chip)', () => {
	let originalFetch

	beforeEach(() => {
		originalFetch = global.fetch
		global.fetch = jest.fn()
	})

	afterEach(() => {
		global.fetch = originalFetch
	})

	it('renders the chip from a pre-resolved contact prop without fetching', async () => {
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'single-entity',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj',
				contact: {
					id: 1,
					contactUid: 'uid-jan',
					displayName: 'Jan de Vries',
					email: 'jan@example.nl',
					role: 'applicant',
				},
			},
		})
		await wrapper.vm.$nextTick()

		expect(global.fetch).not.toHaveBeenCalled()
		expect(wrapper.find('.cn-contacts-card--chip').exists()).toBe(true)
		expect(wrapper.find('.cn-contacts-card__chip-name').text()).toBe('Jan de Vries')
		expect(wrapper.find('.cn-contacts-card__chip-role').text()).toBe('applicant')
	})

	it('falls back to "Unknown contact" label when no contact resolves', async () => {
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'single-entity',
				register: '',
				schema: '',
				objectId: '',
			},
		})
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-contacts-card__chip-name').text()).toBe('Unknown contact')
	})
})

describe('CnContactsCard — compact surfaces (detail-page / dashboards)', () => {
	let originalFetch

	beforeEach(() => {
		originalFetch = global.fetch
		global.fetch = jest.fn()
	})

	afterEach(() => {
		global.fetch = originalFetch
	})

	it('shows loading then empty state when no contacts return', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [], total: 0 }),
		})
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'detail-page',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj-1',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-contacts-card__empty').exists()).toBe(true)
	})

	it('shows error state when fetch fails', async () => {
		global.fetch.mockResolvedValue({
			ok: false,
			status: 503,
			statusText: 'Unavailable',
			json: async () => ({}),
		})
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'detail-page',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj-1',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-contacts-card__error').exists()).toBe(true)
	})

	it('renders count + recent contacts and emits view-all when more than displayMax', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [
					{ id: 1, displayName: 'A', email: 'a@x.nl', role: 'applicant', linkedAt: '2026-05-01T10:00:00Z' },
					{ id: 2, displayName: 'B', email: 'b@x.nl', role: 'handler', linkedAt: '2026-05-10T10:00:00Z' },
					{ id: 3, displayName: 'C', email: 'c@x.nl', role: 'advisor', linkedAt: '2026-05-20T10:00:00Z' },
				],
				total: 3,
			}),
		})
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'detail-page',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj-1',
				displayMax: 2,
			},
		})
		await flush()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-contacts-card__header-count').text()).toBe('3')
		// Newest two shown
		const names = wrapper.findAll('.cn-contacts-card__item-name').map((w) => w.text())
		expect(names).toEqual(['C', 'B'])

		// View-all footer
		const viewAll = wrapper.find('.cn-contacts-card__view-all')
		expect(viewAll.exists()).toBe(true)
		await viewAll.trigger('click')
		expect(wrapper.emitted('view-all')).toBeTruthy()
	})

	it('hides the view-all footer when ≤ displayMax', async () => {
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [
					{ id: 1, displayName: 'A', email: 'a@x.nl', role: 'applicant', linkedAt: '2026-05-01T10:00:00Z' },
				],
				total: 1,
			}),
		})
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'detail-page',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj-1',
				displayMax: 2,
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-contacts-card__view-all').exists()).toBe(false)
	})

	it('does not throw when the response body is an unexpected non-array shape', async () => {
		// Phase A / D-1 bug: provider returns { foo: 'bar' } (no results,
		// no items, no bare array). Old code did `data.results || data || []`
		// which assigned the bare object to `this.contacts`, then
		// `[...this.contacts].sort(...)` threw 'is not iterable'.
		global.fetch.mockResolvedValue({
			ok: true,
			json: async () => ({ unexpected: { foo: 'bar' } }),
		})
		const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: {
				surface: 'detail-page',
				register: 'reg',
				schema: 'sch',
				objectId: 'obj-1',
			},
		})
		await flush()
		await wrapper.vm.$nextTick()
		// Empty state renders, no console error.
		expect(wrapper.find('.cn-contacts-card__empty').exists()).toBe(true)
		expect(errSpy).not.toHaveBeenCalled()
		errSpy.mockRestore()
	})

	it('builds initials from display name', () => {
		const wrapper = mount(CnContactsCard, {
			stubs,
			propsData: { surface: 'single-entity' },
		})
		expect(wrapper.vm.initialsFor({ displayName: 'Jan de Vries' })).toBe('JV')
		expect(wrapper.vm.initialsFor({ displayName: 'Mia' })).toBe('M')
		expect(wrapper.vm.initialsFor({ displayName: '' })).toBe('?')
	})
})
