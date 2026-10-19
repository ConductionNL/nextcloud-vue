/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record layout of a board card (DqAanMijToegewezen): a head pill and the
 * number, the title, a meta line, and a footer with a pill and a date, every
 * part from a configured field. Without the look, or without a layout, the
 * card is as before.
 *
 * @spec openspec/changes/board-record-card-layout/specs/board-record-card-layout/spec.md#requirement-a-board-card-can-draw-the-record-layout-from-config
 */
import { mount } from '@vue/test-utils'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const schema = { title: 'Case', configuration: { objectNameField: 'title', objectDescriptionField: 'description' }, properties: { title: {}, description: {} } }
const object = {
	id: 'c1',
	title: 'Melding geluidsoverlast terras Markt',
	description: 'Lange omschrijving',
	identifier: '2026-0066',
	urgency: 'late',
	caseTypeName: 'Melding',
	assignee: { displayName: 'B. Smit' },
	statusName: 'In behandeling',
	deadline: '2026-10-05',
}
const layout = {
	headPill: { field: 'urgency', colorMap: { LATE: 'error' }, labels: { late: 'Te laat' } },
	number: 'identifier',
	meta: ['caseTypeName', 'assignee', 'missing'],
	footerPill: { field: 'statusName', colorMap: { 'in behandeling': 'purple' } },
	footerDate: { field: 'deadline', label: 'Termijn' },
}

function mountCard(props = {}, look = 'board') {
	return mount(CnObjectCard, {
		props: { object, schema, ...props },
		global: { provide: { cnLook: look } },
	})
}

describe('CnObjectCard record layout (board look)', () => {
	it('draws the head pill with its label and variant, and the number', () => {
		const card = mountCard({ layout })
		const pill = card.find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.text()).toBe('Te laat')
		expect(pill.classes()).toContain('cn-status-badge--error')
		expect(card.find('[data-testid="cn-object-card-number"]').text()).toBe('2026-0066')
	})

	it('draws the title and the meta line from the fields that hold a value', () => {
		const card = mountCard({ layout })
		expect(card.find('.cn-object-card__title').text()).toContain('Melding geluidsoverlast terras Markt')
		expect(card.find('[data-testid="cn-object-card-meta"]').text()).toBe('Melding · B. Smit')
		expect(card.text()).not.toContain('Lange omschrijving')
	})

	it('draws the footer pill and the labelled date', () => {
		const card = mountCard({ layout })
		const pill = card.find('[data-testid="cn-object-card-foot-pill"]')
		expect(pill.text()).toBe('In behandeling')
		expect(pill.classes()).toContain('cn-status-badge--purple')
		expect(card.find('[data-testid="cn-object-card-date"]').text()).toMatch(/^Termijn \S.*\b5\b/)
	})

	it('leaves a part out while its field is empty', () => {
		const card = mountCard({ layout, object: { ...object, urgency: '', deadline: null } })
		expect(card.find('[data-testid="cn-object-card-head-pill"]').exists()).toBe(false)
		expect(card.find('[data-testid="cn-object-card-date"]').exists()).toBe(false)
		expect(card.find('[data-testid="cn-object-card-foot-pill"]').exists()).toBe(true)
	})

	it('falls back to the default variant for a value the map does not name', () => {
		const card = mountCard({ layout, object: { ...object, statusName: 'Besluit' } })
		expect(card.find('[data-testid="cn-object-card-foot-pill"]').classes()).toContain('cn-status-badge--default')
	})

	it('keeps the card as before without the look or without a layout', () => {
		expect(mountCard({ layout }, 'nextcloud').find('[data-testid="cn-object-card-record"]').exists()).toBe(false)
		expect(mountCard({}, 'board').find('[data-testid="cn-object-card-record"]').exists()).toBe(false)
	})
})
