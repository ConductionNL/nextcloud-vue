/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record layout's `note` is a toned line under the meta line: the cover
 * line "Voor Anouk Bakker, tot 10 okt" on the DqAanMijToegewezen cards.
 *
 * @spec openspec/changes/card-layout-note/specs/card-layout-note/spec.md#requirement-a-record-card-can-draw-a-toned-note-under-its-meta-line
 */
import { mount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const schema = { title: 'Case', configuration: { objectNameField: 'title' }, properties: { title: {}, caseType: {} } }
const object = { id: 'c1', title: 'Aanbesteding jeugdzorg 2026', caseType: 'ct-1', initiatorDisplayName: 'Stichting Kindzorg', coveredFor: { name: 'Anouk Bakker', until: '2026-10-10' } }
const formatters = {
	caseTypeName: () => 'Woo-verzoek',
	coveredFor: (value) => (value && value.name ? `Voor ${value.name}, tot 10 okt` : ''),
}
const NOTE = { field: 'coveredFor', formatter: 'coveredFor', tone: 'purple' }

/**
 * @param {object} layout The card layout.
 * @param {object} [extra] Object overrides.
 * @return {object} The wrapper.
 */
function mountCard(layout, extra = {}) {
	return mount(CnObjectCard, {
		props: { object: { ...object, ...extra }, schema, layout },
		global: { provide: { cnLook: 'board', cnFormatters: formatters, cnTranslate: (s) => s } },
	})
}

describe('CnObjectCard note', () => {
	it('draws the note through its formatter under the meta line', () => {
		const card = mountCard({ meta: [{ field: 'caseType', formatter: 'caseTypeName' }, 'initiatorDisplayName'], note: NOTE })
		const note = card.find('[data-testid="cn-object-card-meta"] + [data-testid="cn-object-card-note"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('Voor Anouk Bakker, tot 10 okt')
		expect(note.classes()).toContain('cn-object-card__record-note--purple')
	})

	it('leaves the line out while the field is empty', () => {
		const card = mountCard({ note: NOTE }, { coveredFor: null })
		expect(card.find('[data-testid="cn-object-card-note"]').exists()).toBe(false)
	})

	it('takes no tone class without a tone', () => {
		const card = mountCard({ note: { field: 'initiatorDisplayName' } })
		const note = card.find('[data-testid="cn-object-card-note"]')
		expect(note.text()).toBe('Stichting Kindzorg')
		expect(note.classes().filter((c) => c.startsWith('cn-object-card__record-note--'))).toEqual([])
	})

	it('is 13px semibold, in the tone\'s pill ink', () => {
		const css = fs.readFileSync(path.join(__dirname, '../../src/css/look-board-index.css'), 'utf8')
		expect(css).toMatch(/\.cn-object-card__record-note \{[^}]*font-size: 13px;[^}]*font-weight: 600;/)
		expect(css).toMatch(/\.cn-object-card__record-note--purple \{[^}]*color: var\(--cn-status-purple-text\);/)
		expect(css).toMatch(/\.cn-object-card__record-note--teal \{[^}]*color: var\(--cn-status-teal-text\);/)
	})
})
