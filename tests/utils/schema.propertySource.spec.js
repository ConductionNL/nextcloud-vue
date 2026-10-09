/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-field-property-source/tasks.md#task-1
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

function schema(decl) {
	return {
		properties: {
			kvkNumber: { type: 'string', title: 'KvK number', 'x-openregister-property-source': decl },
		},
	}
}

describe('fieldsFromSchema: x-openregister-property-source', () => {
	it('carries the declaration with defaults and picks the property-source widget', () => {
		const [f] = fieldsFromSchema(schema({ provider: 'kvk' }))
		expect(f.widget).toBe('property-source')
		expect(f.propertySource).toEqual({ provider: 'kvk', mode: 'live', config: {} })
	})
	it('keeps mode default and config', () => {
		const [f] = fieldsFromSchema(schema({ provider: 'kvk', mode: 'default', config: { fill: { name: 'naam' } } }))
		expect(f.propertySource).toEqual({ provider: 'kvk', mode: 'default', config: { fill: { name: 'naam' } } })
	})
	it('lets an override name another widget', () => {
		const [f] = fieldsFromSchema(schema({ provider: 'kvk' }), { overrides: { kvkNumber: { widget: 'text' } } })
		expect(f.widget).toBe('text')
	})
	it('leaves an undeclared property alone', () => {
		const [f] = fieldsFromSchema({ properties: { a: { type: 'string' } } })
		expect(f.propertySource).toBeNull()
		expect(f.widget).toBe('text')
	})
})
