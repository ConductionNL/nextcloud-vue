/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A table column (`template`) and a detail page header (`titleTemplate`) can
 * read a line built from the record's fields, in the host's translation:
 * boards PqKassadiensten and PqKassadienst name a cash shift "Dienst 6 okt,
 * Balie 3" from when it opened and its drawer, so the name is right on any day.
 */
jest.mock('@nextcloud/l10n', () => {
	const actual = jest.requireActual('@nextcloud/l10n')
	return { ...actual, getLanguage: () => 'nl', getCanonicalLocale: () => 'nl-NL' }
})

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default
const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const NL = { 'Shift {floatAt|date}, {drawer}': 'Dienst {floatAt|date}, {drawer}' }
const translate = (key) => NL[key] || key
const shift = { id: '1', reference: 'SHIFT-2025-1006-03', floatAt: '2025-10-06T09:00:00', drawer: 'Balie 3' }

describe('CnDataTable: a column template', () => {
	function cells(rows, column) {
		const wrapper = mount(CnDataTable, {
			propsData: { rows, columns: [column], rowKey: 'id' },
			global: { provide: { cnTranslate: translate } },
			stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
		})
		return wrapper.findAll('.cell').map((w) => w.text())
	}

	it('fills the template from the row, translated', () => {
		expect(cells([shift], { key: 'reference', label: 'Shift', template: 'Shift {floatAt|date}, {drawer}' })).toEqual(['Dienst 6 okt 2025, Balie 3'])
	})

	it('shows the field itself without a template (control)', () => {
		expect(cells([shift], { key: 'reference', label: 'Shift' })).toEqual(['SHIFT-2025-1006-03'])
	})
})

describe('CnDetailPage: titleTemplate', () => {
	function page(object, extra = {}) {
		return mount(CnDetailPage, {
			propsData: {
				title: 'Shift',
				register: 'reg',
				schema: 'cashShift',
				objectId: '1',
				objectStore: {
					objects: { 'reg-cashShift': { 1: object } },
					schemas: {},
					objectTypeRegistry: {},
					registerObjectType: jest.fn(),
					fetchObject: jest.fn(async () => null),
					fetchSchema: jest.fn(async () => null),
				},
				...extra,
			},
			global: { provide: { cnTranslate: translate } },
		})
	}

	it('names the record by the filled template, translated', () => {
		expect(page(shift, { titleTemplate: 'Shift {floatAt|date}, {drawer}' }).vm.displayTitle).toBe('Dienst 6 okt 2025, Balie 3')
	})

	it('falls back to titleField when a field of the template is empty', () => {
		const w = page({ ...shift, drawer: '' }, { titleTemplate: 'Shift {floatAt|date}, {drawer}', titleField: 'reference' })
		expect(w.vm.displayTitle).toBe('SHIFT-2025-1006-03')
	})
})
