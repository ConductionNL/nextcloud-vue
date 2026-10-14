/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/screens-switch-value-map/specs/switch-rows/spec.md#requirement-a-switch-can-read-and-write-a-value-map
 */
import { switchIsOn, switchStoredValue, switchValueMap } from '../../src/utils/switchValues.js'

describe('switchValues', () => {
	it('is a boolean switch without a map', () => {
		expect(switchValueMap(undefined)).toBeNull()
		expect(switchValueMap({ off: '0' })).toBeNull()
		expect(switchIsOn(true)).toBe(true)
		expect(switchIsOn('1')).toBe(false)
		expect(switchStoredValue(true)).toBe(true)
		expect(switchStoredValue(false)).toBe(false)
	})

	it('reads and writes the mapped values, comparing as text', () => {
		const values = { on: '1', off: '0' }
		expect(switchIsOn('1', values)).toBe(true)
		expect(switchIsOn(1, values)).toBe(true)
		expect(switchIsOn('0', values)).toBe(false)
		expect(switchIsOn(null, values)).toBe(false)
		expect(switchStoredValue(true, values)).toBe('1')
		expect(switchStoredValue(false, values)).toBe('0')
		expect(switchStoredValue(false, { on: 'yes' })).toBeNull()
	})
})
