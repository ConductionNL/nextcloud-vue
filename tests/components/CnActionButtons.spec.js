/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnActionButtons — the declarative header-actions surface
 * (#91 Wave 3): visibleWhen gating, api-call dispatch + confirm gate,
 * the two-way toggle (state seed + optimistic write + revert on failure),
 * and open-form schema-dialog save. dispatchAction is stubbed so we
 * assert the surface's routing, not the dispatcher internals (covered by
 * actionsDispatcherW3.spec.js).
 */

import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'
import { evaluateVisibleWhen } from '../../src/utils/visibleWhen.js'
import { useObjectStore } from '../../src/store/useObjectStore.js'

jest.mock('../../src/utils/actionsDispatcher.js', () => {
	// Keep the real route-builder helper (buildOnSuccessRoute) so the
	// open-form success navigation is exercised end-to-end; only the
	// dispatch + type-resolution are stubbed to isolate the surface.
	const actual = jest.requireActual('../../src/utils/actionsDispatcher.js')
	return {
		__esModule: true,
		dispatchAction: jest.fn(() => Promise.resolve({ ok: true })),
		resolveObjectOpType: jest.fn(() => 'crm/lead'),
		buildOnSuccessRoute: actual.buildOnSuccessRoute,
		savedObjectId: actual.savedObjectId,
		resolveCreateOverrideHandler: actual.resolveCreateOverrideHandler,
	}
})
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(() => Promise.resolve(null)),
}))
jest.mock('../../src/utils/visibleWhen.js', () => ({
	__esModule: true,
	evaluateVisibleWhen: jest.fn(() => Promise.resolve(true)),
}))
jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: {
		name: 'NcButton',
		props: ['disabled'],
		// `emits: ['click']` is load-bearing. Vue 2 kept listeners in a separate
		// channel, so `v-bind="$attrs"` could never re-attach the parent's
		// `@click`. In Vue 3 an UNDECLARED event name stays in `$attrs` as the
		// `onClick` prop, so spreading `$attrs` onto the native `<button>` wires
		// the parent's handler a SECOND time — one call from the DOM click, one
		// from `$emit('click')`. Declaring it removes `onClick` from `$attrs`.
		emits: ['click'],
		template: '<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	CnIcon: { name: 'CnIcon', template: '<span class="cn-icon" />' },
	CnConfirmDialog: {
		name: 'CnConfirmDialog',
		template: '<div class="confirm-dialog-stub" />',
		methods: { setResult() {} },
	},
	CnAdvancedFormDialog: {
		name: 'CnAdvancedFormDialog',
		props: ['schema', 'item', 'initialValues'],
		template: '<div class="form-dialog-stub" />',
		methods: { setResult() {} },
	},
}

function mountBar(actions, { provide } = {}) {
	return mount(CnActionButtons, {
		propsData: { actions },
		stubs,
		provide: provide || {},
		mocks: { $router: { push: jest.fn(() => Promise.resolve()) } },
	})
}

