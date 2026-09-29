/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The create dialog never asks for the tenant.
 *
 * Reported by the learniq live lane: "Add Work group" and "Add Session" showed
 * a required "Tenant *" box, and the form refused to submit until a teacher
 * typed something into it. Tenant is set by the platform. The dialog now hides
 * the tenant property and fills it itself: the record's own value on edit,
 * else the active tenant context, else OpenRegister's active organisation.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { activeOrganisation: { uuid: 'org-active', name: 'Default Organisation' } } })),
		post: jest.fn(),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (path) => path,
	generateOcsUrl: (path) => path,
	imagePath: (app, file) => `/${app}/img/${file}`,
}))

const axios = require('@nextcloud/axios').default
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default
const { provideTenantContext } = require('../../src/composables/useTenantContext.js')

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

/** The live learniq work-group schema (OpenRegister, 2026-09-29), reduced. */
const workGroup = {
	title: 'Work group',
	required: ['name', 'tenant_id'],
	properties: {
		name: { type: 'string', title: 'Name' },
		tenant_id: { description: 'The organisation this work group belongs to.', title: 'Tenant', type: 'string' },
	},
}

/**
 * Mount the dialog, optionally below a tenant-context provider.
 *
 * @param {object} props CnFormDialog props.
 * @param {string|null} [tenantUuid] Active tenant to provide, or none.
 * @return {object} The CnFormDialog instance.
 */
function mountDialog(props, tenantUuid = undefined) {
	if (tenantUuid === undefined) {
		return mount(CnFormDialog, { props, global: { stubs } }).vm
	}
	const Wrapper = defineComponent({
		setup() {
			provideTenantContext(tenantUuid, null)
			return () => h(CnFormDialog, props)
		},
	})
	return mount(Wrapper, { global: { stubs } }).findComponent(CnFormDialog).vm
}

beforeEach(() => {
	axios.get.mockClear()
})

describe('CnFormDialog — tenant is never asked for', () => {
	it('does not render a Tenant field', () => {
		const vm = mountDialog({ schema: workGroup, item: null })
		expect(vm.visibleFields.map((f) => f.key)).toEqual(['name'])
	})

	it('submits once the person filled in what they were asked', async () => {
		const vm = mountDialog({ schema: workGroup, item: null })
		await flushPromises()
		vm.updateField('name', 'Groep 3')
		expect(vm.validate()).toBe(true)
	})

	it('fills the tenant from the active tenant context without asking OpenRegister', async () => {
		const vm = mountDialog({ schema: workGroup, item: null }, 'org-context')
		await flushPromises()
		vm.updateField('name', 'Groep 3')
		expect(vm.buildSubmitPayload().tenant_id).toBe('org-context')
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('fills the tenant from OpenRegister\'s active organisation when the app provided no context', async () => {
		const vm = mountDialog({ schema: workGroup, item: null })
		await flushPromises()
		expect(axios.get).toHaveBeenCalledWith('/apps/openregister/api/organisations/active')
		expect(vm.buildSubmitPayload().tenant_id).toBe('org-active')
	})

	it('does not write the looked-up tenant into the form, so no draft is saved for an untouched form', async () => {
		const vm = mountDialog({ schema: workGroup, item: null })
		await flushPromises()
		expect(vm.formData.tenant_id === null || vm.formData.tenant_id === undefined).toBe(true)
	})

	it('keeps the record\'s own tenant on edit', async () => {
		const vm = mountDialog({ schema: workGroup, item: { id: 'wg-1', name: 'Groep 1', tenant_id: 'org-record' } }, 'org-context')
		await flushPromises()
		expect(vm.buildSubmitPayload().tenant_id).toBe('org-record')
		expect(axios.get).not.toHaveBeenCalled()
	})

	it('leaves the tenant out of the payload, not blank, when nobody can say what it is', async () => {
		axios.get.mockImplementationOnce(() => Promise.reject(new Error('404')))
		const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
		const vm = mountDialog({ schema: workGroup, item: null })
		await flushPromises()
		expect('tenant_id' in vm.buildSubmitPayload()).toBe(false)
		spy.mockRestore()
	})

	it('shows the tenant again when a fieldOverride says hidden: false', () => {
		const vm = mountDialog({ schema: workGroup, item: null, fieldOverrides: { tenant_id: { hidden: false } } })
		expect(vm.visibleFields.map((f) => f.key)).toContain('tenant_id')
		expect(vm.tenantKeys).toEqual([])
	})

	it('never looks up a tenant for a schema without one', async () => {
		mountDialog({ schema: { title: 'Note', properties: { title: { type: 'string' } } }, item: null })
		await flushPromises()
		expect(axios.get).not.toHaveBeenCalled()
	})
})
