/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-options-from-concept-scheme/tasks.md#task-1
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

function field(prop) {
	return fieldsFromSchema({ properties: { p: prop } })[0]
}

describe('coded fields from a concept-scheme binding', () => {
	it('tags the simple spelling as a select', () => {
		const f = field({ type: 'string', conceptScheme: 'woo-categorieen' })
		expect(f.widget).toBe('select')
		expect(f.codeList).toEqual({ property: 'p', multiple: false, store: 'uri', contextProperty: null })
	})

	it('tags the annotation on array items as a multiselect with store and context', () => {
		const f = field({ type: 'array', items: { 'x-openregister-concepts': { scheme: 'https://example.org/thema', store: 'notation', contextProperty: 'zaaktype' } } })
		expect(f.widget).toBe('multiselect')
		expect(f.codeList).toEqual({ property: 'p', multiple: true, store: 'notation', contextProperty: 'zaaktype' })
	})

	it('leaves an unbound property untouched', () => {
		const f = field({ type: 'string' })
		expect(f.codeList).toBeNull()
		expect(f.widget).toBe('text')
	})
})
