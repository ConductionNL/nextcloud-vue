/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-widgets-duration-and-subobject-table/tasks.md#task-1
 */
import { shallowMount } from '@vue/test-utils'
import CnDurationField from '../../src/components/CnDurationField/CnDurationField.vue'

function mountIt(modelValue) {
	return shallowMount(CnDurationField, { props: { modelValue, inputLabel: 'Handling term' } })
}

describe('CnDurationField', () => {
	it('shows days for P56D and writes P8W when changed to 8 weeks', async () => {
		const w = mountIt('P56D')
		expect(w.vm.amountText).toBe('56')
		expect(w.vm.unitOption.id).toBe('days')
		w.vm.onUnit({ id: 'weeks' })
		expect(w.emitted('update:modelValue').pop()).toEqual(['P56W'])
		await w.setProps({ modelValue: 'P56D' })
		w.vm.onAmount('8')
		expect(w.emitted('update:modelValue').pop()).toEqual(['P8D'])
	})

	it('round-trips each unit', () => {
		for (const [iso, unit] of [['PT30M', 'minutes'], ['PT4H', 'hours'], ['P2W', 'weeks'], ['P3M', 'months'], ['P1Y', 'years']]) {
			expect(mountIt(iso).vm.unitOption.id).toBe(unit)
		}
	})

	it('shows a mixed value as read-only ISO text, unchanged', () => {
		const w = mountIt('P1DT2H')
		expect(w.vm.rawMode).toBe(true)
		expect(w.vm.rawText).toBe('P1DT2H')
		expect(w.emitted('update:modelValue')).toBeUndefined()
	})

	it('writes null when the number is cleared', () => {
		const w = mountIt('PT4H')
		w.vm.onAmount('')
		expect(w.emitted('update:modelValue').pop()).toEqual([null])
	})

	it('labels the number input and the unit select', () => {
		const w = mountIt('P1D')
		expect(w.findComponent({ name: 'NcTextField' }).attributes('label')).toBe('Handling term')
		expect(w.findComponent({ name: 'NcSelect' }).attributes('inputlabel')).toBeTruthy()
	})
})
