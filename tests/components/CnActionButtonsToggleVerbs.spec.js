/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnActionButtons toggle (manifest-api-call-verbs-and-toggle): state read
 * off the page object, a list that holds the signed-in user, one verb each
 * way, the revert on failure, and NcButton's own `pressed` prop carrying the
 * state. dispatchAction is stubbed: these tests assert which api-call the
 * toggle builds, not how the dispatcher sends it (actionsDispatcherVerbs.spec.js).
 *
 * @spec openspec/changes/manifest-api-call-verbs-and-toggle/specs/manifest-api-call-verbs-and-toggle/spec.md
 */

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'

jest.mock('../../src/utils/actionsDispatcher.js', () => {
	const actual = jest.requireActual('../../src/utils/actionsDispatcher.js')
	return {
		...actual,
		__esModule: true,
		dispatchAction: jest.fn(() => Promise.resolve({ ok: true })),
	}
})
jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: jest.fn(() => ({ uid: 'alice' })),
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: {} })) },
}))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(() => Promise.resolve(null)),
}))
jest.mock('../../src/utils/visibleWhen.js', () => ({
	__esModule: true,
	evaluateVisibleWhen: jest.fn(() => Promise.resolve(true)),
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
		// `pressed` declared so the test reads what the toggle hands NcButton,
		// rather than an aria attribute the stub would have to invent.
		props: ['disabled', 'variant', 'href', 'target', 'pressed'],
		emits: ['click'],
		template: '<button :disabled="disabled" :data-pressed="String(pressed)" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
	},
	CnIcon: true,
	CnConfirmDialog: true,
	CnFormDialog: true,
	CnAdvancedFormDialog: true,
	CnRunNodeDialog: true,
	NcActions: true,
	NcActionButton: true,
	NcActionLink: true,
}

const FAV_URL = '/apps/openregister/api/objects/dossiq/case/@objectId/favourite'

const star = {
	id: 'star',
	label: 'Star',
	type: 'toggle',
	labelOn: 'Starred',
	labelOff: 'Star',
	stateFrom: { field: '@self.favourite' },
	on: { method: 'PUT', url: FAV_URL },
	off: { method: 'DELETE', url: FAV_URL },
	successMessage: 'Saved',
}

const follow = {
	id: 'follow',
	label: 'Follow',
	type: 'toggle',
	labelOn: 'Following',
	labelOff: 'Follow',
	stateFrom: { field: 'followers', contains: '@me' },
	on: { method: 'POST', url: '/apps/dossiq/api/cases/@objectId/followers', payload: { user: '@me' } },
	off: { method: 'DELETE', url: '/apps/dossiq/api/cases/@objectId/followers/@me' },
}

function mountBar(actions, object) {
	const ctx = ref({ objectId: 'case-1', object, register: 'dossiq', schema: 'case' })
	const wrapper = mount(CnActionButtons, {
		props: { actions },
		global: { stubs, provide: { cnObjectContext: ctx } },
	})
	return { wrapper, ctx }
}

describe('CnActionButtons two-verb toggle', () => {
	beforeEach(() => {
		dispatchAction.mockReset()
		dispatchAction.mockResolvedValue({ ok: true })
		fetchEndpointSource.mockReset()
		fetchEndpointSource.mockResolvedValue(null)
	})

	it('reads a boolean field off the page object and passes it to NcButton pressed', async () => {
		const { wrapper } = mountBar([star], { '@self': { favourite: true } })
		await flush()
		const btn = wrapper.find('[data-testid="cn-action-toggle-star"]')
		expect(btn.attributes('data-pressed')).toBe('true')
		expect(btn.text()).toBe('Starred')
		// The object is already loaded: no state request goes out.
		expect(fetchEndpointSource).not.toHaveBeenCalled()
	})

	it('reads a missing field as off', async () => {
		const { wrapper } = mountBar([star], { title: 'A case' })
		await flush()
		const btn = wrapper.find('[data-testid="cn-action-toggle-star"]')
		expect(btn.attributes('data-pressed')).toBe('false')
		expect(btn.text()).toBe('Star')
	})

	it('reads whether a list holds the signed-in user', async () => {
		const on = mountBar([follow], { followers: ['bob', 'alice'] })
		const off = mountBar([follow], { followers: ['bob'] })
		const objects = mountBar([follow], { followers: [{ uid: 'alice', name: 'Alice' }] })
		const empty = mountBar([follow], { followers: [] })
		await flush()
		expect(on.wrapper.vm.toggleState.follow).toBe(true)
		expect(off.wrapper.vm.toggleState.follow).toBe(false)
		expect(objects.wrapper.vm.toggleState.follow).toBe(true)
		expect(empty.wrapper.vm.toggleState.follow).toBe(false)
	})

	it('switches on with the on verb and sends no state field', async () => {
		const { wrapper } = mountBar([star], { '@self': { favourite: false } })
		await flush()
		await wrapper.find('[data-testid="cn-action-toggle-star"]').trigger('click')
		expect(wrapper.vm.toggleState.star).toBe(true)
		await flush()
		expect(dispatchAction).toHaveBeenCalledTimes(1)
		expect(dispatchAction.mock.calls[0][0]).toEqual({
			type: 'api-call',
			url: FAV_URL,
			method: 'PUT',
			params: {},
			successMessage: 'Saved',
			errorMessage: undefined,
			refresh: undefined,
		})
	})

	it('switches off with the off verb', async () => {
		const { wrapper } = mountBar([star], { '@self': { favourite: true } })
		await flush()
		await wrapper.find('[data-testid="cn-action-toggle-star"]').trigger('click')
		await flush()
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({ type: 'api-call', url: FAV_URL, method: 'DELETE' })
		expect(wrapper.vm.toggleState.star).toBe(false)
	})

	it('passes the direction payload through for the dispatcher to resolve', async () => {
		const { wrapper } = mountBar([follow], { followers: [] })
		await flush()
		await wrapper.find('[data-testid="cn-action-toggle-follow"]').trigger('click')
		await flush()
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({
			method: 'POST',
			url: '/apps/dossiq/api/cases/@objectId/followers',
			payload: { user: '@me' },
		})
		expect(dispatchAction.mock.calls[0][0]).not.toHaveProperty('params')
	})

	it('falls back to writeUrl when a direction names no url', async () => {
		const { wrapper } = mountBar([{
			id: 'pin',
			label: 'Pin',
			type: 'toggle',
			writeUrl: '/apps/x/api/pins/@objectId',
			stateFrom: { field: 'pinned' },
			on: { method: 'PUT' },
			off: { method: 'DELETE' },
		}], { pinned: true })
		await flush()
		await wrapper.find('[data-testid="cn-action-toggle-pin"]').trigger('click')
		await flush()
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({ url: '/apps/x/api/pins/@objectId', method: 'DELETE' })
	})

	it('reverts when the write fails', async () => {
		dispatchAction.mockResolvedValue({ ok: false })
		const { wrapper } = mountBar([star], { '@self': { favourite: false } })
		await flush()
		const promise = wrapper.vm.onToggleClick(wrapper.vm.actions[0])
		expect(wrapper.vm.toggleState.star).toBe(true)
		await promise
		expect(wrapper.vm.toggleState.star).toBe(false)
	})

	it('re-reads the state when the page object reloads', async () => {
		const { wrapper, ctx } = mountBar([star], { '@self': { favourite: false } })
		await flush()
		expect(wrapper.vm.toggleState.star).toBe(false)
		ctx.value = { ...ctx.value, object: { '@self': { favourite: true } } }
		await nextTick()
		await flush()
		expect(wrapper.vm.toggleState.star).toBe(true)
		expect(wrapper.find('[data-testid="cn-action-toggle-star"]').attributes('data-pressed')).toBe('true')
	})

	it('keeps the single-verb toggle sending the flipped boolean under field', async () => {
		fetchEndpointSource.mockResolvedValue({ open: true })
		const { wrapper } = mountBar([{
			id: 'werkplek',
			type: 'toggle',
			label: 'Werkplek',
			stateSource: { url: '/state' },
			field: 'open',
			writeUrl: '/state',
		}], null)
		await flush()
		expect(wrapper.find('[data-testid="cn-action-toggle-werkplek"]').attributes('data-pressed')).toBe('true')
		await wrapper.find('[data-testid="cn-action-toggle-werkplek"]').trigger('click')
		await flush()
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({
			type: 'api-call',
			url: '/state',
			method: 'PUT',
			params: { open: false },
		})
	})

	it('uses the single-verb write when only one direction is declared', async () => {
		const { wrapper } = mountBar([{
			id: 'half',
			type: 'toggle',
			label: 'Half',
			field: 'open',
			writeUrl: '/state',
			method: 'POST',
			on: { method: 'PUT', url: '/on' },
		}], null)
		await flush()
		await wrapper.find('[data-testid="cn-action-toggle-half"]').trigger('click')
		await flush()
		expect(dispatchAction.mock.calls[0][0]).toMatchObject({ url: '/state', method: 'POST', params: { open: true } })
	})
})
