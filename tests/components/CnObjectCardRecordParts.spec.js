/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The board card's record layout parts that Assigned to me needs back: a
 * description line cut at a length, chips read through a formatter, and the
 * footer date in the error tone once it has passed.
 *
 * @spec openspec/changes/saved-view-overrides/specs/saved-views-ui/spec.md#requirement-a-board-card-can-draw-a-description-chips-and-an-overdue-date
 */
import { mount } from '@vue/test-utils'
import CnObjectCard from '../../src/components/CnObjectCard/CnObjectCard.vue'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const schema = { title: 'Case', properties: { title: {} } }
const object = {
	id: 'c1',
	title: 'Melding geluidsoverlast',
	description: 'Een buurtbewoner meldt dat het terras aan de Markt elke avond tot na middernacht muziek draait, ook doordeweeks.',
	caseType: 'ct-1',
	status: 'st-2',
	deadline: '2020-01-01',
	later: '2999-01-01',
}
const formatters = {
	caseTypeName: (v) => ({ 'ct-1': 'Melding' })[v] || v,
	statusTypeName: (v) => ({ 'st-2': 'In behandeling' })[v] || v,
}

function mountCard(layout) {
	return mount(CnObjectCard, {
		props: { object, schema, layout },
		global: { provide: { cnLook: 'board', cnFormatters: formatters } },
	})
}

describe('the card description', () => {
	it('draws the field cut at maxLength with an ellipsis', () => {
		const w = mountCard({ title: 'title', description: { field: 'description', maxLength: 20 } })
		expect(w.get('[data-testid="cn-object-card-description"]').text()).toBe('Een buurtbewoner mel…')
	})

	it('cuts at 140 by default, and takes a bare field name', () => {
		const w = mountCard({ description: 'description' })
		expect(w.vm.recordDescription).toBe(object.description)
		expect(mountCard({ description: 'missing' }).find('[data-testid="cn-object-card-description"]').exists()).toBe(false)
	})
})

describe('the card chips', () => {
	it('reads each chip through its formatter and colours it', () => {
		const w = mountCard({ chips: [{ field: 'caseType', formatter: 'caseTypeName' }, { field: 'status', formatter: 'statusTypeName', colorMap: { 'st-2': 'purple' } }, 'missing'] })
		expect(w.vm.recordChips).toEqual([
			{ field: 'caseType', label: 'Melding', variant: 'default' },
			{ field: 'status', label: 'In behandeling', variant: 'purple' },
		])
		expect(w.findAll('[data-testid="cn-object-card-chips"] .cn-object-card__record-pill')).toHaveLength(2)
	})
})

describe('the footer date tone', () => {
	it('is the overdueVariant once the date has passed, and none before', () => {
		const late = mountCard({ footerDate: { field: 'deadline', label: 'Deadline', overdueVariant: 'error' } })
		expect(late.get('[data-testid="cn-object-card-date"]').classes()).toContain('cn-object-card__record-date--error')
		expect(mountCard({ footerDate: { field: 'later', overdueVariant: 'error' } }).vm.recordDateTone).toBe('')
		expect(mountCard({ footerDate: { field: 'deadline' } }).vm.recordDateTone).toBe('')
	})
})

describe('the schema', () => {
	const page = (cardLayout) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', config: { register: 'r', schema: 's', cardLayout } }],
	})

	it('accepts description, chips and overdueVariant, and refuses a malformed chip', () => {
		expect(validateManifestV2(page({ description: { field: 'description', maxLength: 140 }, chips: ['identifier', { field: 'status', formatter: 'statusTypeName' }], footerDate: { field: 'deadline', label: 'Deadline', overdueVariant: 'error' } })).valid).toBe(true)
		expect(validateManifestV2(page({ chips: [{ formatter: 'x' }] })).valid).toBe(false)
	})
})
