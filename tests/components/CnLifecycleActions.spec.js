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
 *   - Transition inputs: an action declaring `inputs` (server-derived OR
 *     config-declared) opens CnTransitionInputDialog first; confirm POSTs
 *     { action, data }, cancel POSTs nothing, and a transition WITHOUT inputs
 *     still POSTs { action } immediately with no dialog.
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
	// `emits: ['click']` is load-bearing under Vue 3: an undeclared event name
	// stays in `$attrs` as an `onClick` prop and falls through onto this stub's
	// single root `<button>`, so the parent's `@click` fires once natively and
	// once via `$emit('click')`. Vue 2's separate listener channel made that
	// impossible. Declaring it removes `onClick` from `$attrs`.
	NcButton: { name: 'NcButton', template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['disabled', 'variant'], emits: ['click'] },
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
			// description wins over derived label
			expect(wrapper.find('[data-testid="cn-lifecycle-action-void"]').text()).toBe('Void shift')
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

			// The payload is exactly { action } — no `data` key for a
			// transition without declared inputs, and no input dialog either.
			expect(axios.post).toHaveBeenCalledWith(
				'/nc/apps/openregister/api/objects/shift-1/transition',
				{ action: 'close' },
			)
			expect(wrapper.findComponent({ name: 'CnTransitionInputDialog' }).exists()).toBe(false)
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

	describe('transition inputs', () => {
		const REJECT_INPUTS = [
			{ field: 'reason', required: true },
			{ field: 'notify', required: false },
		]
		const SCHEMA = {
			properties: {
				reason: { type: 'string', title: 'Reason' },
				notify: { type: 'boolean', title: 'Notify' },
			},
		}

		/** Mount with one server-derived action declaring inputs, click it open. */
		async function openServerDialog() {
			axios.get.mockResolvedValue({ data: { actions: [
				{ action: 'reject', to: 'rejected', description: 'Reject', inputs: REJECT_INPUTS },
			] } })
			const wrapper = mount(CnLifecycleActions, {
				propsData: { objectId: 'req-1', config: { field: 'status' }, schema: SCHEMA },
				stubs,
			})
			await flush()
			await wrapper.vm.$nextTick()
			await wrapper.find('[data-testid="cn-lifecycle-action-reject"]').trigger('click')
			await wrapper.vm.$nextTick()
			return wrapper
		}

		it('a server-derived action with inputs opens the dialog instead of POSTing', async () => {
			const wrapper = await openServerDialog()
			const dialog = wrapper.findComponent({ name: 'CnTransitionInputDialog' })
			expect(dialog.exists()).toBe(true)
			// Inputs + schema are forwarded so the fields render resolved.
			expect(dialog.props('transition')).toMatchObject({ action: 'reject', inputs: REJECT_INPUTS })
			expect(dialog.props('schema')).toEqual(SCHEMA)
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('a config-declared transition with inputs opens the dialog instead of POSTing', async () => {
			const wrapper = mount(CnLifecycleActions, {
				propsData: {
					objectId: 'req-1',
					object: { status: 'open' },
					config: {
						field: 'status',
						transitions: [
							{ from: 'open', to: 'rejected', action: 'reject', label: 'Reject request', inputs: REJECT_INPUTS },
						],
					},
					schema: SCHEMA,
				},
				stubs,
			})
			await wrapper.vm.$nextTick()
			await wrapper.find('[data-testid="cn-lifecycle-action-reject"]').trigger('click')
			await wrapper.vm.$nextTick()

			const dialog = wrapper.findComponent({ name: 'CnTransitionInputDialog' })
			expect(dialog.exists()).toBe(true)
			expect(dialog.props('transition')).toMatchObject({ action: 'reject', label: 'Reject request', inputs: REJECT_INPUTS })
			expect(axios.post).not.toHaveBeenCalled()
		})

		it('required inputs keep the dialog confirm disabled until filled', async () => {
			const wrapper = await openServerDialog()
			// The local NcButton stub renders a NATIVE <button>, so a true
			// `:disabled` is the empty-string attribute — assert on presence.
			const confirm = () => wrapper.find('[data-testid="cn-transition-input-confirm"]')
			expect(confirm().attributes('disabled')).toBeDefined()

			wrapper.find('[data-testid="cn-transition-input-reason"]')
				.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', 'No budget')
			await wrapper.vm.$nextTick()
			expect(confirm().attributes('disabled')).toBeUndefined()
		})

		it('confirming the dialog POSTs { action, data } with exactly the declared keys', async () => {
			axios.post.mockResolvedValue({ data: { id: 'req-1', status: 'rejected' } })
			const wrapper = await openServerDialog()

			wrapper.find('[data-testid="cn-transition-input-reason"]')
				.findComponent({ name: 'NcTextField' }).vm.$emit('update:model-value', 'No budget')
			await wrapper.vm.$nextTick()
			await wrapper.find('[data-testid="cn-transition-input-confirm"]').trigger('click')
			await flush()
			await wrapper.vm.$nextTick()

			expect(axios.post).toHaveBeenCalledTimes(1)
			expect(axios.post).toHaveBeenCalledWith(
				'/nc/apps/openregister/api/objects/req-1/transition',
				{ action: 'reject', data: { reason: 'No budget', notify: false } },
			)
			// The dialog closes and the normal post-transition flow runs.
			expect(wrapper.findComponent({ name: 'CnTransitionInputDialog' }).exists()).toBe(false)
			expect(wrapper.emitted('transitioned')[0][0]).toMatchObject({ action: 'reject', to: 'rejected' })
			expect(wrapper.emitted('reload')).toBeTruthy()
		})

		it('cancelling the dialog POSTs nothing', async () => {
			const wrapper = await openServerDialog()
			await wrapper.find('[data-testid="cn-transition-input-cancel"]').trigger('click')
			await flush()
			await wrapper.vm.$nextTick()

			expect(axios.post).not.toHaveBeenCalled()
			expect(wrapper.findComponent({ name: 'CnTransitionInputDialog' }).exists()).toBe(false)
			expect(wrapper.emitted('transitioned')).toBeFalsy()
			expect(wrapper.emitted('reload')).toBeFalsy()
		})
	})
})
