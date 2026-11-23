/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/app-diagnostics-channel/tasks.md#task-4
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { addDiagnosticsListener, clearReportedDiagnostics } from '../../src/utils/diagnostics.js'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const schema = { slug: 'permit', title: 'Permit', properties: { title: { type: 'string' }, status: { type: 'string' } } }

describe('CnIndexPage binding diagnostics', () => {
	let remove
	let fn
	beforeEach(() => {
		fn = jest.fn()
		remove = addDiagnosticsListener(fn)
	})
	afterEach(() => {
		remove()
		clearReportedDiagnostics()
	})

	it('reports a column whose property the schema lacks, once', async () => {
		const w = shallowMount(CnIndexPage, {
			props: {
				schema,
				register: 'permits',
				columns: ['title', { key: 'kvkNumber' }, '@self.created', { key: 'n', aggregate: { fn: 'count' } }],
				includeFields: ['title', 'removed'],
				objects: [],
			},
		})
		await tick()
		w.vm.$options.watch.effectiveSchema.handler.call(w.vm, schema)
		await tick()
		const reports = fn.mock.calls.map((c) => c[0])
		expect(reports.filter((r) => r.property === 'kvkNumber')).toHaveLength(1)
		expect(reports).toContainEqual(expect.objectContaining({ kind: 'binding', problem: 'missing-property', register: 'permits', schema: 'permit', property: 'kvkNumber', where: 'column' }))
		expect(reports).toContainEqual(expect.objectContaining({ property: 'removed', where: 'field' }))
		expect(reports.some((r) => r.property === '@self.created' || r.property === 'n')).toBe(false)
	})
})
