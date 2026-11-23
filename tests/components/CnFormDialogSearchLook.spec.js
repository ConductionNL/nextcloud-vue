/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A single select field with `look: "search"` (through `fieldOverrides`)
 * renders CnSearchSelect, with a secondary line per option from the field's
 * `optionSecondary` template (DqOverdragen "Nieuw team").
 *
 * @spec openspec/changes/search-select-look/specs/search-select/spec.md#requirement-a-single-picker-can-take-the-search-look
 */
import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: { name: 'NcSelect', template: '<div class="nc-select-stub" />' },
	NcCheckboxRadioSwitch: true,
	CnSearchSelect: {
		name: 'CnSearchSelect',
		props: ['options', 'modelValue', 'inputLabel'],
		emits: ['update:modelValue', 'search'],
		template: '<div class="cn-search-select-stub" />',
	},
}

const TEAMS = [
	{ id: 'legal', label: 'Juridische zaken', members: 6, focus: 'bezwaar, beroep en Woo-advies' },
	{ id: 'vth', label: 'Vergunningen', members: 9, focus: '' },
]

/**
 * Mount a dialog with one team field.
 *
 * @param {object} extra Extra field keys.
 * @return {import('@vue/test-utils').VueWrapper} The dialog.
 */
function mountDialog(extra) {
	return mount(CnFormDialog, {
		props: {
			fields: [{ key: 'team', widget: 'select', label: 'New team', enum: TEAMS.map((t) => t.id), ...extra }],
			item: null,
		},
		global: { stubs },
	})
}

describe('CnFormDialog look: "search"', () => {
	it('renders CnSearchSelect instead of NcSelect', () => {
		const w = mountDialog({ look: 'search' })
		expect(w.findComponent({ name: 'CnSearchSelect' }).exists()).toBe(true)
		expect(w.find('.nc-select-stub').exists()).toBe(false)
	})

	it('keeps NcSelect without the look', () => {
		const w = mountDialog({})
		expect(w.findComponent({ name: 'CnSearchSelect' }).exists()).toBe(false)
		expect(w.find('.nc-select-stub').exists()).toBe(true)
	})

	it('fills the secondary line from optionSecondary and draws initials with optionAvatar', () => {
		const w = mountDialog({ look: 'search', optionSecondary: '{label} team', optionAvatar: true })
		const options = w.findComponent({ name: 'CnSearchSelect' }).props('options')
		expect(options[0]).toMatchObject({ id: 'legal', secondary: 'legal team', avatar: true })
	})

	it('stores the picked id', async () => {
		const w = mountDialog({ look: 'search' })
		w.findComponent({ name: 'CnSearchSelect' }).vm.$emit('update:modelValue', 'vth')
		expect(w.vm.formData.team).toBe('vth')
		w.findComponent({ name: 'CnSearchSelect' }).vm.$emit('update:modelValue', null)
		expect(w.vm.formData.team ?? null).toBeNull()
	})
})
