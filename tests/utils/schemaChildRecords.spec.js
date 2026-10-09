/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-child-records-table/tasks.md#task-1
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

const lines = { type: 'array', items: { $ref: 'order-line' }, inversedBy: 'order' }

describe('child-records widget from the schema', () => {
	it('maps an array of references with inversedBy to child-records', () => {
		const [field] = fieldsFromSchema({ properties: { lines } })
		expect(field.widget).toBe('child-records')
		expect(field.childRecords).toEqual({ schema: 'order-line', parentField: 'order', columns: [] })
	})

	it('keeps the picker without inversedBy', () => {
		const [field] = fieldsFromSchema({ properties: { lines: { type: 'array', items: { $ref: 'order-line' } } } })
		expect(field.widget).toBe('multiselect')
		expect(field.childRecords).toBeNull()
	})

	it('lets an explicit widget win', () => {
		const [field] = fieldsFromSchema({ properties: { lines: { ...lines, widget: 'multiselect' } } })
		expect(field.widget).toBe('multiselect')
	})

	it('accepts the widget named with its own schema, parentField and columns', () => {
		const [field] = fieldsFromSchema({ properties: { lines: { type: 'array', widget: 'child-records', schema: 'line', parentField: 'order', columns: ['qty'] } } })
		expect(field.childRecords).toEqual({ schema: 'line', parentField: 'order', columns: ['qty'] })
	})
})
