/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-1
 * @spec openspec/changes/form-live-values/tasks.md#task-2
 */
import { flush, mountForm } from '../support/formPageHarness.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn().mockResolvedValue({ data: { ocs: { data: { displayname: 'Jan Jansen', email: 'jan@example.nl' } } } }), post: jest.fn() },
}))
jest.mock('@nextcloud/auth', () => ({ getCurrentUser: () => ({ uid: 'jan', displayName: 'Jan Jansen' }) }))

const fields = [
	{ key: 'country', type: 'string', label: 'Country' },
	{
		key: 'currency',
		type: 'string',
		label: 'Currency',
		assign: [
			{ when: { field: 'country', op: 'eq', value: 'NL' }, value: 'EUR' },
			{ when: { field: 'country', op: 'eq', value: 'BE' }, value: 'EUR' },
			{ when: { field: 'country', op: 'eq', value: 'US' }, value: 'USD' },
		],
	},
]

describe('CnFormPage assign rules', () => {
	it('the currency follows the country and says where it came from', async () => {
		const w = mountForm({ fields })
		w.vm.updateField('country', 'NL')
		await flush()
		expect(w.vm.formData.currency).toBe('EUR')
		expect(w.get('[data-testid="cn-form-page-assigned"]').text()).toBe('Filled in from Country')
	})

	it('typing wins: a hand-edited field keeps its value when the country changes', async () => {
		const w = mountForm({ fields })
		w.vm.updateField('country', 'NL')
		w.vm.updateField('currency', 'USD')
		w.vm.updateField('country', 'BE')
		await flush()
		expect(w.vm.formData.currency).toBe('USD')
		expect(w.find('[data-testid="cn-form-page-assigned"]').exists()).toBe(false)
	})

	it('a reset (new initial value) lets the rules fill in again', async () => {
		const w = mountForm({ fields })
		w.vm.updateField('currency', 'USD')
		await w.setProps({ initialValue: { country: 'BE' } })
		await flush()
		expect(w.vm.formData.currency).toBe('EUR')
	})

	it('fills an empty field on open, but never overwrites stored data', async () => {
		const empty = mountForm({ fields, initialValue: { country: 'US' } })
		await flush()
		expect(empty.vm.formData.currency).toBe('USD')
		expect(empty.vm.dirty).toBe(false)

		const stored = mountForm({ fields, initialValue: { country: 'US', currency: 'GBP' } })
		await flush()
		expect(stored.vm.formData.currency).toBe('GBP')
	})

	it('emits input for an assigned field', async () => {
		const w = mountForm({ fields })
		w.vm.updateField('country', 'NL')
		await flush()
		expect(w.emitted('input')).toContainEqual([{ key: 'currency', value: 'EUR' }])
	})
})

describe('CnFormPage token defaults', () => {
	const withDefaults = [
		{ key: 'name', type: 'string', label: 'Name', default: '@me.displayName' },
		{ key: 'email', type: 'string', label: 'E-mail', default: '@me.email' },
		{ key: 'when', type: 'string', label: 'When', default: '@today' },
		{ key: 'ref', type: 'string', label: 'Ref', default: '@object.title' },
	]

	it('resolves the name at open and the e-mail from the profile', async () => {
		const w = mountForm({ fields: withDefaults, initialValue: { title: 'Case 7' } })
		expect(w.vm.formData.name).toBe('Jan Jansen')
		expect(w.vm.formData.ref).toBe('Case 7')
		expect(w.vm.formData.when).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		await flush()
		await flush()
		expect(w.vm.formData.email).toBe('jan@example.nl')
		expect(w.vm.dirty).toBe(false)
	})

	it('initialValue wins over a default', async () => {
		const w = mountForm({ fields: withDefaults, initialValue: { name: 'Stored', email: 'stored@x.nl' } })
		await flush()
		await flush()
		expect(w.vm.formData.name).toBe('Stored')
		expect(w.vm.formData.email).toBe('stored@x.nl')
	})
})
