/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRecordListWidget `presentation: "table"` shaped by the rows: a tree of
 * departments indented by depth, a column the reader sorts, a cell drawn as a
 * toned label (never green unless a second field allows it), rows taken from
 * a list inside each record, and the first cell as the row's link.
 *
 * @spec openspec/changes/record-list-table-shape/specs/record-list-table-shape/spec.md#requirement-a-record-list-table-takes-its-shape-from-the-rows
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => '/nc' + url }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const stubs = {
	CnStatusBadge: { props: ['label', 'variant'], template: '<span class="badge" :data-variant="variant">{{ label }}</span>' },
	RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}

function serve(payload) {
	mockGet.mockReset()
	mockGet.mockResolvedValue({ data: payload })
	invalidateEndpointSourceCache()
}

function mountTable(content) {
	return mount(CnRecordListWidget, {
		props: { content: { presentation: 'table', limit: 50, ...content } },
		global: { stubs, mocks: { $router: { push: jest.fn() } } },
	})
}

function cellTexts(w) {
	return w.findAll('tbody tr').map((row) => row.findAll('td').map((td) => td.text()))
}

describe('CnRecordListWidget table shaped by the rows', () => {
	it('indents the first cell by the row depth', async () => {
		serve({ rows: [{ name: 'School', depth: 0 }, { name: 'Science', depth: 1 }, { name: 'Physics', depth: 2 }] })
		const w = mountTable({
			endpointSource: { url: '/apps/x/api/departments', responsePath: 'rows' },
			indentPath: 'depth',
			columns: [{ label: 'Department', value: '{name}' }],
		})
		await flush()
		const cells = w.findAll('tbody tr').map((row) => row.find('td'))
		expect(cells[0].attributes('style') || '').not.toContain('padding-inline-start')
		expect(cells[1].attributes('style')).toContain('padding-inline-start: calc(1 * 16px')
		expect(cells[2].attributes('style')).toContain('padding-inline-start: calc(2 * 16px')
	})

	it('sorts by a sortable column, numbers as numbers, and says so to assistive technology', async () => {
		serve({ rows: [{ name: 'B', pct: 9 }, { name: 'A', pct: 80 }, { name: 'C', pct: 10 }] })
		const w = mountTable({
			endpointSource: { url: '/apps/x/api/coverage', responsePath: 'rows' },
			columns: [{ label: 'Regulation', value: '{name}' }, { label: 'Coverage', value: '{pct}', sortable: true }],
		})
		await flush()
		const header = w.findAll('th')[1]
		expect(header.attributes('aria-sort')).toBe('none')
		await header.find('button').trigger('click')
		expect(cellTexts(w).map((r) => r[1])).toEqual(['9', '10', '80'])
		expect(header.attributes('aria-sort')).toBe('ascending')
		await header.find('button').trigger('click')
		expect(cellTexts(w).map((r) => r[1])).toEqual(['80', '10', '9'])
		expect(header.attributes('aria-sort')).toBe('descending')
		expect(w.findAll('th')[0].find('button').exists()).toBe(false)
	})

	it('draws a toned cell as a label, and a second field can hold the tone back', async () => {
		serve({
			features: [
				{ name: 'Summaries', verdict: 'compliant', verified: true },
				{ name: 'Feedback', verdict: 'compliant', verified: false },
				{ name: 'Translation', verdict: 'violates', verified: true },
			],
		})
		const w = mountTable({
			endpointSource: { url: '/apps/x/api/disclosure', responsePath: 'features' },
			columns: [
				{ label: 'Feature', value: '{name}' },
				{
					label: 'Verdict',
					value: '{verdict}',
					tone: {
						map: { compliant: 'success', violates: 'error' },
						default: 'default',
						override: { when: { field: 'verified', op: 'neq', value: true }, tone: 'warning' },
					},
				},
			],
		})
		await flush()
		const badges = w.findAll('tbody .badge')
		expect(badges.map((b) => b.attributes('data-variant'))).toEqual(['success', 'warning', 'error'])
		expect(badges.map((b) => b.text())).toEqual(['compliant', 'compliant', 'violates'])
	})

	it('takes its rows from a list inside each record, the record at @parent', async () => {
		serve({
			results: [
				{ course: 'Biology', answers: [{ textValue: 'More practicals' }, { textValue: 'Clear slides' }] },
				{ course: 'History', answers: [{ textValue: 'Too fast' }] },
				{ course: 'Maths' },
			],
		})
		const w = mountTable({
			endpointSource: { url: '/apps/x/api/responses', responsePath: 'results' },
			flattenPath: 'answers',
			columns: [{ label: 'Answer', value: '{textValue}' }, { label: 'Course', value: '{@parent.course}' }],
		})
		await flush()
		expect(cellTexts(w)).toEqual([['More practicals', 'Biology'], ['Clear slides', 'Biology'], ['Too fast', 'History']])
	})

	it('links the first cell to the row route', async () => {
		serve({ rows: [{ id: 'reg-1', name: 'GDPR' }] })
		const w = mountTable({
			endpointSource: { url: '/apps/x/api/coverage', responsePath: 'rows' },
			rowRoute: 'RegulationDetail',
			columns: [{ label: 'Regulation', value: '{name}' }],
		})
		await flush()
		const link = w.find('tbody td a')
		expect(link.text()).toBe('GDPR')
		expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'RegulationDetail', params: { id: 'reg-1' } })
	})
})
