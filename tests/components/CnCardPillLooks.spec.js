/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card's pill takes its tone and icon from the record it points at: the
 * record card's head, footer and chip pills (`cardLayout`) and the board
 * card's pill (`board.card`), each with `resolve`. CnIndexPage reads the looks
 * once and hands them down.
 *
 * @spec openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-card-pill-takes-its-tone-and-icon-from-the-referenced-record
 */
import { mount } from '@vue/test-utils'
import CnBoardView from '../../src/components/CnBoardView/CnBoardView.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'

const looks = { caseType: { 'ct-woo': { color: 'red', icon: 'FileDocumentOutline' } } }
const resolve = { colorField: 'colour', iconField: 'icon' }
const iconStub = { CnIcon: { props: ['name'], template: '<i class="icon-stub" :data-name="name" />' } }

describe('record card pills', () => {
	const schema = { title: 'Case', configuration: { objectNameField: 'title' }, properties: { title: {} } }
	const object = { id: 'c1', title: 'Fietspad', caseType: 'ct-woo', status: 'open' }
	const mountCard = (layout) => mount(CnObjectCard, {
		props: { object, schema, layout, pillLooks: looks },
		global: { provide: { cnLook: 'board' }, stubs: iconStub },
	})

	it('gives a head pill with resolve its record tone and icon', () => {
		const pill = mountCard({ headPill: { field: 'caseType', variant: 'info', resolve } }).find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.classes()).toContain('cn-status-badge--error')
		expect(pill.find('.icon-stub').attributes('data-name')).toBe('FileDocumentOutline')
	})

	it('does the same for a chip and the footer pill', () => {
		const card = mountCard({ chips: [{ field: 'caseType', resolve }], footerPill: { field: 'caseType', resolve } })
		expect(card.find('[data-testid="cn-object-card-chips"] .cn-status-badge').classes()).toContain('cn-status-badge--error')
		expect(card.find('[data-testid="cn-object-card-foot-pill"] .icon-stub').exists()).toBe(true)
	})

	it('leaves a pill without resolve as declared', () => {
		const pill = mountCard({ headPill: { field: 'caseType', variant: 'info' } }).find('[data-testid="cn-object-card-head-pill"]')
		expect(pill.classes()).toContain('cn-status-badge--info')
		expect(pill.find('.icon-stub').exists()).toBe(false)
	})
})

describe('board card pill', () => {
	const { pillVariant, pillIcon, pillLookOf, fieldText, textOf } = CnBoardView.methods
	const ctx = (cardRoles) => {
		const self = {
			cardRoles,
			pillLooks: looks,
			roles: { pill: cardRoles.pill, pillColors: cardRoles.pillColors || {}, formatters: {} },
			fieldText: (...a) => fieldText.call(self, ...a),
			textOf: (...a) => textOf.call(self, ...a),
			pillLookOf: (...a) => pillLookOf.call(self, ...a),
		}
		return self
	}

	it('takes the record tone and icon with resolve', () => {
		const self = ctx({ pill: 'caseType', resolve })
		expect(pillVariant.call(self, { caseType: 'ct-woo' })).toBe('error')
		expect(pillIcon.call(self, { caseType: 'ct-woo' })).toBe('FileDocumentOutline')
	})

	it('keeps pillColors without resolve', () => {
		const self = ctx({ pill: 'caseType', pillColors: { 'ct-woo': 'teal' } })
		expect(pillVariant.call(self, { caseType: 'ct-woo' })).toBe('teal')
		expect(pillIcon.call(self, { caseType: 'ct-woo' })).toBe('')
	})
})

describe('CnIndexPage reads the card pill looks', () => {
	it('names the board card pill and the record card pills that resolve', () => {
		const specs = CnIndexPage.computed.refLookSpecs.call({
			tableColumns: [],
			listConfig: null,
			board: { card: { pill: 'caseType', resolve } },
			cardLayout: { footerPill: { field: 'assignedTeam', resolve: { colorField: 'colour', register: 'dossiq', schema: 'team' } }, headPill: { field: 'status' } },
			effectiveSchema: { properties: { caseType: { type: 'string', $ref: 'caseType' } } },
			register: 'dossiq',
		})
		expect(specs).toEqual([
			{ key: 'caseType', register: 'dossiq', schema: 'caseType', colorField: 'colour', iconField: 'icon' },
			{ key: 'assignedTeam', register: 'dossiq', schema: 'team', colorField: 'colour', iconField: '' },
		])
	})
})