describe('CnActionButtons (#91 Wave 3)', () => {
	beforeEach(() => {
		dispatchAction.mockClear()
		dispatchAction.mockResolvedValue({ ok: true })
		fetchEndpointSource.mockReset()
		fetchEndpointSource.mockResolvedValue(null)
		evaluateVisibleWhen.mockReset()
		evaluateVisibleWhen.mockResolvedValue(true)
		useObjectStore.mockReset()
	})

	it('renders a button per action and dispatches an api-call on click (no confirm)', async () => {
		const wrapper = mountBar([
			{ id: 'send', label: 'Send', type: 'api-call', url: '/apps/x/api/send' },
		])
		await flush()
		const btn = wrapper.find('[data-testid="cn-action-send"]')
		expect(btn.exists()).toBe(true)
		await btn.trigger('click')
		await flush()
		expect(dispatchAction).toHaveBeenCalledTimes(1)
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({ type: 'api-call', url: '/apps/x/api/send' })
	})

	it('hides an action whose visibleWhen evaluates false', async () => {
		evaluateVisibleWhen.mockImplementation((cond) => Promise.resolve(cond.value === 'pending'))
		const wrapper = mountBar([
			{ id: 'approve', label: 'Approve', type: 'api-call', url: '/a', visibleWhen: { field: 's', op: 'eq', value: 'draft' } },
			{ id: 'send', label: 'Send', type: 'api-call', url: '/b', visibleWhen: { field: 's', op: 'eq', value: 'pending' } },
		])
		await flush()
		expect(wrapper.find('[data-testid="cn-action-approve"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-action-send"]').exists()).toBe(true)
	})

	it('gates a confirm:true action through CnConfirmDialog before dispatch', async () => {
		const wrapper = mountBar([
			{ id: 'archive', label: 'Archive', type: 'api-call', url: '/arch', confirm: true },
		])
		await flush()
		await wrapper.find('[data-testid="cn-action-archive"]').trigger('click')
		// No dispatch yet — the confirm dialog is showing.
		expect(dispatchAction).not.toHaveBeenCalled()
		expect(wrapper.findComponent({ name: 'CnConfirmDialog' }).exists()).toBe(true)
		// Proceeding runs the action.
		wrapper.findComponent({ name: 'CnConfirmDialog' }).vm.$emit('confirm')
		await flush()
		expect(dispatchAction).toHaveBeenCalledTimes(1)
	})

	describe('toggle', () => {
		it('seeds state from stateSource and writes the flipped value optimistically on click', async () => {
			fetchEndpointSource.mockResolvedValue({ open: true })
			const wrapper = mountBar([
				{
					id: 'werkplek',
					type: 'toggle',
					labelOn: 'Open',
					labelOff: 'Closed',
					stateSource: { url: '/apps/pipelinq/api/werkplek/state', responsePath: '' },
					field: 'open',
					writeUrl: '/apps/pipelinq/api/werkplek/state',
					method: 'PUT',
				},
			])
			await flush()
			expect(wrapper.vm.toggleState.werkplek).toBe(true)
			const btn = wrapper.find('[data-testid="cn-action-toggle-werkplek"]')
			expect(btn.text()).toContain('Open')

			await btn.trigger('click')
			// Optimistic flip happened immediately.
			expect(wrapper.vm.toggleState.werkplek).toBe(false)
			await flush()
			expect(dispatchAction).toHaveBeenCalledTimes(1)
			expect(dispatchAction.mock.calls[0][0]).toMatchObject({
				type: 'api-call', url: '/apps/pipelinq/api/werkplek/state', method: 'PUT', params: { open: false },
			})
		})

		it('reverts the optimistic flip when the write fails', async () => {
			fetchEndpointSource.mockResolvedValue({ open: false })
			dispatchAction.mockResolvedValue({ ok: false })
			const wrapper = mountBar([
				{
					id: 'wp',
					type: 'toggle',
					labelOn: 'Open',
					labelOff: 'Closed',
					stateSource: { url: '/state' },
					field: 'open',
					writeUrl: '/state',
				},
			])
			await flush()
			expect(wrapper.vm.toggleState.wp).toBe(false)
			// Call the handler directly so we can observe the SYNCHRONOUS
			// optimistic flip before the awaited write resolves + reverts.
			const promise = wrapper.vm.onToggleClick(wrapper.vm.actions[0])
			expect(wrapper.vm.toggleState.wp).toBe(true) // optimistic
			await promise
			await flush()
			expect(wrapper.vm.toggleState.wp).toBe(false) // reverted
		})
	})

	describe('open-form', () => {
		it('fetches the schema, mounts the dialog, and saves on confirm', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'new-1' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			expect(fetchSchema).toHaveBeenCalled()
			const dialog = wrapper.findComponent({ name: 'CnAdvancedFormDialog' })
			expect(dialog.exists()).toBe(true)

			dialog.vm.$emit('confirm', { name: 'Acme' })
			await flush()
			expect(saveObject).toHaveBeenCalledWith('crm/lead', { name: 'Acme' })
			expect(wrapper.emitted('created')).toBeTruthy()
		})

		it('seeds the create form with the action props without flipping it to edit mode', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'tk-1' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Ticket', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })

			const wrapper = mountBar([
				{
					id: 'new-request',
					label: 'New request',
					type: 'open-form',
					register: 'pipelinq',
					schema: 'ticket',
					props: { ticketType: 'request' },
				},
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-request"]').trigger('click')
			await flush()

			const dialog = wrapper.findComponent({ name: 'CnAdvancedFormDialog' })
			expect(dialog.props('initialValues')).toEqual({ ticketType: 'request' })
			// `item` stays null so the dialog remains in CREATE mode.
			expect(dialog.props('item')).toBeNull()
		})

		it('persists through a registry createOverride instead of saveObject when named', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'never' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Client', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })
			const handler = jest.fn(() => Promise.resolve({ id: 'cl-9' }))

			const wrapper = mount(CnActionButtons, {
				propsData: {
					actions: [
						{
							id: 'new-client',
							label: 'New client',
							type: 'open-form',
							register: 'pipelinq',
							schema: 'client',
							createOverride: 'createClientContactAware',
						},
					],
				},
				stubs,
				provide: {
					cnRegistry: { createClientContactAware: { kind: 'create-override', handler } },
				},
			})
			await flush()
			await wrapper.find('[data-testid="cn-action-new-client"]').trigger('click')
			await flush()
			wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
			await flush()

			expect(handler).toHaveBeenCalledWith({ name: 'Acme' }, expect.objectContaining({ schema: 'client' }))
			expect(saveObject).not.toHaveBeenCalled()
			expect(wrapper.emitted('created')).toBeTruthy()
		})

		it('falls back to saveObject when the named createOverride resolves to nothing', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'cl-1' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Client', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })

			const wrapper = mountBar([
				{
					id: 'new-client',
					label: 'New client',
					type: 'open-form',
					register: 'pipelinq',
					schema: 'client',
					createOverride: 'notRegistered',
				},
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-client"]').trigger('click')
			await flush()
			wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
			await flush()

			expect(saveObject).toHaveBeenCalledWith('crm/lead', { name: 'Acme' })
		})

		it('navigates to onSuccessRoute with the saved object id merged into the params (#91)', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'lead-42' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })

			const push = jest.fn(() => Promise.resolve())
			const wrapper = mount(CnActionButtons, {
				propsData: {
					actions: [
						{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: { name: 'LeadDetail', paramField: 'leadId' } },
					],
				},
				stubs,
				mocks: { $router: { push } },
			})
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()
			wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
			await flush()

			expect(push).toHaveBeenCalledWith({ name: 'LeadDetail', params: { leadId: 'lead-42' } })
		})

		it('string onSuccessRoute still deep-links via the default id param (backward compatible)', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'lead-7' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })

			const push = jest.fn(() => Promise.resolve())
			const wrapper = mount(CnActionButtons, {
				propsData: {
					actions: [
						{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', onSuccessRoute: 'Leads' },
					],
				},
				stubs,
				mocks: { $router: { push } },
			})
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()
			wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
			await flush()

			expect(push).toHaveBeenCalledWith({ name: 'Leads', params: { id: 'lead-7' } })
		})
	})
})
