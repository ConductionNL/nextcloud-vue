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

import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { dispatchAction, resolveObjectOpType } from '../../src/utils/actionsDispatcher.js'
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
		isExternalActionTarget: actual.isExternalActionTarget,
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
		// `variant` declared so the styling assertions can read it. NcButton
		// carries BOTH `type` (native) and `variant` (styling), and binding a
		// descriptor's variant to `type` renders every button secondary.
		// `href` / `target` declared because the real NcButton renders an ANCHOR
		// when given an href (and a button otherwise) — a stub that is always a
		// button would let a link action pass while shipping the wrong element.
		props: ['disabled', 'variant', 'href', 'target'],
		// `emits: ['click']` is load-bearing. Vue 2 kept listeners in a separate
		// channel, so `v-bind="$attrs"` could never re-attach the parent's
		// `@click`. In Vue 3 an UNDECLARED event name stays in `$attrs` as the
		// `onClick` prop, so spreading `$attrs` onto the native `<button>` wires
		// the parent's handler a SECOND time — one call from the DOM click, one
		// from `$emit('click')`. Declaring it removes `onClick` from `$attrs`.
		emits: ['click'],
		template: '<component :is="href ? \'a\' : \'button\'" :disabled="disabled" :href="href" :target="target" v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></component>',
	},
	CnIcon: { name: 'CnIcon', template: '<span class="cn-icon" />' },
	CnConfirmDialog: {
		name: 'CnConfirmDialog',
		template: '<div class="confirm-dialog-stub" />',
		methods: { setResult() {} },
	},
	CnFormDialog: {
		name: 'CnFormDialog',
		props: ['schema', 'item', 'initialData', 'register', 'dialogTitle', 'includeFields', 'excludeFields', 'fieldOverrides'],
		template: '<div class="form-dialog-stub" />',
		methods: { setResult() {} },
	},
	CnAdvancedFormDialog: {
		name: 'CnAdvancedFormDialog',
		props: ['schema', 'item', 'initialValues'],
		template: '<div class="advanced-form-dialog-stub" />',
		methods: { setResult() {} },
	},
}

// `emits: ['click']` for the same reason as the NcButton stub above.
stubs.NcActions = {
	name: 'NcActions',
	props: ['menuName', 'forceMenu'],
	template: '<div class="nc-actions-stub" v-bind="$attrs"><span class="menu-name">{{ menuName }}</span><slot /></div>',
}
stubs.NcActionButton = {
	name: 'NcActionButton',
	props: ['disabled'],
	emits: ['click'],
	template: '<button class="nc-action-button-stub" :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
}
stubs.NcActionLink = {
	name: 'NcActionLink',
	props: ['href', 'target'],
	template: '<a class="nc-action-link-stub" :href="href" :target="target" v-bind="$attrs"><slot name="icon" /><slot /></a>',
}

