/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnLifecycleActions — declarative status-gated transition buttons.
 *
 * Scope:
 *   - Server-derived: fetches /available-actions and renders one button per
 *     allowed action.
 *   - Config-declared: filters the explicit `transitions` array by the object's
 *     current `status` value (no fetch).
 *   - Clicking a button POSTs to /transition with { action }, emits
 *     `transitioned` + `reload`, and re-fetches the action list.
 *   - A rejected transition (403/422) surfaces the server's `error` message.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		if (params) {
			for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, v)
		}
		return `/nc${out}`
	}),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnLifecycleActions from '../../src/components/CnLifecycleActions/CnLifecycleActions.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: { name: 'NcButton', template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'variant'] },
	NcLoadingIcon: { name: 'NcLoadingIcon', template: '<span class="loading" />' },
}

describe('CnLifecycleActions', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.post.mockReset()
	})

	describe('server-derived transitions', () => {
		it('fetches /available-actions and renders one button per allowed action', async () => {
			axios.get.mockResolvedValue({ data: { actions: [
				{ action: 'close', to: 'closed', requires: null, description: null },
				{ action: 'void', to: 'voided', requires: null, description: 'Void shift' },
			] } })
			const wrapper = mount(CnLifecycleActions, {
				propsData: { objectId: 'shift-1', config: { field: 'status' } },
				stubs,
			})
			await flush()
			await wrapper.vm.$nextTick()

			expect(axios.get).toHaveBeenCalledWith('/nc/apps/openregister/api/objects/shift-1/available-actions')
			const buttons = wrapper.findAll('[data-testid^="cn-lifecycle-action-"]')
			expect(buttons.length).toBe(2)
			expect(wrapper.find('[data-testid="cn-lifecycle-action-close"]').text()).toBe('Close')
			// Label stays the derived action name; the description rides on the
			// tooltip (title), not the button label (round-1 label-not-description).
			const voidBtn = wrapper.find('[data-testid="cn-lifecycle-action-void"]')
			expect(voidBtn.text()).toBe('Void')
			expect(voidBtn.attributes('title')).toBe('Void shift')
		})

		it('renders nothing when the object has no available actions', async () => {
			axios.get.mockResolvedValue({ data: { actions: [] } })
			const wrapper = mount(CnLifecycleActions, {
				propsData: { objectId: 'x', config: { field: 'status' } },
				stubs,
			})
			await flush()
			await wrapper.vm.$nextTick()
			expect(wrapper.find('[data-testid="cn-lifecycle-actions"]').exists()).toBe(false)
		})
	})

	describe('config-declared transitions', () => {
		it('filters declared transitions by the object current status (no fetch)', async () => {
			const wrapper = mount(CnLifecycleActions, {
				propsData: {
					objectId: 's1',
					object: { status: 'open' },
					config: {
						field: 'status',
						transitions: [
							{ from: 'open', to: 'closed', action: 'close', label: 'Close shift' },
							{ from: 'closed', to: 'archived', action: 'archive', label: 'Archive' },
						],
					},
				},
				stubs,
			})
			await wrapper.vm.$nextTick()
			expect(axios.get).not.toHaveBeenCalled()
			const buttons = wrapper.findAll('[data-testid^="cn-lifecycle-action-"]')
			expect(buttons.length).toBe(1)
			expect(wrapper.find('[data-testid="cn-lifecycle-action-close"]').text()).toBe('Close shift')
		})

		it('renders the button at the default size (no size="small") while keeping label + tooltip', async () => {
			const wrapper = mount(CnLifecycleActions, {
				propsData: {
					objectId: 's1',
					object: { status: 'open' },
					config: {
						field: 'status',
						transitions: [
							{ from: 'open', to: 'closed', action: 'close', label: 'Close shift', description: 'Close this shift' },
						],
					},
				},
				stubs,
			})
			await wrapper.vm.$nextTick()
			const btn = wrapper.find('[data-testid="cn-lifecycle-action-close"]')
			// Default NcButton size — the `size` prop must not be forwarded.
			expect(btn.attributes('size')).toBeUndefined()
			// Label stays visible; the description rides on the tooltip (title).
			expect(btn.text()).toBe('Close shift')
			expect(btn.attributes('title')).toBe('Close this shift')
		})

		it('treats a missing `from` as "any state"', async () => {
			const wrapper = mount(CnLifecycleActions, {
				propsData: {
					objectId: 's1',
					object: { status: 'whatever' },
					config: { field: 'status', transitions: [{ to: 'done', action: 'finish', label: 'Finish' }] },
				},
				stubs,
			})
			await wrapper.vm.$nextTick()
			expect(wrapper.findAll('[data-testid^="cn-lifecycle-action-"]').length).toBe(1)
		})
	})

	describe('applying a transition', () => {
		it('POSTs the action, emits transitioned + reload, and re-fetches actions', async () => {
			axios.get.mockResolvedValue({ data: { actions: [{ action: 'close', to: 'closed' }] } })
			axios.post.mockResolvedValue({ data: { id: 'shift-1', status: 'closed' } })
			const wrapper = mount(CnLifecycleActions, {
				propsData: { objectId: 'shift-1', config: { field: 'status' } },
				stubs,
			})
			await flush()
			await wrapper.vm.$nextTick()

			await wrapper.find('[data-testid="cn-lifecycle-action-close"]').trigger('click')
			await flush()
			await wrapper.vm.$nextTick()

			expect(axios.post).toHaveBeenCalledWith(
				'/nc/apps/openregister/api/objects/shift-1/transition',
				{ action: 'close' },
			)
			expect(wrapper.emitted('transitioned')[0][0]).toMatchObject({ action: 'close', to: 'closed' })
			expect(wrapper.emitted('reload')).toBeTruthy()
			// initial fetch + post-transition re-fetch
			expect(axios.get).toHaveBeenCalledTimes(2)
		})

		it('surfaces the server error message when a transition is rejected', async () => {
			axios.get.mockResolvedValue({ data: { actions: [{ action: 'close', to: 'closed' }] } })
			axios.post.mockRejectedValue({ response: { status: 422, data: { error: 'Cannot close: open balance.' } } })
			const wrapper = mount(CnLifecycleActions, {
				propsData: { objectId: 'shift-1', config: { field: 'status' } },
				stubs,
			})
			await flush()
			await wrapper.vm.$nextTick()

			await wrapper.find('[data-testid="cn-lifecycle-action-close"]').trigger('click')
			await flush()
			await wrapper.vm.$nextTick()

			expect(wrapper.find('[data-testid="cn-lifecycle-actions-error"]').text()).toBe('Cannot close: open balance.')
			expect(wrapper.emitted('reload')).toBeFalsy()
		})
	})
})
