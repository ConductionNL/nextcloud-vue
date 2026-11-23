/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The card grid track under the board look: `minmax(var(--cn-card-grid-min,
 * 260px), 1fr)` with `var(--cn-card-grid-gap, 16px)`, and 320px without it.
 *
 * @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-card-grid-takes-the-board-track
 */
import { mount } from '@vue/test-utils'
import CnCardGrid from '../../src/components/CnCardGrid/CnCardGrid.vue'
import CnIntegrationWidgetGrid from '../../src/components/CnIntegrationWidgetGrid/CnIntegrationWidgetGrid.vue'

jest.mock('../../src/composables/useIntegrationRegistry.js', () => ({
	useIntegrationRegistry: () => ({
		integrations: [{ id: 'a', label: 'A', defaultSize: { w: 2 } }],
		resolveWidget: () => ({ template: '<div class="w" />' }),
	}),
}))

const schema = { title: 'Resident', properties: { title: { title: 'Name' }, city: { title: 'City' } } }
const objects = [{ id: 1, title: 'Sanne', city: 'Zuiddrecht' }, { id: 2, title: 'Pieter', city: 'Zuiddrecht' }]

function mountGrid(look, props = {}) {
	return mount(CnCardGrid, {
		props: { objects, schema, ...props },
		global: { provide: { cnLook: look }, stubs: { CnObjectCard: { props: ['cardFields', 'status', 'leading', 'footerAction'], template: '<div class="card" :data-fields="JSON.stringify(cardFields)" :data-status="JSON.stringify(status)" />' } } },
	})
}

describe('CnCardGrid (board look)', () => {
	it('takes the board track with the theme tokens', () => {
		const style = mountGrid('board').find('.cn-card-grid__grid').attributes('style')
		expect(style).toContain('minmax(var(--cn-card-grid-min, 260px), 1fr)')
		expect(style).toContain('var(--cn-card-grid-gap, 16px)')
	})

	it('keeps the 320px track without the look', () => {
		const grid = mountGrid('nextcloud').find('.cn-card-grid__grid')
		expect(grid.attributes('style')).toBeUndefined()
		expect(grid.classes()).not.toContain('cn-card-grid__grid--board')
	})

	it('hands the card fields and the per-object status on to each card', () => {
		const w = mountGrid('board', { cardFields: ['city'], statusOf: (o) => (o.id === 1 ? 'Open' : null) })
		const cards = w.findAll('.card')
		expect(cards[0].attributes('data-fields')).toBe('["city"]')
		expect(cards[0].attributes('data-status')).toBe('"Open"')
		expect(cards[1].attributes('data-status')).toBe('null')
	})
})

describe('CnIntegrationWidgetGrid (board look)', () => {
	it('uses the board track and one column per card', () => {
		const w = mount(CnIntegrationWidgetGrid, { props: { surface: 'app-dashboard' }, global: { provide: { cnLook: 'board' } } })
		expect(w.find('.cn-integration-widget-grid__grid').attributes('style')).toContain('minmax(var(--cn-card-grid-min, 260px), 1fr)')
		expect(w.find('.cn-integration-widget-grid__cell').attributes('style')).toContain('grid-column: auto')
	})

	it('keeps the column count without the look', () => {
		const w = mount(CnIntegrationWidgetGrid, { props: { surface: 'app-dashboard' }, global: { provide: { cnLook: 'nextcloud' } } })
		expect(w.find('.cn-integration-widget-grid__grid').attributes('style')).toContain('--cn-iwg-columns')
		expect(w.find('.cn-integration-widget-grid__cell').attributes('style')).toContain('span 2')
	})
})
