/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-field-property-source/tasks.md#task-3
 */
import { getDotted, isEmptyFillTarget, planPropertySourceFill, readSourcePath } from '../../src/utils/propertySourceFill.js'

const resolved = {
	naam: 'Eneco Energie B.V.',
	handelsnamen: [{ naam: 'Eneco' }],
	_embedded: { hoofdvestiging: { adressen: [{ plaats: 'Rotterdam' }] } },
}

describe('readSourcePath', () => {
	it('reads dots and [n] indexes', () => {
		expect(readSourcePath(resolved, 'naam')).toBe('Eneco Energie B.V.')
		expect(readSourcePath(resolved, 'handelsnamen[0].naam')).toBe('Eneco')
		expect(readSourcePath(resolved, '_embedded.hoofdvestiging.adressen[0].plaats')).toBe('Rotterdam')
	})
	it('treats =x as a literal and a missing path as undefined', () => {
		expect(readSourcePath(resolved, '=NL')).toBe('NL')
		expect(readSourcePath(resolved, 'nope.deeper')).toBeUndefined()
		expect(readSourcePath(resolved, 'handelsnamen[3].naam')).toBeUndefined()
	})
})

describe('isEmptyFillTarget', () => {
	it.each([[undefined], [null], [''], [[]]])('%p is empty', (v) => expect(isEmptyFillTarget(v)).toBe(true))
	it.each([['x'], [0], [false], [['a']]])('%p is not empty', (v) => expect(isEmptyFillTarget(v)).toBe(false))
})

describe('planPropertySourceFill', () => {
	const fill = { name: 'naam', tradingName: 'handelsnamen[0].naam', 'address.city': '_embedded.hoofdvestiging.adressen[0].plaats', 'address.country': '=NL', ghost: 'missing' }

	it('fills empty targets and lists differing filled ones', () => {
		const plan = planPropertySourceFill(fill, resolved, { name: 'Eneco', address: { city: '' } })
		expect(plan.apply.map((a) => a.key)).toEqual(['tradingName', 'address.city', 'address.country'])
		expect(plan.conflicts).toEqual([{ key: 'name', oldValue: 'Eneco', newValue: 'Eneco Energie B.V.' }])
	})
	it('does not list a filled target that already equals the new value', () => {
		const plan = planPropertySourceFill({ name: 'naam' }, resolved, { name: 'Eneco Energie B.V.' })
		expect(plan).toEqual({ apply: [], conflicts: [] })
	})
	it('ignores targets that are not fields of the form', () => {
		const spy = jest.spyOn(console, 'debug').mockImplementation(() => {})
		const plan = planPropertySourceFill({ other: 'naam' }, resolved, {}, () => false)
		expect(plan.apply).toEqual([])
		expect(spy).toHaveBeenCalled()
		spy.mockRestore()
	})
	it('reads dotted keys from form data', () => {
		expect(getDotted({ address: { city: 'X' } }, 'address.city')).toBe('X')
	})
})
