/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * An `open-form` action with an `endpoint` edits a record that is not a
 * register object (an OpenRegister organisation): it reads the record, shows
 * the declared fields filled in, and sends them back with PATCH or PUT.
 *
 * @spec openspec/changes/open-form-endpoint/specs/open-form-endpoint/spec.md#requirement-an-open-form-action-can-edit-a-record-through-an-endpoint
 */

import axios from '@nextcloud/axios'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { fetchEndpointSource } from '../../src/composables/useEndpointSource.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn(), patch: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	__esModule: true,
	fetchEndpointSource: jest.fn(),
	interpolateUrlTokens: jest.requireActual('../../src/composables/useEndpointSource.js').interpolateUrlTokens,
}))
jest.mock('../../src/utils/visibleWhen.js', () => ({ __esModule: true, evaluateVisibleWhen: jest.fn(() => Promise.resolve(true)) }))
jest.mock('../../src/store/useObjectStore.js', () => ({ __esModule: true, useObjectStore: jest.fn(() => ({})) }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: { name: 'NcButton', emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>' },
	CnIcon: { template: '<span />' },
	CnFormDialog: { name: 'CnFormDialog', props: ['schema', 'item'], template: '<div class="form-dialog-stub" />', methods: { setResult: jest.fn() } },
}

const EDIT = {
	id: 'organisation-edit',
	label: 'Edit',
	type: 'open-form',
	endpoint: { url: '/apps/openregister/api/organisations/@objectId', method: 'PUT' },
	formProperties: { name: { type: 'string', title: 'Name' }, description: { type: 'string', title: 'Description' } },
}

/**
 * @param {object} action The action.
 * @return {object} The mounted bar with the record `org-1`.
 */
function mountBar(action) {
	return mount(CnActionButtons, {
		propsData: { actions: [action] },
		stubs,
		provide: { cnObjectContext: { objectId: 'org-1', object: { id: 'org-1' } } },
		mocks: { $router: { push: jest.fn(() => Promise.resolve()) } },
	})
}

describe('open-form with an endpoint', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		fetchEndpointSource.mockResolvedValue({ id: 'org-1', name: 'Waterland', description: 'Gemeente', slug: 'waterland' })
		axios.put.mockResolvedValue({ data: { id: 'org-1' } })
		axios.patch.mockResolvedValue({ data: { id: 'org-1' } })
		axios.post.mockResolvedValue({ data: { outcome: 'added' } })
	})

	it('reads the record from the endpoint and shows the declared fields filled in', async () => {
		const wrapper = mountBar(EDIT)
		await flush()
		await wrapper.find('[data-testid="cn-action-organisation-edit"]').trigger('click')
		await flush()
		expect(fetchEndpointSource).toHaveBeenCalledWith({ url: EDIT.endpoint.url, responsePath: '' }, expect.anything(), { force: true })
		const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
		expect(dialog.props('schema')).toEqual({ type: 'object', properties: EDIT.formProperties })
		expect(dialog.props('item')).toMatchObject({ name: 'Waterland' })
	})

	it('sends only the declared fields back with the declared method', async () => {
		const wrapper = mountBar(EDIT)
		await flush()
		await wrapper.find('[data-testid="cn-action-organisation-edit"]').trigger('click')
		await flush()
		wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'Gemeente Waterland', description: 'Gemeente', slug: 'x' })
		await flush()
		expect(axios.put).toHaveBeenCalledWith('/nc/apps/openregister/api/organisations/org-1', { name: 'Gemeente Waterland', description: 'Gemeente' })
		expect(showSuccess).toHaveBeenCalled()
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
	})

	it('patches by default', async () => {
		const wrapper = mountBar({ ...EDIT, endpoint: { url: EDIT.endpoint.url } })
		await flush()
		await wrapper.find('[data-testid="cn-action-organisation-edit"]').trigger('click')
		await flush()
		wrapper.findComponent({ name: 'CnFormDialog' }).vm.$emit('confirm', { name: 'A' })
		await flush()
		expect(axios.patch).toHaveBeenCalled()
	})

	it('creates with POST from an empty form, reading nothing first', async () => {
		const wrapper = mountBar({ ...EDIT, endpoint: { url: '/apps/dossiq/api/phases/s1/steps', method: 'POST' } })
		await flush()
		await wrapper.find('[data-testid="cn-action-organisation-edit"]').trigger('click')
		await flush()
		expect(fetchEndpointSource).not.toHaveBeenCalled()
		const dialog = wrapper.findComponent({ name: 'CnFormDialog' })
		expect(dialog.props('item')).toBeNull()
		dialog.vm.$emit('confirm', { name: 'Welstandsadvies vragen' })
		await flush()
		expect(axios.post).toHaveBeenCalledWith('/nc/apps/dossiq/api/phases/s1/steps', { name: 'Welstandsadvies vragen' })
	})

	it('opens nothing when the record cannot be read', async () => {
		fetchEndpointSource.mockResolvedValue(null)
		const wrapper = mountBar(EDIT)
		await flush()
		await wrapper.find('[data-testid="cn-action-organisation-edit"]').trigger('click')
		await flush()
		expect(wrapper.findComponent({ name: 'CnFormDialog' }).exists()).toBe(false)
		expect(showError).toHaveBeenCalled()
	})
})

describe('the manifest schema', () => {
	it('accepts endpoint and formProperties on an action', () => {
		const schema = require('../../src/schemas/app-manifest-v2.schema.json')
		const action = (schema.$defs || schema.definitions).action.properties
		expect(action.endpoint.required).toEqual(['url'])
		expect(action.endpoint.properties.method.enum).toEqual(['PATCH', 'PUT', 'POST'])
		expect(action.formProperties.type).toBe('object')
	})
})
