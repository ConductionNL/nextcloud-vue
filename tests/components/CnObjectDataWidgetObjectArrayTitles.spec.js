// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — the headers of an array-of-objects table read the
 * titles the schema gives the item properties, not their keys (a decision's
 * Alternatives showed "option" and "reasonRejected").
 */

import { mount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		alternatives: {
			type: 'array',
			title: 'Alternatives',
			items: {
				type: 'object',
				properties: {
					option: { type: 'string', title: 'Option' },
					reasonRejected: { type: 'string', title: 'Reason rejected' },
					note: { type: 'string' },
				},
			},
		},
	},
}

const objectData = {
	alternatives: [{ option: 'Keep the department systems', reasonRejected: 'Three times the licences.', note: 'n' }],
}

describe('CnObjectDataWidget array-of-objects headers', () => {
	it('uses the item property title, and the key where there is none', () => {
		const w = mount(CnObjectDataWidget, {
			propsData: { schema, objectData },
			mocks: { t: (app, s) => s },
			stubs: { NcButton: true, NcActions: true, NcActionButton: true, NcLoadingIcon: true },
		})
		const field = w.vm.resolvedFields.find((f) => f.key === 'alternatives')
		expect(w.vm.objectArrayColumns(objectData.alternatives).map((col) => w.vm.objectArrayColumnLabel(field, col)))
			.toEqual(['Option', 'Reason rejected', 'note'])
	})

	it('falls back to the key when the schema has no items', () => {
		const w = mount(CnObjectDataWidget, {
			propsData: { schema: { properties: { rows: { type: 'array' } } }, objectData: { rows: [{ a: 1 }] } },
			mocks: { t: (app, s) => s },
			stubs: { NcButton: true, NcActions: true, NcActionButton: true, NcLoadingIcon: true },
		})
		expect(w.vm.objectArrayColumnLabel({ key: 'rows' }, 'a')).toBe('a')
	})
})
