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

describe('CnObjectRow note', () => {
	const rowWith = (object, config) => shallowMount(CnObjectRow, { propsData: { object, config } })

	it('draws the note under the subtitle, in the error tone the row names', () => {
		const note = rowWith({ title: 'A', routingNote: { text: 'Refused', level: 'error' } }, { noteTemplate: '{routingNote.text}', noteToneField: 'routingNote.level' })
			.find('[data-testid="cn-object-row-note"]')
		expect(note.text()).toBe('Refused')
		expect(note.classes()).toContain('cn-object-row__note--error')
	})

	it('keeps the plain tone for any other level', () => {
		const note = rowWith({ title: 'A', routingNote: { text: 'Split', level: 'info' } }, { noteTemplate: '{routingNote.text}', noteToneField: 'routingNote.level' })
			.find('[data-testid="cn-object-row-note"]')
		expect(note.classes()).not.toContain('cn-object-row__note--error')
	})

	it('draws nothing while the note is empty', () => {
		const row = rowWith({ title: 'A' }, { noteTemplate: '{routingNote.text}' })
		expect(row.find('[data-testid="cn-object-row-note"]').exists()).toBe(false)
	})
})

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
