/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A board card can draw one chip per entry of a list field (`chips: [{ field,
 * each }]`) and a meta part filled from a template (`{ template }`): board
 * PqPipelines draws each pipeline as a card with its stages as chips and
 * "6 fases" in the meta line.
 *
 * @spec openspec/changes/card-list-chips/specs/object-card/spec.md
 */
import { mount } from '@vue/test-utils'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const NL = { '{stages|count} stages': '{stages|count} fases', '{name} {probability}%': '{name} {probability}%' }
const pipeline = {
	id: 'p1',
	title: 'Verkoop',
	stages: [{ name: 'Nieuw', probability: 10 }, { name: 'Benaderd', probability: 30 }, { name: '' }],
}

/**
 * @param {object} layout The card layout.
 * @return {object} The wrapper.
 */
function mountCard(layout) {
	return mount(CnObjectCard, {
		props: { object: pipeline, schema: { title: 'Pipeline', properties: { title: {}, stages: {} } }, layout },
		global: { provide: { cnLook: 'board', cnTranslate: (s) => NL[s] || s } },
	})
}

describe('CnObjectCard list chips and template meta', () => {
	it('draws one chip per entry, by the entry field, leaving empty ones out', () => {
		const chips = mountCard({ title: 'title', chips: [{ field: 'stages', each: 'name' }] }).findAll('[data-testid="cn-object-card-chips"] .cn-object-card__record-pill')
		expect(chips.map((c) => c.text())).toEqual(['Nieuw', 'Benaderd'])
	})

	it('fills a chip from a template per entry', () => {
		const chips = mountCard({ title: 'title', chips: [{ field: 'stages', each: '{name} {probability}%' }] }).findAll('.cn-object-card__record-pill')
		expect(chips.map((c) => c.text())).toEqual(['Nieuw 10%', 'Benaderd 30%'])
	})

	it('fills a meta part from a translated template', () => {
		const card = mountCard({ title: 'title', meta: [{ template: '{stages|count} stages' }] })
		expect(card.find('[data-testid="cn-object-card-meta"]').text()).toBe('3 fases')
	})

	it('draws a plain field chip as before (control)', () => {
		const chips = mountCard({ title: 'title', chips: ['title'] }).findAll('.cn-object-card__record-pill')
		expect(chips.map((c) => c.text())).toEqual(['Verkoop'])
	})

	it('colours a list chip by the first tone whose condition its entry meets', () => {
		const tones = [
			{ when: { field: 'isWon', op: 'eq', value: true }, variant: 'success' },
			{ when: { field: 'isClosed', op: 'eq', value: true }, variant: 'error' },
			{ when: { field: 'isDefault', op: 'eq', value: true }, variant: 'primary' },
		]
		const card = mount(CnObjectCard, {
			props: {
				object: { id: 'p2', title: 'Verkoop', stages: [{ name: 'Nieuw', isDefault: true }, { name: 'Voorstel' }, { name: 'Gewonnen', isWon: true, isClosed: true }, { name: 'Verloren', isClosed: true }] },
				schema: { title: 'Pipeline', properties: { title: {}, stages: {} } },
				layout: { title: 'title', chips: [{ field: 'stages', each: 'name', tones }] },
			},
			global: { provide: { cnLook: 'board', cnTranslate: (s) => s } },
		})
		const variants = card.findAllComponents({ name: 'CnStatusBadge' }).map((b) => [b.props('label'), b.props('variant')])
		expect(variants).toEqual([['Nieuw', 'primary'], ['Voorstel', 'default'], ['Gewonnen', 'success'], ['Verloren', 'error']])
	})
})
