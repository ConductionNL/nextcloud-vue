/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PqProject "Taken in deze cyclus": a status column drawn as a badge through
 * an app formatter (`formatter: "enumLabel"`) printed the stored code
 * ("inProgress", "closed") because the column took no enum labels from the
 * schema once it named a formatter, so the formatter had none to read.
 *
 * @spec openspec/changes/formatter-column-takes-enum-labels/specs/object-list/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

const TASK_SCHEMA = {
	properties: {
		status: { type: 'string', enum: ['open', 'inProgress', 'closed'], 'x-enum-labels': { open: 'Not started', inProgress: 'In progress', closed: 'Done' } },
		title: { type: 'string', format: 'text' },
	},
}

function columnsFor(columns) {
	const w = shallowMount(CnObjectListWidget, {
		propsData: { content: { register: 'r', schema: 'programmeTask', columns } },
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
	w.vm.rows = []
	w.vm.createSchema = TASK_SCHEMA
	return w.vm.resolvedColumns
}

describe('a formatter column and the schema enum labels', () => {
	it('takes the schema enum and its labels for its formatter', () => {
		const [col] = columnsFor([{ key: 'status', widget: 'badge', formatter: 'enumLabel' }])
		expect(col.enum).toEqual(['open', 'inProgress', 'closed'])
		expect(col.enumLabels).toEqual({ open: 'Not started', inProgress: 'In progress', closed: 'Done' })
		expect(col.format).toBeUndefined()
	})

	it('keeps an enum the column states itself', () => {
		const [col] = columnsFor([{ key: 'status', formatter: 'enumLabel', enum: ['open'], enumLabels: { open: 'Open' } }])
		expect(col.enumLabels).toEqual({ open: 'Open' })
	})

	it('leaves a widget column without a formatter as it was', () => {
		const [col] = columnsFor([{ key: 'status', widget: 'badge' }])
		expect(col.enum).toBeUndefined()
	})
})
