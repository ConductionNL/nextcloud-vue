/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A list row's subtitle token can read through a host formatter: the team
 * queue writes the status by its name and the priority as a word
 * (DqTeamwachtrij "2026-0076 · Ontvangen · prioriteit hoog").
 *
 * @spec openspec/changes/object-row-subtitle-formatters/specs/object-row/spec.md#requirement-a-list-rows-subtitle-token-can-read-through-a-formatter
 */

const { shallowMount } = require('@vue/test-utils')
const CnObjectRow = require('../../src/components/CnObjectRow/CnObjectRow.vue').default

const object = { id: 'c-1', title: 'Afvalinzameling Oosthaven 2025', identifier: '2026-0076', status: 'st-1', priority: 'high' }
const cnFormatters = {
	statusTypeName: (value) => (value === 'st-1' ? 'Ontvangen' : ''),
	priorityPhrase: (value, row) => (value && row.id === 'c-1' ? `prioriteit ${value === 'high' ? 'hoog' : value}` : ''),
	nothing: () => '',
}

/**
 * @param {string} template The subtitle template.
 * @return {string} The subtitle drawn.
 */
function subtitleOf(template) {
	const row = shallowMount(CnObjectRow, { propsData: { object, config: { subtitleTemplate: template } }, global: { provide: { cnFormatters } } })
	return row.vm.subtitle
}

describe('CnObjectRow subtitle formatters', () => {
	it('reads a token through the named formatter, with the row', () => {
		expect(subtitleOf('{identifier} · {status|statusTypeName} · {priority|priorityPhrase}')).toBe('2026-0076 · Ontvangen · prioriteit hoog')
	})

	it('drops a part the formatter answers empty, with its separator', () => {
		expect(subtitleOf('{identifier} · {status|nothing} · {priority|priorityPhrase}')).toBe('2026-0076 · prioriteit hoog')
	})

	it('leaves the raw value for an unknown formatter and a plain token', () => {
		expect(subtitleOf('{identifier} · {priority|unknown}')).toBe('2026-0076 · high')
		expect(subtitleOf('{identifier} · {priority}')).toBe('2026-0076 · high')
	})
})