function mountBar(actions, { provide, inline, overflowLabel, display } = {}) {
	return mount(CnActionButtons, {
		propsData: {
			actions,
			...(inline === undefined ? {} : { inline }),
			...(overflowLabel === undefined ? {} : { overflowLabel }),
			...(display === undefined ? {} : { display }),
		},
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
			const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
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

			const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
			expect(dialog.props('initialData')).toEqual({ ticketType: 'request' })
			// `item` stays null so the dialog remains in CREATE mode.
			expect(dialog.props('item')).toBeNull()
		})

		it('opens the plain form, not the properties table, because a header button aims at filing one', async () => {
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject: jest.fn(), fetchSchema })

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			expect(wrapper.findComponent({ name: 'CnFormDialog' }).exists()).toBe(true)
			expect(wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).exists()).toBe(false)
		})

		it('still opens the properties table when the action asks for advanced', async () => {
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject: jest.fn(), fetchSchema })

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead', advanced: true },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			expect(wrapper.findComponent({ name: 'CnAdvancedFormDialog' }).exists()).toBe(true)
			expect(wrapper.findComponent({ name: 'CnFormDialog' }).exists()).toBe(false)
		})

		it('hands the form its register so a reference field resolves to a real dropdown', async () => {
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject: jest.fn(), fetchSchema })

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			expect(wrapper.findComponent({ name: 'CnFormDialog' }).props('register')).toBe('crm')
		})

		it('writes the answers to the data-driven questions after the object they belong to exists', async () => {
			// A value row references the parent, so the order is not a detail:
			// posting them together would have OpenRegister drop every answer.
			const order = []
			const saveObject = jest.fn((type, payload) => {
				order.push(type)
				return Promise.resolve({ id: type === 'crm/lead' ? 'lead-1' : 'val-1', ...payload })
			})
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })
			resolveObjectOpType.mockImplementation((_s, { schema }) => `crm/${schema}`)

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' }, {
				answers: [{ definitionId: 'def-1', value: 'Cultuur', declarationKey: 'leadType' }],
				declarations: [{
					key: 'leadType',
					config: {
						definitions: { schema: 'leadField' },
						values: { schema: 'leadValue', objectRef: 'lead', definitionRef: 'field', valueKey: 'value' },
					},
				}],
			})
			await flush()

			expect(order).toEqual(['crm/lead', 'crm/leadValue'])
			expect(saveObject).toHaveBeenLastCalledWith('crm/leadValue', {
				lead: 'lead-1', field: 'def-1', value: 'Cultuur',
			})
		})

		it('writes no value rows for a schema that declares no data-driven questions', async () => {
			const saveObject = jest.fn(() => Promise.resolve({ id: 'lead-1' }))
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject, fetchSchema })
			resolveObjectOpType.mockReturnValue('crm/lead')

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()
			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' }, null)
			await flush()

			expect(saveObject).toHaveBeenCalledTimes(1)
		})

		it('narrows the form to the fields the button asks for', async () => {
			// One schema, two surfaces: the detail page edits all of it, the
			// header button collects only what someone filing a new one types.
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Case', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject: jest.fn(), fetchSchema })

			const wrapper = mountBar([
				{
					id: 'new-case',
					label: 'New case',
					type: 'open-form',
					register: 'dossiq',
					schema: 'case',
					includeFields: ['caseType', 'title'],
					excludeFields: ['status'],
					fieldOverrides: { title: { order: 1 } },
				},
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-case"]').trigger('click')
			await flush()

			const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
			expect(dialog.props('includeFields')).toEqual(['caseType', 'title'])
			expect(dialog.props('excludeFields')).toEqual(['status'])
			expect(dialog.props('fieldOverrides')).toEqual({ title: { order: 1 } })
		})

		it('asks for the whole schema when the action narrows nothing', async () => {
			const fetchSchema = jest.fn(() => Promise.resolve({ title: 'Lead', properties: {} }))
			useObjectStore.mockReturnValue({ saveObject: jest.fn(), fetchSchema })

			const wrapper = mountBar([
				{ id: 'new-lead', label: 'New lead', type: 'open-form', register: 'crm', schema: 'lead' },
			])
			await flush()
			await wrapper.find('[data-testid="cn-action-new-lead"]').trigger('click')
			await flush()

			const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
			expect(dialog.props('includeFields')).toBeNull()
			expect(dialog.props('excludeFields')).toEqual([])
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
			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
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
			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
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
			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
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
			wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Acme' })
			await flush()

			expect(push).toHaveBeenCalledWith({ name: 'Leads', params: { id: 'lead-7' } })
		})
	})

	describe('open-form seed values', () => {
		it('resolves object-context tokens in `props`', () => {
			// An action on a detail page stamps the record it belongs to. Saving
			// the literal "@objectId" makes a foreign key that points at nothing,
			// and nothing notices until whatever reads it later does.
			const w = mount(CnActionButtons, {
				props: {
					actions: [{
						id: 'log-hours',
						type: 'open-form',
						label: 'Log hours',
						register: 'humaniq',
						schema: 'TimeEntry',
						props: { domainObjectRef: '@objectId', domainObjectType: 'dossiq:case' },
					}],
				},
				global: {
					provide: {
						cnObjectContext: ref({ objectId: 'case-7', object: { title: 'A case' }, register: 'dossiq', schema: 'case' }),
					},
				},
			})
			w.vm.formEntry = w.vm.actions[0]

			expect(w.vm.formInitialValues).toEqual({
				domainObjectRef: 'case-7',
				domainObjectType: 'dossiq:case',
			})
		})

		it('leaves a literal seed value alone', () => {
			const w = mount(CnActionButtons, {
				props: {
					actions: [{ id: 'a', type: 'open-form', label: 'New', schema: 's', props: { kind: 'complaint' } }],
				},
			})
			w.vm.formEntry = w.vm.actions[0]

			expect(w.vm.formInitialValues).toEqual({ kind: 'complaint' })
		})

		it('is null when the action declares no seed values', () => {
			const w = mount(CnActionButtons, {
				props: { actions: [{ id: 'a', type: 'open-form', label: 'New', schema: 's' }] },
			})
			w.vm.formEntry = w.vm.actions[0]

			expect(w.vm.formInitialValues).toBeNull()
		})
	})

	describe('overflow, sub-actions and onSelect', () => {
		const four = [
			{ id: 'a', label: 'A', type: 'api-call', url: '/a' },
			{ id: 'b', label: 'B', type: 'api-call', url: '/b' },
			{ id: 'c', label: 'C', type: 'api-call', url: '/c' },
			{ id: 'd', label: 'D', type: 'api-call', url: '/d' },
		]

		it('renders every action as a button and NO overflow when inline is unset', async () => {
			// The backwards-compatibility guarantee: existing consumers pass no
			// `inline` and must keep the header they already have.
			const wrapper = mountBar(four)
			await flush()
			for (const id of ['a', 'b', 'c', 'd']) {
				expect(wrapper.find(`[data-testid="cn-action-${id}"]`).exists()).toBe(true)
			}
			expect(wrapper.find('[data-testid="cn-action-buttons-overflow"]').exists()).toBe(false)
		})

		it('keeps the first N as buttons and collapses the rest', async () => {
			const wrapper = mountBar(four, { inline: 2 })
			await flush()
			const overflow = wrapper.find('[data-testid="cn-action-buttons-overflow"]')
			expect(overflow.exists()).toBe(true)
			expect(wrapper.vm.barActions.map((a) => a.id)).toEqual(['a', 'b'])
			expect(wrapper.vm.overflowActions.map((a) => a.id)).toEqual(['c', 'd'])
			// The collapsed ones still dispatch, from inside the menu.
			await overflow.find('[data-testid="cn-action-d"]').trigger('click')
			await flush()
			expect(dispatchAction.mock.calls[0][0]).toMatchObject({ url: '/d' })
		})

		it('never collapses a primary action, and it costs no inline slot', async () => {
			// NcActions paints all inline actions with one shared variant, so a
			// lone primary among them cannot be expressed — it has to stay out.
			const wrapper = mountBar([
				{ id: 'open', label: 'Open', variant: 'primary', type: 'open-page', target: '/x' },
				...four,
			], { inline: 2 })
			await flush()
			expect(wrapper.vm.barActions.map((a) => a.id)).toEqual(['open', 'a', 'b'])
			expect(wrapper.vm.overflowActions.map((a) => a.id)).toEqual(['c', 'd'])
		})

		it('gives an action with children its own chevron, costing no inline slot', async () => {
			const wrapper = mountBar([
				{
					id: 'open',
					label: 'Open app',
					type: 'open-page',
					target: '/x',
					childrenLabel: 'Open a version',
					children: [
						{ id: 'v12', label: 'Open v1.2', type: 'open-page', target: '/x?v=1.2' },
					],
				},
				...four,
			], { inline: 2 })
			await flush()
			const chevron = wrapper.find('[data-testid="cn-action-children-open"]')
			expect(chevron.exists()).toBe(true)
			expect(chevron.find('.menu-name').text()).toBe('Open a version')
			expect(wrapper.vm.barActions.map((a) => a.id)).toEqual(['open', 'a', 'b'])
			await chevron.find('[data-testid="cn-action-v12"]').trigger('click')
			await flush()
			expect(dispatchAction.mock.calls[0][0]).toMatchObject({ target: '/x?v=1.2' })
		})

		it('hides a child whose visibleWhen evaluates false', async () => {
			evaluateVisibleWhen.mockImplementation((cond) => Promise.resolve(cond.value === 'keep'))
			const wrapper = mountBar([
				{
					id: 'open',
					label: 'Open',
					type: 'open-page',
					target: '/x',
					children: [
						{ id: 'keep', label: 'Keep', type: 'open-page', target: '/k', visibleWhen: { field: 's', op: 'eq', value: 'keep' } },
						{ id: 'drop', label: 'Drop', type: 'open-page', target: '/d', visibleWhen: { field: 's', op: 'eq', value: 'drop' } },
					],
				},
			])
			await flush()
			expect(wrapper.find('[data-testid="cn-action-keep"]').exists()).toBe(true)
			expect(wrapper.find('[data-testid="cn-action-drop"]').exists()).toBe(false)
		})

		it('calls onSelect instead of dispatching, and still honours confirm', async () => {
			const onSelect = jest.fn()
			const wrapper = mountBar([{ id: 'edit', label: 'Edit', onSelect }])
			await flush()
			await wrapper.find('[data-testid="cn-action-edit"]').trigger('click')
			await flush()
			expect(onSelect).toHaveBeenCalledTimes(1)
			expect(dispatchAction).not.toHaveBeenCalled()
		})

		it('renders a primary action through NcButton\'s `variant`, not `type`', async () => {
			// NcButton has both props: `type` is the NATIVE button type and
			// `variant` is the styling. Binding the descriptor's variant to
			// `type` left every button on the "secondary" default, so a
			// primary/error action never once looked different.
			const wrapper = mountBar([
				{ id: 'open', label: 'Open', variant: 'primary', type: 'open-page', target: '/x' },
				{ id: 'kill', label: 'Delete', variant: 'error', type: 'api-call', url: '/d' },
				{ id: 'plain', label: 'Plain', type: 'api-call', url: '/p' },
			])
			await flush()
			const variantOf = (id) => wrapper
				.findComponent(`[data-testid="cn-action-${id}"]`)
				.props('variant')
			expect(variantOf('open')).toBe('primary')
			expect(variantOf('kill')).toBe('error')
			expect(variantOf('plain')).toBe('secondary')
		})

		it('names the overflow menu from overflowLabel', async () => {
			const wrapper = mountBar(four, { inline: 1, overflowLabel: 'More' })
			await flush()
			expect(wrapper.find('[data-testid="cn-action-buttons-overflow"] .menu-name').text()).toBe('More')
		})
	})

	// An action that ends in a URL has to BE a link. Routing it through a click
	// handler costs middle-click, "open in new tab", the status-bar preview and
	// the role assistive tech announces — none of which JS can give back.
	describe('href entries render as links', () => {
		it('renders a bar entry with href as an anchor, and never dispatches it', async () => {
			const wrapper = mountBar([
				{ id: 'open-app', label: 'Open app', href: '/index.php/apps/buildiq/builder/shop', target: '_blank' },
			])
			await flush()
			const el = wrapper.find('[data-testid="cn-action-open-app"]')
			expect(el.element.tagName).toBe('A')
			expect(el.attributes('href')).toBe('/index.php/apps/buildiq/builder/shop')
			expect(el.attributes('target')).toBe('_blank')

			await el.trigger('click')
			await flush()
			expect(dispatchAction).not.toHaveBeenCalled()
		})

		it('renders an href entry in the overflow menu as an NcActionLink', async () => {
			const wrapper = mountBar([
				{ id: 'first', label: 'First', type: 'api-call', url: '/a' },
				{ id: 'docs', label: 'Documentation', href: 'https://example.test/docs' },
			], { inline: 1 })
			await flush()
			const link = wrapper.find('[data-testid="cn-action-buttons-overflow"] [data-testid="cn-action-docs"]')
			expect(link.element.tagName).toBe('A')
			expect(link.attributes('href')).toBe('https://example.test/docs')
		})

		it('renders an href CHILD as a link while its button siblings stay buttons', async () => {
			const wrapper = mountBar([
				{
					id: 'open-app',
					label: 'Open app',
					variant: 'primary',
					children: [
						{ id: 'open-prod', label: 'Production', href: '/index.php/apps/buildiq/builder/shop' },
						{ id: 'edit-prod', label: 'Edit production', type: 'api-call', url: '/e' },
					],
				},
			])
			await flush()
			expect(wrapper.find('[data-testid="cn-action-open-prod"]').element.tagName).toBe('A')
			expect(wrapper.find('[data-testid="cn-action-edit-prod"]').element.tagName).toBe('BUTTON')
		})
	})

	// REGRESSION. A manifest-authored `type: "navigate"` action carries its URL
	// in `target`, not `href`, so it fell through to the dispatcher and was
	// pushed at the router. An absolute URL is not a route: it matched nothing
	// and landed on the app's fallback page carrying the URL's query string.
	describe('an external navigate action becomes a link', () => {
		it('renders as an anchor to the target, in a new tab, and never dispatches', async () => {
			const wrapper = mountBar([
				{ id: 'watch', label: 'Watch', type: 'navigate', target: 'https://www.youtube.com/watch?v=MM60juTPkSM' },
			])
			await flush()
			const el = wrapper.find('[data-testid="cn-action-watch"]')
			expect(el.element.tagName).toBe('A')
			expect(el.attributes('href')).toBe('https://www.youtube.com/watch?v=MM60juTPkSM')
			expect(el.attributes('target')).toBe('_blank')

			await el.trigger('click')
			await flush()
			expect(dispatchAction).not.toHaveBeenCalled()
		})

		it('leaves an in-app navigate as a dispatched button', async () => {
			const wrapper = mountBar([
				{ id: 'dogs', label: 'Dogs', type: 'navigate', target: '/dogs' },
			])
			await flush()
			const el = wrapper.find('[data-testid="cn-action-dogs"]')
			expect(el.element.tagName).toBe('BUTTON')

			await el.trigger('click')
			await flush()
			expect(dispatchAction).toHaveBeenCalled()
		})

		it('does not override an author-supplied href', async () => {
			const wrapper = mountBar([
				{ id: 'x', label: 'X', type: 'navigate', target: 'https://a.test', href: 'https://b.test' },
			])
			await flush()
			expect(wrapper.find('[data-testid="cn-action-x"]').attributes('href')).toBe('https://b.test')
		})

		it('publishes the link to a display:"menu" host through `entries`', async () => {
			const wrapper = mountBar([
				{ id: 'watch', label: 'Watch', type: 'navigate', target: 'https://example.test/v' },
			], { display: 'menu' })
			await flush()
			const [entries] = wrapper.emitted('entries').at(-1)
			expect(entries[0]).toMatchObject({
				id: 'watch',
				href: 'https://example.test/v',
				linkTarget: '_blank',
			})
		})

		it('leaves href and linkTarget empty for a dispatched entry', async () => {
			const wrapper = mountBar([
				{ id: 'dogs', label: 'Dogs', type: 'navigate', target: '/dogs' },
			], { display: 'menu' })
			await flush()
			const [entries] = wrapper.emitted('entries').at(-1)
			expect(entries[0]).toMatchObject({ href: '', linkTarget: '' })
		})
	})
})
