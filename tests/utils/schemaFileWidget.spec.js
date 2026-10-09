/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-file-and-camera-fields/tasks.md#task-1
 */
import { fieldsFromSchema } from '../../src/utils/schema.js'

const byKey = (fields, key) => fields.find((f) => f.key === key)

describe('fieldsFromSchema file properties', () => {
	const schema = {
		properties: {
			signedCopy: { type: 'file', title: 'Signed copy', allowedTypes: ['application/pdf'], maxSize: 5242880 },
			photos: { type: 'array', title: 'Photos', items: { type: 'file', allowedTypes: ['image/jpeg', 'image/png'] } },
			title: { type: 'string', title: 'Title' },
		},
	}

	it('maps a file property to the file widget with accept and maxSize from the property', () => {
		const f = byKey(fieldsFromSchema(schema), 'signedCopy')
		expect(f.widget).toBe('file')
		expect(f.file).toEqual({ accept: 'application/pdf', maxSize: 5242880, multiple: false, capture: '' })
	})

	it('maps an array of files to the file widget taking several files', () => {
		const f = byKey(fieldsFromSchema(schema), 'photos')
		expect(f.widget).toBe('file')
		expect(f.file).toMatchObject({ accept: 'image/jpeg,image/png', multiple: true })
	})

	it('carries a capture hint and ignores an unknown one', () => {
		const fields = fieldsFromSchema({ properties: { a: { type: 'file', capture: 'environment' }, b: { type: 'file', capture: 'sideways' } } })
		expect(byKey(fields, 'a').file.capture).toBe('environment')
		expect(byKey(fields, 'b').file.capture).toBe('')
	})

	it('leaves other properties without file settings', () => {
		const f = byKey(fieldsFromSchema(schema), 'title')
		expect(f.widget).not.toBe('file')
		expect(f.file).toBeUndefined()
	})
})
