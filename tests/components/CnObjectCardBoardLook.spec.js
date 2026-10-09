/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record card under the board look: leading element, title, sub line,
 * status pill or row menu, a facts list from `cardFields`, one footer action,
 * and the card it was without the look.
 *
 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-a-record-card-has-a-head-facts-and-one-action
 */
import { mount } from '@vue/test-utils'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const schema = {
	title: 'Resident',
	configuration: { objectNameField: 'name', objectDescriptionField: 'address' },
	properties: {
		name: { title: 'Name' },
		address: { title: 'Address' },
		city: { title: 'City' },
		born: { title: 'Date of birth' },
		phone: { title: 'Phone' },
		mail: { title: 'E-mail' },
		notes: { title: 'Notes' },
	},
}
const object = { id: 1, name: 'Sanne de Vries', address: 'Parkstraat 24, Zuiddrecht', city: 'Zuiddrecht', born: '1990-01-01', phone: '06', mail: 's@x.nl', notes: 'n' }

function mountCard(props = {}, look = 'board', slots = {}) {
	return mount(CnObjectCard, {
		props: { object, schema, ...props },
		slots,
		global: { provide: { cnLook: look }, stubs: { NcButton: { template: '<button class="nc-button" v-bind="$attrs"><slot /></button>' } } },
	})
}

describe('CnObjectCard (board look)', () => {
	it('carries the board class only under the look', () => {
		expect(mountCard({}, 'board').classes()).toContain('cn-object-card--board')
		expect(mountCard({}, 'nextcloud').classes()).not.toContain('cn-object-card--board')
	})

	it('draws the head row: initials, the title and the sub line', () => {
		const w = mountCard({ leading: { initials: 'SV' } })
		expect(w.find('[data-testid="cn-object-card-leading"]').text()).toBe('SV')
		expect(w.find('.cn-object-card__title').text()).toBe('Sanne de Vries')
		expect(w.find('.cn-object-card__description').text()).toBe('Parkstraat 24, Zuiddrecht')
	})

	it('draws an icon leading element on a tint', () => {
		const w = mountCard({ leading: { icon: 'Folder' } })
		expect(w.find('.cn-object-card__leading').classes()).toContain('cn-object-card__leading--icon')
	})

	it('ends the head row in the status pill when there is one', () => {
		const w = mountCard({ status: { label: 'Open', variant: 'success' } }, 'board', { actions: '<button class="menu" />' })
		expect(w.find('[data-testid="cn-object-card-status"]').text()).toBe('Open')
		expect(w.find('.cn-object-card__menu').exists()).toBe(false)
	})

	it('ends the head row in the row menu without a status', () => {
		const w = mountCard({}, 'board', { actions: '<button class="menu" />' })
		expect(w.find('.cn-object-card__menu .menu').exists()).toBe(true)
		expect(w.find('.cn-object-card__actions').exists()).toBe(false)
	})

	it('lists the card fields in the order given, and never the title or sub line fields', () => {
		const w = mountCard({ cardFields: ['born', 'city', 'name', 'address'] })
		const labels = w.findAll('.cn-object-card__meta-label').map((l) => l.text())
		expect(labels).toEqual(['Date of birth', 'City'])
		expect(w.find('.cn-object-card__metadata').classes()).toContain('cn-object-card__metadata--facts')
	})

	it('defaults the facts to the first four visible properties', () => {
		const w = mountCard()
		expect(w.findAll('.cn-object-card__meta-label')).toHaveLength(4)
	})

	it('still lets the metadata slot replace the facts list', () => {
		const w = mountCard({ cardFields: ['city'] }, 'board', { metadata: '<p class="custom">own facts</p>' })
		expect(w.find('.custom').exists()).toBe(true)
		expect(w.find('.cn-object-card__meta-label').exists()).toBe(false)
	})

	it('ends in a footer with meta text and one named action, and emits it', async () => {
		const w = mountCard({ footerAction: { label: 'Open', meta: '3 open cases' } })
		expect(w.find('.cn-object-card__footer-meta').text()).toBe('3 open cases')
		const button = w.find('[data-testid="cn-object-card-footer-action"]')
		expect(button.attributes('aria-label')).toBe('Open Sanne de Vries')
		await button.trigger('click')
		expect(w.emitted('footer-action')[0][0]).toEqual(object)
	})

	it('renders the checkbox only in selection mode', () => {
		expect(mountCard({}, 'board').find('.cn-object-card__checkbox').exists()).toBe(false)
		expect(mountCard({ selectable: true }, 'board').find('.cn-object-card__checkbox').exists()).toBe(true)
	})

	it('draws none of the board parts without the look', () => {
		const w = mountCard({ leading: { initials: 'SV' }, status: 'Open', footerAction: { label: 'Open' } }, 'nextcloud', { actions: '<button class="menu" />' })
		expect(w.find('[data-testid="cn-object-card-leading"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-object-card-status"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-object-card-footer"]').exists()).toBe(false)
		expect(w.find('.cn-object-card__actions .menu').exists()).toBe(true)
	})
})
