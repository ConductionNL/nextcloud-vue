/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The `create-form` widget: a dashboard card that creates one object from the
 * fields its manifest declares (PqLoyaliteit "Aanmelding loyaliteit").
 *
 * @spec openspec/changes/create-form-widget/specs/create-form-widget/spec.md#requirement-a-dashboard-card-can-create-an-object-from-declared-fields
 */
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'

const mockStore = {
	registerObjectType: jest.fn(),
	saveObject: jest.fn(() => Promise.resolve({ id: 'acc-1' })),
}

jest.mock('../../src/store/index.js', () => ({
	__esModule: true,
	useObjectStore: () => mockStore,
}))

const mockLoad = jest.fn()
jest.mock('../../src/utils/optionsFrom.js', () => ({
	__esModule: true,
	isOptionsFrom: (from) => Boolean(from && from.register),
	loadOptionsFrom: (...args) => mockLoad(...args),
}))

import CnCreateFormWidget from '../../src/components/CnCreateFormWidget/CnCreateFormWidget.vue'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'

import '../../src/components/CnCreateFormWidget/index.js'

const CONTENT = {
	register: 'pipelinq',
	schema: 'customerLoyaltyAccount',
	submitLabel: 'Create loyalty account',
	submitIcon: 'Plus',
	fields: [
		{ key: 'customerId', label: 'Customer', type: 'reference', schema: 'client', required: true },
		{ key: 'programmeId', label: 'Programme', type: 'select', required: true, default: '@workspace.programme', optionsFrom: { register: 'pipelinq', schema: 'loyaltyProgramme', labelField: 'name', keepFields: ['termsUrl'] } },
		{ key: 'optInTermsVersion', label: 'Terms version accepted', default: '2026-1' },
		{ key: 'optInAccepted', label: 'I agree', type: 'checkbox', required: true, link: { label: 'Read the programme terms', from: { field: 'programmeId', path: 'termsUrl' } } },
	],
	values: { status: 'active', currentBalance: 0, optInTimestamp: '@now' },
}

function mountWidget(workspace = { programme: 'p-1' }) {
	const holder = reactive({ value: workspace })
	const w = mount(CnCreateFormWidget, {
		props: { content: CONTENT },
		global: {
			provide: { cnWorkspaceContext: holder, cnTranslate: (key) => ({ Customer: 'Klant' }[key] || key) },
			stubs: { CnResourceSelect: true, CnIcon: true },
		},
	})
	return { w, holder }
}

describe('CnCreateFormWidget', () => {
	beforeEach(() => {
		mockStore.saveObject.mockClear()
		mockLoad.mockReset()
		mockLoad.mockResolvedValue([
			{ id: 'p-1', label: 'Zuiddrecht Spaarpas', data: { termsUrl: 'https://example.org/voorwaarden' } },
			{ id: 'p-2', label: 'Tweede', data: { termsUrl: null } },
		])
	})

	it('registers as the create-form dashboard widget', () => {
		expect(getWidgetTypeEntry('create-form').renderer).toBe(CnCreateFormWidget)
	})

	it('seeds the fields from their defaults and the page filters, translated', async () => {
		const { w } = mountWidget()
		await flushPromises()
		expect(w.vm.form).toEqual({ customerId: '', programmeId: 'p-1', optInTermsVersion: '2026-1', optInAccepted: false })
		expect(w.vm.fields[0].label).toBe('Klant')
		expect(w.vm.formFields[1].options).toEqual([{ value: 'p-1', label: 'Zuiddrecht Spaarpas' }, { value: 'p-2', label: 'Tweede' }])
	})

	it('follows the page filter while the reader has not chosen', async () => {
		const { w, holder } = mountWidget()
		await flushPromises()
		holder.value = { programme: 'p-2' }
		await flushPromises()
		expect(w.vm.form.programmeId).toBe('p-2')
	})

	it('links the terms of the chosen option', async () => {
		const { w } = mountWidget()
		await flushPromises()
		expect(w.find('[data-testid="cn-create-form-link-optInAccepted"]').attributes('href')).toBe('https://example.org/voorwaarden')
		w.vm.onFieldUpdate({ key: 'programmeId', value: 'p-2' })
		await flushPromises()
		expect(w.find('[data-testid="cn-create-form-link-optInAccepted"]').exists()).toBe(false)
	})

	it('creates nothing until every required field is set and the checkbox ticked', async () => {
		const { w } = mountWidget()
		await flushPromises()
		w.vm.onFieldUpdate({ key: 'customerId', value: 'c-1' })
		expect(w.vm.canSubmit).toBe(false)
		await w.vm.onSubmit()
		expect(mockStore.saveObject).not.toHaveBeenCalled()
	})

	it('creates the object from the fields and the declared values, then resets', async () => {
		const { w } = mountWidget()
		await flushPromises()
		w.vm.onFieldUpdate({ key: 'customerId', value: 'c-1' })
		w.vm.onFieldUpdate({ key: 'optInAccepted', value: true })
		await w.find('[data-testid="cn-create-form-submit"]').trigger('click')
		await flushPromises()
		expect(mockStore.registerObjectType).toHaveBeenCalledWith('pipelinq-customerLoyaltyAccount', 'customerLoyaltyAccount', 'pipelinq')
		const [slug, payload] = mockStore.saveObject.mock.calls[0]
		expect(slug).toBe('pipelinq-customerLoyaltyAccount')
		expect(payload).toMatchObject({ customerId: 'c-1', programmeId: 'p-1', optInTermsVersion: '2026-1', optInAccepted: true, status: 'active', currentBalance: 0 })
		expect(payload.optInTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(w.emitted('saved')).toHaveLength(1)
		expect(w.vm.form.customerId).toBe('')
		expect(w.vm.form.optInAccepted).toBe(false)
	})

	it('says so when the create fails', async () => {
		mockStore.saveObject.mockResolvedValueOnce(null)
		const { w } = mountWidget()
		await flushPromises()
		w.vm.onFieldUpdate({ key: 'customerId', value: 'c-1' })
		w.vm.onFieldUpdate({ key: 'optInAccepted', value: true })
		await w.vm.onSubmit()
		expect(w.vm.errorMessage).not.toBe('')
		expect(w.vm.form.customerId).toBe('c-1')
	})
})
