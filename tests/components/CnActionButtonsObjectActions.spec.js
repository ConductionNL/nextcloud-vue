/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Header object actions (object-actions-ui): `type: "object-action"` and
 * `actionsFrom: "openregister"` expanded against OpenRegister's list,
 * unavailable actions disabled with their reason, absent ones not rendered,
 * a plain action run at once and one with inputs opened in its dialog; the
 * dispatcher's `object-action` case, the manifest schema, and the detail
 * page honouring a run's `next`. OpenRegister is mocked at the HTTP edge.
 *
 * @spec openspec/changes/object-actions-ui/specs/object-actions-ui/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/event-bus', () => ({
	__esModule: true,
	emit: jest.fn(),
	subscribe: jest.fn(),
	unsubscribe: jest.fn(),
}))
jest.mock('@nextcloud/dialogs', () => ({
	__esModule: true,
	showSuccess: jest.fn(),
	showError: jest.fn(),
}))

const axios = require('@nextcloud/axios').default
const { showError, showSuccess } = require('@nextcloud/dialogs')
const CnActionButtons = require('../../src/components/CnActionButtons/CnActionButtons.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default
const { dispatchAction } = require('../../src/utils/actionsDispatcher.js')
const { expandObjectActionEntries, normaliseObjectAction } = require('../../src/utils/objectActions.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const LISTED = [
	{ key: 'claim', kind: 'steps', label: 'Claim', available: false, reason: 'Already claimed', surfaces: ['header', 'row', 'bulk'] },
	{ key: 'hold', kind: 'steps', label: 'Put on hold', available: true, surfaces: ['header', 'row'] },
	{ key: 'publish', kind: 'steps', label: 'Publish', available: true, surfaces: ['header'], inputs: { type: 'object', required: ['from'], properties: { from: { type: 'string', format: 'date' } } } },
	{ key: 'archive', kind: 'transition', label: 'Archive', available: true, surfaces: ['detail-menu'] },
]

const OBJECT_CONTEXT = { objectId: 'c-1', object: { id: 'c-1', assignee: 'jan' }, register: 'zaken', schema: 'case' }

const stubs = {
	NcButton: {
		name: 'NcButton',
		props: ['disabled', 'variant', 'href', 'target'],
		emits: ['click'],
		template: '<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
	},
	CnIcon: { name: 'CnIcon', template: '<span class="cn-icon" />' },
	CnObjectActionDialog: {
		name: 'CnObjectActionDialog',
		props: ['action', 'register', 'schema', 'objectId', 'currentObject'],
		template: '<div class="object-action-dialog-stub" />',
	},
}

/**
 * Mount the header bar on a detail page's object.
 *
 * @param {Array<object>} actions The manifest header actions.
 * @return {object} The wrapper.
 */
function mountBar(actions) {
	return mount(CnActionButtons, {
		props: { actions },
		global: { stubs, provide: { cnObjectContext: OBJECT_CONTEXT } },
	})
}

beforeEach(() => {
	jest.clearAllMocks()
	axios.get.mockResolvedValue({ data: { actions: LISTED } })
	axios.post.mockResolvedValue({ status: 200, data: { run: 'r-1', outcome: 'completed' } })
})

describe('expandObjectActionEntries', () => {
	const listed = LISTED.map((entry) => normaliseObjectAction(entry))

	it('expands actionsFrom in place for the surface, narrowed by include', () => {
		const out = expandObjectActionEntries([
			{ id: 'edit', label: 'Edit', type: 'handler' },
			{ id: 'or', actionsFrom: 'openregister', include: ['hold', 'claim'], variant: 'primary' },
			{ id: 'refresh', label: 'Refresh', type: 'refresh' },
		], listed, 'header')
		expect(out.map((entry) => entry.id)).toEqual(['edit', 'or:hold', 'or:claim', 'refresh'])
		expect(out[1]).toMatchObject({ type: 'object-action', action: 'hold', label: 'Put on hold', variant: 'primary', sourceId: 'or' })
		expect(out[2]).toMatchObject({ disabled: true, title: 'Already claimed' })
	})

	it('lets an entry name its own surface', () => {
		const out = expandObjectActionEntries([{ id: 'or', actionsFrom: 'openregister', surface: 'detail-menu' }], listed, 'header')
		expect(out.map((entry) => entry.action)).toEqual(['archive'])
	})

	it('leaves out an object-action OpenRegister does not list, and keeps the manifest label', () => {
		const out = expandObjectActionEntries([
			{ id: 'p', type: 'object-action', action: 'publish', label: 'Publish now' },
			{ id: 's', type: 'object-action', action: 'secret' },
		], listed, 'header')
		expect(out).toHaveLength(1)
		expect(out[0]).toMatchObject({ id: 'p', label: 'Publish now', objectAction: { key: 'publish' } })
	})
})

describe('CnActionButtons object actions', () => {
	it('renders the listed header actions, the unavailable one disabled with its reason', async () => {
		const wrapper = mountBar([{ id: 'or', actionsFrom: 'openregister' }])
		await flushPromises()
		expect(axios.get.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-1/actions')
		const claim = wrapper.find('[data-testid="cn-action-or:claim"]')
		expect(claim.attributes('disabled')).toBeDefined()
		expect(claim.attributes('title')).toBe('Already claimed')
		expect(claim.attributes('aria-label')).toBe('Claim (Already claimed)')
		expect(wrapper.find('[data-testid="cn-action-or:hold"]').attributes('disabled')).toBeUndefined()
		expect(wrapper.find('[data-testid="cn-action-or:archive"]').exists()).toBe(false)
	})

	it('runs a plain action at once and toasts', async () => {
		const wrapper = mountBar([{ id: 'or', actionsFrom: 'openregister' }])
		await flushPromises()
		await wrapper.find('[data-testid="cn-action-or:hold"]').trigger('click')
		await flushPromises()
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-1/actions/hold')
		expect(showSuccess).toHaveBeenCalledWith('Put on hold: done')
	})

	it('does not run a disabled action', async () => {
		const wrapper = mountBar([{ id: 'or', actionsFrom: 'openregister' }])
		await flushPromises()
		wrapper.vm.onActionClick(wrapper.vm.renderedActions.find((entry) => entry.action === 'claim'))
		await flushPromises()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('opens the inputs dialog for an action with inputs', async () => {
		const wrapper = mountBar([{ id: 'publish', type: 'object-action', action: 'publish' }])
		await flushPromises()
		await wrapper.find('[data-testid="cn-action-publish"]').trigger('click')
		await flushPromises()
		const dialog = wrapper.findComponent({ name: 'CnObjectActionDialog' })
		expect(dialog.exists()).toBe(true)
		expect(dialog.props()).toMatchObject({ register: 'zaken', schema: 'case', objectId: 'c-1' })
		expect(dialog.props('action').key).toBe('publish')
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('renders no object action when the list cannot be read', async () => {
		axios.get.mockRejectedValue({ response: { status: 500 } })
		const wrapper = mountBar([{ id: 'or', actionsFrom: 'openregister' }, { id: 'p', type: 'object-action', action: 'publish' }])
		await flushPromises()
		expect(wrapper.findAll('button')).toHaveLength(0)
	})

	it('shows a refusal\'s sentence', async () => {
		axios.post.mockRejectedValue({ response: { status: 403, data: { message: 'You may not perform "hold" on this object.' } } })
		const wrapper = mountBar([{ id: 'or', actionsFrom: 'openregister', include: ['hold'] }])
		await flushPromises()
		await wrapper.find('[data-testid="cn-action-or:hold"]').trigger('click')
		await flushPromises()
		expect(showError).toHaveBeenCalledWith('You may not perform "hold" on this object.')
	})
})

describe('dispatchAction object-action', () => {
	it('hands the action to the host that can open its dialog', () => {
		const openObjectAction = jest.fn()
		const action = { id: 'p', type: 'object-action', action: 'publish' }
		dispatchAction(action, { openObjectAction })
		expect(openObjectAction).toHaveBeenCalledWith(action)
	})

	it('runs it against the page object otherwise, fail-closed without one', async () => {
		await dispatchAction({ id: 'h', type: 'object-action', action: 'hold' }, { tokenCtx: { register: 'zaken', schema: 'case', objectId: 'c-9' } })
		expect(axios.post.mock.calls[0][0]).toContain('/apps/openregister/api/objects/zaken/case/c-9/actions/hold')
		axios.post.mockClear()
		const result = await dispatchAction({ id: 'h', type: 'object-action', action: 'hold' }, { tokenCtx: {} })
		expect(result.ok).toBe(false)
		expect(axios.post).not.toHaveBeenCalled()
	})
})

describe('manifest schema', () => {
	const page = (config) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'zaken', schema: 'case', ...config } }],
	})

	it('accepts object-action and actionsFrom entries without a label on header, row and bulk actions', () => {
		const result = validateManifestV2(page({
			headerActions: [{ id: 'or', actionsFrom: 'openregister', include: ['hold'] }, { id: 'p', type: 'object-action', action: 'publish' }],
			actions: [{ id: 'or', actionsFrom: 'openregister' }, { id: 'h', type: 'object-action', action: 'hold' }],
			bulkActions: [{ id: 'or', actionsFrom: 'openregister', surface: 'bulk' }],
		}))
		expect(result.errors).toEqual([])
		expect(result.valid).toBe(true)
	})

	it('refuses an object-action without its action key, and a plain action without a label', () => {
		expect(validateManifestV2(page({ headerActions: [{ id: 'p', type: 'object-action' }] })).valid).toBe(false)
		expect(validateManifestV2(page({ headerActions: [{ id: 'x', type: 'refresh' }] })).valid).toBe(false)
		expect(validateManifestV2(page({ headerActions: [{ id: 'or', actionsFrom: 'elsewhere' }] })).valid).toBe(false)
	})
})

describe('CnDetailPage honours a run\'s next', () => {
	/**
	 * A stand-in for the page, with what the handler reads.
	 *
	 * @param {object} extra Fields to set.
	 * @return {object}
	 */
	function page(extra = {}) {
		return { objectId: 'c-1', nextTo: { name: 'case', params: { id: 'c-2' } }, listNavigation: { available: true }, $router: { push: jest.fn(), back: jest.fn() }, $emit: jest.fn(), ...extra }
	}

	it('steps to the next record', () => {
		const self = page()
		CnDetailPage.methods.onObjectActionNext.call(self, { action: 'hold', next: 'next', object: { id: 'c-1' } })
		expect(self.$router.push).toHaveBeenCalledWith({ name: 'case', params: { id: 'c-2' } })
		expect(self.$emit).toHaveBeenCalledWith('object-action-next', { action: 'hold', next: 'next' })
	})

	it('goes back to the list, and ignores a run on another record', () => {
		const self = page()
		CnDetailPage.methods.onObjectActionNext.call(self, { action: 'hold', next: 'list', object: { id: 'c-1' } })
		expect(self.$router.back).toHaveBeenCalled()
		const other = page()
		CnDetailPage.methods.onObjectActionNext.call(other, { action: 'hold', next: 'next', object: { id: 'c-7' } })
		expect(other.$router.push).not.toHaveBeenCalled()
	})
})
