/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-live-values/tasks.md#task-3
 */
import { mountForm } from '../support/formPageHarness.js'

const fields = [
	{ key: 'size', type: 'string', label: 'Size' },
	{ key: 'type', type: 'string', label: 'Type' },
	{ key: 'fee', type: 'string', label: 'Fee', calculate: { inputs: ['size', 'type'] } },
]

describe('CnFormPage calculate', () => {
	beforeEach(() => {
		jest.useFakeTimers()
	})
	afterEach(() => {
		jest.useRealTimers()
	})

	it('calls the host after 400 ms of quiet and writes the answer into the field', async () => {
		const calculate = jest.fn().mockResolvedValue('120.00')
		const w = mountForm({ fields, calculate })
		w.vm.updateField('size', '50')
		jest.advanceTimersByTime(300)
		w.vm.updateField('size', '120')
		jest.advanceTimersByTime(300)
		expect(calculate).not.toHaveBeenCalled()
		jest.advanceTimersByTime(150)
		await Promise.resolve()
		await Promise.resolve()
		expect(calculate).toHaveBeenCalledTimes(1)
		expect(calculate).toHaveBeenCalledWith('fee', expect.objectContaining({ size: '120' }))
		expect(w.vm.formData.fee).toBe('120.00')
	})

	it('does not call it for an answer the field does not read', () => {
		const calculate = jest.fn().mockResolvedValue('x')
		const w = mountForm({ fields: [...fields, { key: 'note', type: 'string', label: 'Note' }], calculate })
		w.vm.updateField('note', 'hi')
		jest.advanceTimersByTime(1000)
		expect(calculate).not.toHaveBeenCalled()
	})

	it('renders the calculated field read-only', () => {
		const w = mountForm({ fields, calculate: jest.fn() })
		const inputs = w.findAll('.nc-textfield-stub')
		expect(inputs[2].attributes('readonly')).toBeDefined()
		expect(inputs[0].attributes('readonly')).toBeUndefined()
	})

	it('a rejection keeps the last value and says it could not calculate', async () => {
		const calculate = jest.fn().mockResolvedValueOnce('10.00').mockRejectedValueOnce(new Error('rule engine down'))
		const w = mountForm({ fields, calculate })
		w.vm.updateField('size', '1')
		jest.advanceTimersByTime(400)
		await Promise.resolve()
		await Promise.resolve()
		expect(w.vm.formData.fee).toBe('10.00')
		w.vm.updateField('size', '2')
		jest.advanceTimersByTime(400)
		await Promise.resolve()
		await Promise.resolve()
		await w.vm.$nextTick()
		expect(w.vm.formData.fee).toBe('10.00')
		expect(w.get('[data-testid="cn-form-page-calc-error"]').text()).toBe('Could not calculate')
	})
})
