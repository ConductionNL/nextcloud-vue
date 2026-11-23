/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `columns[].secondary` placeholder may carry a format (`{startAt|weekday}`),
 * filled by `fillTemplate` as a widget row template is, so an agenda column
 * reads "ma 7 okt 2024" under its time instead of the raw ISO string.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-table-column-carries-a-secondary-line
 */
jest.mock('@nextcloud/l10n', () => {
	const actual = jest.requireActual('@nextcloud/l10n')
	const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (match, key) => (vars && key in vars ? String(vars[key]) : match))
	return {
		...actual,
		getLanguage: () => 'nl',
		getCanonicalLocale: () => 'nl-NL',
		translate: (_app, s, vars) => fill(s, vars),
		translatePlural: (_app, one, many, count, vars) => fill(count === 1 ? one : many, { count, ...vars }).replace('%n', count),
	}
})

const { mount } = require('@vue/test-utils')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

function mountTable(rows, secondary) {
	return mount(CnDataTable, {
		propsData: { rows, columns: [{ key: 'subject', label: 'Appointment', secondary }], rowKey: 'id' },
		stubs: { CnCellRenderer: { props: ['value'], template: '<span class="cell">{{ value }}</span>' } },
	})
}

function secondaryLines(wrapper) {
	return wrapper.findAll('[data-testid="cn-cell-secondary"]').map((w) => w.text())
}

describe('CnDataTable — formatted secondary placeholders', () => {
	it('formats a weekday date instead of printing the ISO string', () => {
		const wrapper = mountTable([{ id: '1', subject: 'Intake', startAt: '2024-10-07T08:45:00' }], '{startAt|weekday}')
		expect(secondaryLines(wrapper)).toEqual(['ma 7 okt 2024'])
	})

	it('says "Today" for today on request and mixes formats with plain fields', () => {
		const start = new Date()
		start.setHours(8, 45, 0, 0)
		const wrapper = mountTable([{ id: '1', subject: 'Intake', startAt: start.toISOString(), room: 'B2' }], '{startAt|weekday:today} · {startAt|time} · {room}')
		const [line] = secondaryLines(wrapper)
		expect(line).toMatch(/^Today, \S+ \d+ \S+ · 08:45 · B2$/)
	})

	it('drops a formatted placeholder without a value together with its separator', () => {
		const wrapper = mountTable([{ id: '1', subject: 'Intake', startAt: null, room: 'B2' }], '{room} · {startAt|weekday}')
		expect(secondaryLines(wrapper)).toEqual(['B2'])
	})
})
