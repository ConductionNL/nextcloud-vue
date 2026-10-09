/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * writeDotted never walks into Object.prototype (CodeQL
 * js/prototype-pollution-utility).
 */
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

function run(key, value, formData = {}) {
	const updateField = jest.fn()
	CnFormDialog.methods.writeDotted.call({ formData, updateField }, key, value)
	return updateField
}

describe('CnFormDialog writeDotted', () => {
	afterEach(() => {
		delete Object.prototype.polluted
	})

	it('writes a dotted key into a copy of the parent property', () => {
		const fn = run('address.city', 'Utrecht', { address: { street: 'X' } })
		expect(fn).toHaveBeenCalledWith('address', { street: 'X', city: 'Utrecht' })
	})

	it.each([
		['__proto__.polluted'],
		['constructor.prototype.polluted'],
		['a.__proto__.polluted'],
		['a.constructor.prototype.polluted'],
		['prototype.polluted'],
	])('refuses %s and leaves Object.prototype alone', (key) => {
		const fn = run(key, 'yes', { a: {} })
		expect(fn).not.toHaveBeenCalled()
		expect({}.polluted).toBeUndefined()
	})
})
