/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `{map|values}` in a template: the values of a key-value map in one line,
 * as PqProduct writes a variant's attributes ("Huishouden · grijze en blauwe containers").
 *
 * @spec openspec/changes/template-object-values/specs/record-list-table/spec.md#requirement-a-template-can-write-the-values-of-a-map
 */
import { fillTemplate } from '../../src/utils/fillTemplate.js'

describe('fillTemplate values', () => {
	it('writes the values of a map in their order, joined by a middle dot', () => {
		const row = { attributes: { voor: 'Huishouden', containers: 'grijze en blauwe containers' } }
		expect(fillTemplate('{attributes|values}', row)).toBe('Huishouden · grijze en blauwe containers')
	})

	it('writes the entries of a list and numbers as text', () => {
		expect(fillTemplate('{sizes|values}', { sizes: ['S', 'M', 4] })).toBe('S · M · 4')
	})

	it('leaves out empty values and nested maps', () => {
		expect(fillTemplate('{a|values}', { a: { x: 'Bezoeker', y: '', z: null, n: { deep: 1 }, g: '14 dagen' } })).toBe('Bezoeker · 14 dagen')
	})

	it('empties the template when nothing is left', () => {
		expect(fillTemplate('Kenmerken: {a|values}', { a: {} })).toBe('')
		expect(fillTemplate('Kenmerken: {a|values}', {})).toBe('')
		expect(fillTemplate('Kenmerken: {a|values}', { a: 'plain' })).toBe('Kenmerken: plain')
	})
})
