/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-1
 * @spec openspec/changes/form-live-values/tasks.md#task-2
 */
import { mount } from '@vue/test-utils'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn().mockResolvedValue({ data: { ocs: { data: { displayname: 'Jan Jansen', email: 'jan@example.nl' } } } }) },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'jan', displayName: 'Jan Jansen' }) }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: { template: '<input />', props: ['modelValue'] },
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnFieldHelper: true,
}
const schema = {
	title: 'Order',
	properties: {
		country: { type: 'string', title: 'Country', order: 1 },
		currency: { type: 'string', title: 'Currency', order: 2 },
		contact: { type: 'string', title: 'Contact', default: '@me.displayName', order: 3 },
		email: { type: 'string', title: 'E-mail', default: '@me.email', order: 4 },
	},
}
const overrides = {
	currency: { assign: [{ when: { field: 'country', op: 'eq', value: 'NL' }, value: 'EUR' }, { when: { field: 'country', op: 'eq', value: 'US' }, value: 'USD' }] },
}
const mountDialog = (props = {}) => mount(CnFormDialog, { props: { schema, fieldOverrides: overrides, feedback: false, ...props }, global: { stubs } })

describe('CnFormDialog live values', () => {
	it('fills the currency from the country and says so', async () => {
		const w = mountDialog()
		w.vm.updateField('country', 'NL')
		await flush()
		expect(w.vm.formData.currency).toBe('EUR')
		expect(w.get('[data-testid="cn-form-dialog-assigned"]').text()).toBe('Filled in from Country')
	})

	it('typing wins over the rule', async () => {
		const w = mountDialog()
		w.vm.updateField('country', 'NL')
		w.vm.updateField('currency', 'GBP')
		w.vm.updateField('country', 'US')
		await flush()
		expect(w.vm.formData.currency).toBe('GBP')
	})

	it('opens a new record with the signed-in user\'s name and e-mail', async () => {
		const w = mountDialog()
		await flush()
		await flush()
		expect(w.vm.formData.contact).toBe('Jan Jansen')
		expect(w.vm.formData.email).toBe('jan@example.nl')
	})

	it('never replaces stored data with a default when editing', async () => {
		const w = mountDialog({ item: { id: '1', country: 'NL', currency: 'EUR', contact: 'Stored', email: 'stored@x.nl' } })
		await flush()
		await flush()
		expect(w.vm.formData.contact).toBe('Stored')
		expect(w.vm.formData.email).toBe('stored@x.nl')
	})
})
