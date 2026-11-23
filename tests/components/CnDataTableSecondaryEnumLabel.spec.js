/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A secondary line names an enum field by its label, in the user's language,
 * as an enum cell does (screens-secondary-enum-label).
 *
 * @spec openspec/changes/screens-secondary-enum-label/specs/data-table/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const SCHEMA = {
	properties: {
		governanceBody: { type: 'string' },
		meetingType: { type: 'string', enum: ['regular', 'extra'], 'x-enum-labels': { regular: 'Regular meeting', extra: 'Extra meeting' } },
		meetingMode: { type: 'string', enum: ['in-person', 'online'] },
		code: { type: 'string' },
	},
}

const ROWS = [
	{ id: '1', governanceBody: 'Gemeenteraad', meetingType: 'regular', meetingMode: 'in-person', code: 'regular' },
	{ id: '2', governanceBody: 'Commissie', meetingType: null, meetingMode: 'online', code: '' },
]

const NL = { 'Regular meeting': 'Gewone vergadering', 'in-person': 'Op locatie' }

function mountTable(columns, { schema = SCHEMA, translate = true } = {}) {
	return mount(CnDataTable, {
		propsData: { rows: ROWS, columns, rowKey: 'id', schema },
		global: translate ? { provide: { cnTranslate: (key) => NL[key] || key } } : {},
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

const lines = (wrapper) => wrapper.findAll('[data-testid="cn-cell-secondary"]').map((w) => w.text())

describe('CnDataTable — secondary line of an enum field', () => {
	it('shows the translated label of a bare enum key', () => {
		const wrapper = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: 'meetingType' }])
		expect(lines(wrapper)).toEqual(['Gewone vergadering'])
	})

	it('translates an enum value without a label, as an enum cell does', () => {
		const wrapper = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: 'meetingMode' }])
		expect(lines(wrapper)).toEqual(['Op locatie', 'online'])
	})

	it('fills a template with labels', () => {
		const wrapper = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: '{meetingType} · {meetingMode}' }])
		expect(lines(wrapper)).toEqual(['Gewone vergadering · Op locatie', 'online'])
	})

	it('keeps a field that is not an enum as its stored value', () => {
		const wrapper = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: 'code' }])
		expect(lines(wrapper)).toEqual(['regular'])
	})

	it('shows the English label without a translation, and the stored value without a schema', () => {
		const english = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: 'meetingType' }], { translate: false })
		expect(lines(english)).toEqual(['Regular meeting'])
		const bare = mountTable([{ key: 'governanceBody', label: 'Orgaan', secondary: 'meetingType' }], { schema: null })
		expect(lines(bare)).toEqual(['regular'])
	})
})
