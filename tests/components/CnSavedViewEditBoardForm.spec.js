/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The saved-view edit dialog in the board look draws the form as DqFilterBewerken
 * does: "Naam" as a label above its field, and the criteria as two choice cards
 * that each say what the view would hold (the saved criteria, or the list's
 * current search, filters and sort). The Nextcloud look keeps its form.
 *
 * @spec openspec/changes/saved-view-edit-board-form/specs/saved-views/spec.md
 */
import { mount } from '@vue/test-utils'
import CnChoiceCards from '../../src/components/CnChoiceCards/CnChoiceCards.vue'
import CnSavedViewEditDialog from '../../src/components/CnSavedViewEditDialog/CnSavedViewEditDialog.vue'
import { viewCriteriaSummary } from '../../src/utils/savedViewSummary.js'

const VIEW = { id: 'v1', name: 'Wacht op inwoner', owner: 'pieter', query: {}, sharedWith: [] }
const STUBS = { CnDialog: { name: 'CnDialog', props: ['look', 'name'], template: '<div class="cn-dialog-stub"><slot /><slot name="actions" /></div>' } }

function mountDialog(look) {
	return mount(CnSavedViewEditDialog, {
		props: { view: VIEW, savedSummary: 'Status: wacht op inwoner.', currentSummary: 'Zoekterm "parkeer".' },
		global: { provide: { cnLook: look }, stubs: STUBS },
	})
}

describe('CnSavedViewEditDialog board form', () => {
	it('labels the name above its field', () => {
		const w = mountDialog('board')
		const label = w.find('label.cn-edit-view__label')
		expect(label.exists()).toBe(true)
		expect(label.text()).toBe('Name')
		const field = w.find('[data-testid="cn-saved-view-edit-name"]')
		expect(label.attributes('for')).toBeTruthy()
		expect(field.attributes('labeloutside')).toBe('true')
	})

	it('offers the criteria as choice cards with what each keeps', async () => {
		const w = mountDialog('board')
		const cards = w.findComponent(CnChoiceCards)
		expect(cards.exists()).toBe(true)
		expect(cards.props('layout')).toBe('rows')
		expect(cards.props('options')).toEqual([
			{ value: 'keep', label: 'Keep what is saved', description: 'Status: wacht op inwoner.' },
			{ value: 'replace', label: 'Replace with the current search term, filters and sort', description: 'Zoekterm "parkeer".' },
		])
		expect(cards.props('modelValue')).toBe('keep')
		cards.vm.$emit('update:modelValue', 'replace')
		await w.vm.$nextTick()
		expect(w.vm.replaceCriteria).toBe(true)
	})

	it('keeps the Nextcloud form in the Nextcloud look', () => {
		const w = mountDialog('nextcloud')
		expect(w.findComponent(CnChoiceCards).exists()).toBe(false)
		expect(w.find('label.cn-edit-view__label').exists()).toBe(false)
		expect(w.find('[data-testid="cn-saved-view-edit-keep"]').exists()).toBe(true)
	})
})

describe('viewCriteriaSummary', () => {
	const properties = { status: { title: 'Status' }, deadline: { title: 'Deadline' } }

	it('says the filters, the search and the sort as sentences', () => {
		expect(viewCriteriaSummary({ filters: { status: ['waiting'] }, search: 'parkeer', sortKeys: [{ key: 'deadline', order: 'desc' }] }, { properties }))
			.toBe('Status waiting, "parkeer". Sorted by deadline, descending.')
	})

	it('reads a single sort key and says nothing for an empty state', () => {
		expect(viewCriteriaSummary({ filters: {}, search: '', sortKey: 'deadline', sortOrder: 'asc' }, { properties })).toBe('Sorted by deadline, ascending.')
		expect(viewCriteriaSummary({ filters: {}, search: '' }, { properties })).toBe('')
	})
})
