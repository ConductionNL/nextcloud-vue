import { describeSchema, detectOpenApiVersion, filterOperations, groupByTag, listOperations, resolveLocalRef } from '../../src/utils/openApiModel.js'
/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/openapi-reference-component/tasks.md#task-1
 */
import oas from '../fixtures/openapi/vergunningen.oas.json'

describe('openApiModel', () => {
	it('detects the version family', () => {
		expect(detectOpenApiVersion({ openapi: '3.0.3' })).toBe('3.0')
		expect(detectOpenApiVersion({ openapi: '3.1.0' })).toBe('3.1')
		expect(detectOpenApiVersion({ swagger: '2.0' })).toBe('swagger2')
		expect(detectOpenApiVersion({ foo: 1 })).toBe('unknown')
		expect(detectOpenApiVersion(null)).toBe('unknown')
	})

	it('groups calls by first tag with the untagged under Other', () => {
		const groups = groupByTag(listOperations(oas))
		expect(groups.map((g) => g.tag)).toEqual(['permit', 'applicant', 'Other'])
		expect(groups[0].operations.map((o) => o.method)).toEqual(['GET', 'POST', 'DELETE'])
	})

	it('filters by path, method and summary', () => {
		const ops = listOperations(oas)
		expect(filterOperations(ops, 'delete').map((o) => o.method)).toEqual(['DELETE'])
		expect(filterOperations(ops, 'applicants')).toHaveLength(1)
		expect(filterOperations(ops, '')).toHaveLength(ops.length)
	})

	it('resolves only #/ references', () => {
		expect(resolveLocalRef(oas, '#/components/schemas/applicant').value.type).toBe('object')
		expect(resolveLocalRef(oas, 'https://example.org/x.json#/a')).toEqual({ external: true, value: null })
		expect(resolveLocalRef(oas, '#/nope').value).toBeNull()
	})

	it('describes fields, rules, externals and cycles', () => {
		const node = describeSchema(oas, { $ref: '#/components/schemas/permit' })
		const byName = Object.fromEntries(node.fields.map((f) => [f.name, f]))
		expect(byName.title.required).toBe(true)
		expect(byName.title.node.rules).toEqual(['minLength 2', 'maxLength 80'])
		expect(byName.status.node.enumValues).toEqual(['open', 'granted'])
		expect(byName.applicant.node.fields[0].name).toBe('name')
		expect(byName.address.node.external).toBe(true)
		expect(byName.parent.node.cycle).toBe(true)
	})

	it('stops a self-referencing document', () => {
		const cyclic = { components: { schemas: { a: { type: 'object', properties: { b: { $ref: '#/components/schemas/b' } } }, b: { type: 'object', properties: { a: { $ref: '#/components/schemas/a' } } } } } }
		const node = describeSchema(cyclic, { $ref: '#/components/schemas/a' })
		expect(node.fields[0].node.fields[0].node.cycle).toBe(true)
	})
})
