/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnConditionGroupEditor (condition-group-editor).
 *
 * Guarded: every group opens with the "How the conditions combine" radio pair;
 * rows read "Where", then "and" or "or"; a row holding an inner group shows the
 * caption "all of these" or "one of these"; Add group shows only above
 * `maxDepth`; an inner group carries a written Remove group; a deeper tree
 * still renders every level; a NOT group is a locked row; the host's operators
 * by field type are offered; an error shows on the row its path names; a
 * stored value that is not a group reads as one AND group.
 */
jest.mock('@nextcloud/l10n', () => {
	const nl = require('../../l10n/nl.json').translations
	const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m))
	return {
		translate: (app, text, vars) => fill(app === 'nextcloud-vue' && nl[text] ? nl[text] : text, vars),
		translatePlural: (app, one, other, n, vars) => fill(n === 1 ? one : other, { count: n, ...vars }),
		getLanguage: () => 'nl',
		getLocale: () => 'nl_NL',
		getCanonicalLocale: () => 'nl-NL',
	}
})

import { mount } from '@vue/test-utils'
import CnConditionGroupEditor from '../../src/components/CnConditionGroupEditor/CnConditionGroupEditor.vue'

const FIELDS = [
	{ value: 'place', label: 'Plaats', type: 'string' },
	{ value: 'industry', label: 'Branche', type: 'string' },
	{ value: 'employees', label: 'Medewerkers', type: 'integer' },
	{ value: 'lastContact', label: 'Laatste contact', type: 'string', format: 'date' },
	{ value: 'active', label: 'Actief', type: 'boolean' },
]

const OPERATORS = {
	string: [{ value: 'equals', label: 'Is gelijk aan' }, { value: 'contains', label: 'Bevat' }],
	integer: [{ value: 'equals', label: 'Is gelijk aan' }, { value: 'greaterThan', label: 'Groter dan' }],
	boolean: [{ value: 'equals', label: 'Is' }],
}

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'ariaLabelCombobox', 'disabled'],
	emits: ['update:modelValue'],
	template: '<div class="nc-select" :data-label="inputLabel || ariaLabelCombobox" />',
}
const NcTextField = {
	name: 'NcTextField',
	props: ['modelValue', 'label', 'type'],
	emits: ['update:modelValue'],
	template: '<input class="nc-text" :type="type" />',
}
const NcButton = {
	name: 'NcButton',
	emits: ['click'],
	template: '<button class="nc-button" @click="$emit(\'click\')"><slot /></button>',
}
const NcCheckboxRadioSwitch = {
	name: 'NcCheckboxRadioSwitch',
	props: ['modelValue', 'value', 'type', 'name'],
	emits: ['update:modelValue'],
	template: '<label class="nc-radio" :data-checked="String(modelValue === value)"><slot /></label>',
}

const BOARD_TREE = {
	type: 'AND',
	children: [
		{ field: 'place', operator: 'equals', value: 'Zuiddrecht' },
		{
			type: 'OR',
			children: [
				{ field: 'industry', operator: 'equals', value: 'horeca' },
				{ field: 'industry', operator: 'equals', value: 'detailhandel' },
			],
		},
		{ field: 'lastContact', operator: 'after', value: '2025-10-07' },
	],
}

/**
 * Mount the editor.
 *
 * @param {object} modelValue The group tree.
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function editor(modelValue = { type: 'AND', children: [] }, props = {}) {
	return mount(CnConditionGroupEditor, {
		props: { modelValue, fields: FIELDS, operators: OPERATORS, ...props },
		global: {
			stubs: {
				NcSelect,
				NcTextField,
				NcButton,
				NcCheckboxRadioSwitch,
				Plus: true,
				TrashCanOutline: true,
				FolderPlusOutline: true,
				Lock: true,
			},
		},
	})
}

/**
 * The buttons whose text is `text`.
 *
 * @param {object} w The wrapper, or a part of it.
 * @param {string} text The button text.
 * @return {Array} The buttons.
 */
function buttons(w, text) {
	return w.findAll('button').filter((b) => b.text() === text)
}

/**
 * The last tree the editor emitted.
 *
 * @param {object} w The wrapper.
 * @return {object} The tree.
 */
function last(w) {
	return w.emitted('update:modelValue').at(-1)[0]
}

/**
 * The connector words of a group's own rows, in order.
 *
 * @param {object} group The group wrapper.
 * @return {string[]} The words.
 */
function connectors(group) {
	return group.findAll(':scope > .cn-condition-group__rows > li > .cn-condition-group__line > .cn-condition-group__connector')
		.map((c) => c.text())
}

describe('CnConditionGroupEditor', () => {
	it('opens the root group with the combinator radio pair, AND chosen', () => {
		const w = editor(BOARD_TREE)
		const root = w.find('.cn-condition-group')
		const legend = root.find('legend')
		expect(legend.text()).toBe('Hoe de voorwaarden samengaan')

		const radios = root.find('fieldset').findAllComponents(NcCheckboxRadioSwitch)
		expect(radios.map((r) => r.text())).toEqual(['Voldoet aan alle voorwaarden', 'Voldoet aan een van de voorwaarden'])
		expect(radios.map((r) => r.props('value'))).toEqual(['AND', 'OR'])
		expect(radios[0].props('modelValue')).toBe('AND')
		expect(radios[0].props('name')).toBe(radios[1].props('name'))
	})

	it('reads the board: Where and and on the root, the caption, Where and or inside', () => {
		const w = editor(BOARD_TREE)
		const root = w.find('.cn-condition-group')
		expect(connectors(root)).toEqual(['Waarbij', 'en', 'en'])
		expect(root.find('.cn-condition-group__caption').text()).toBe('een van deze')

		const inner = root.find('.cn-condition-group--nested')
		expect(connectors(inner)).toEqual(['Waarbij', 'of'])
		expect(inner.find('fieldset').findAllComponents(NcCheckboxRadioSwitch)[1].props('modelValue')).toBe('OR')
	})

	it('captions an AND inner group "all of these"', () => {
		const w = editor({ type: 'AND', children: [{ type: 'AND', children: [{ field: 'place', operator: 'equals', value: 'x' }] }] })
		expect(w.find('.cn-condition-group__caption').text()).toBe('al deze')
	})

	it('offers Add group on the root only, and a written Remove group inside', () => {
		const w = editor(BOARD_TREE)
		expect(buttons(w, 'Groep toevoegen')).toHaveLength(1)
		expect(buttons(w, 'Voorwaarde toevoegen')).toHaveLength(2)

		const inner = w.find('.cn-condition-group--nested')
		expect(buttons(inner, 'Groep toevoegen')).toHaveLength(0)
		expect(buttons(inner, 'Groep verwijderen')).toHaveLength(1)
		expect(buttons(w, 'Groep verwijderen')).toHaveLength(1)
	})

	it('adds a condition and an indented group with one empty condition', async () => {
		const w = editor({ type: 'AND', children: [{ field: 'place', operator: 'equals', value: 'Zuiddrecht' }] })
		await buttons(w, 'Groep toevoegen')[0].trigger('click')
		expect(last(w)).toEqual({
			type: 'AND',
			children: [
				{ field: 'place', operator: 'equals', value: 'Zuiddrecht' },
				{ type: 'AND', children: [{ field: '', operator: '', value: '' }] },
			],
		})
		expect(w.emitted('input').at(-1)[0]).toEqual(last(w))
		expect(w.find('.cn-condition-group--nested').exists()).toBe(true)

		await buttons(w.find('.cn-condition-group--nested'), 'Voorwaarde toevoegen')[0].trigger('click')
		expect(last(w).children[1].children).toHaveLength(2)
	})

	it('switches a group between AND and OR', async () => {
		const w = editor(BOARD_TREE)
		const inner = w.find('.cn-condition-group--nested')
		inner.find('fieldset').findAllComponents(NcCheckboxRadioSwitch)[0].vm.$emit('update:modelValue', 'AND')
		await w.vm.$nextTick()
		expect(last(w).children[1].type).toBe('AND')
		expect(w.find('.cn-condition-group__caption').text()).toBe('al deze')
	})

	it('removes a condition, then the group', async () => {
		const w = editor(BOARD_TREE)
		const inner = () => w.find('.cn-condition-group--nested')
		await inner().findAll('[aria-label="Voorwaarde verwijderen"]')[1].trigger('click')
		expect(last(w).children[1].children).toEqual([{ field: 'industry', operator: 'equals', value: 'horeca' }])

		await buttons(inner(), 'Groep verwijderen')[0].trigger('click')
		expect(last(w)).toEqual({
			type: 'AND',
			children: [
				{ field: 'place', operator: 'equals', value: 'Zuiddrecht' },
				{ field: 'lastContact', operator: 'after', value: '2025-10-07' },
			],
		})
		expect(w.find('.cn-condition-group--nested').exists()).toBe(false)
	})

	it('offers Add group one level down when maxDepth is 2', () => {
		const w = editor(BOARD_TREE, { maxDepth: 2 })
		expect(buttons(w.find('.cn-condition-group--nested'), 'Groep toevoegen')).toHaveLength(1)
	})

	it('renders a deeper tree in full, with Add group on the root only', () => {
		const w = editor({
			type: 'AND',
			children: [{
				type: 'OR',
				children: [{
					type: 'AND',
					children: [{ field: 'place', operator: 'equals', value: 'Zuiddrecht' }],
				}],
			}],
		})
		expect(w.findAll('.cn-condition-group--nested')).toHaveLength(2)
		expect(buttons(w, 'Groep toevoegen')).toHaveLength(1)
		expect(buttons(w, 'Groep verwijderen')).toHaveLength(2)
	})

	it('shows a NOT group as a locked row that can be removed', async () => {
		const w = editor({
			type: 'AND',
			children: [
				{ field: 'place', operator: 'equals', value: 'Zuiddrecht' },
				{ type: 'NOT', children: [{ field: 'industry', operator: 'equals', value: 'horeca' }] },
			],
		})
		const locked = w.find('.cn-condition-group__locked')
		expect(locked.text()).toContain('Deze voorwaarden blijven zoals ze zijn geschreven')
		expect(w.findAll('.cn-condition-group--nested')).toHaveLength(0)
		expect(w.findAllComponents(NcSelect).length).toBe(2)

		await locked.find('[aria-label="Groep verwijderen"]').trigger('click')
		expect(last(w).children).toEqual([{ field: 'place', operator: 'equals', value: 'Zuiddrecht' }])
	})

	it('offers the host operators for the field type and resets the row on a new field', async () => {
		const w = editor({ type: 'AND', children: [{ field: '', operator: '', value: '' }] })
		const select = (label) => w.findAllComponents(NcSelect).find((s) => s.props('ariaLabelCombobox') === label)
		expect(select('Veld').props('options').map((o) => o.label)).toEqual(['Plaats', 'Branche', 'Medewerkers', 'Laatste contact', 'Actief'])

		select('Veld').vm.$emit('update:modelValue', { id: 'employees', label: 'Medewerkers' })
		await w.vm.$nextTick()
		expect(last(w).children[0]).toEqual({ field: 'employees', operator: 'equals', value: '' })
		expect(select('Voorwaarde').props('options').map((o) => o.id)).toEqual(['equals', 'greaterThan'])

		w.findComponent(NcTextField).vm.$emit('update:modelValue', '12')
		await w.vm.$nextTick()
		expect(last(w).children[0].value).toBe(12)
		expect(w.findComponent(NcTextField).props('type')).toBe('number')
	})

	it('takes operators as a function of the field', () => {
		const operators = (field) => (field?.format === 'date' ? [{ value: 'after', label: 'Na' }] : [{ value: 'equals', label: 'Is gelijk aan' }])
		const w = editor({ type: 'AND', children: [{ field: 'lastContact', operator: 'after', value: '2025-10-07' }] }, { operators })
		const select = w.findAllComponents(NcSelect).find((s) => s.props('ariaLabelCombobox') === 'Voorwaarde')
		expect(select.props('options')).toEqual([{ id: 'after', label: 'Na' }])
		expect(w.findComponent(NcTextField).props('type')).toBe('date')
	})

	it('keeps a stored field and operator the lists do not offer', () => {
		const w = editor({ type: 'AND', children: [{ field: 'legacy', operator: 'startsWith', value: 'a' }] })
		const select = (label) => w.findAllComponents(NcSelect).find((s) => s.props('ariaLabelCombobox') === label)
		expect(select('Veld').props('modelValue')).toEqual({ id: 'legacy', label: 'legacy' })
		expect(select('Voorwaarde').props('modelValue')).toEqual({ id: 'startsWith', label: 'startsWith' })
	})

	it('shows an error on the row its path names', () => {
		const w = editor(BOARD_TREE, { errors: { '$.children[1].children[0]': 'Field is not declared.' } })
		const inner = w.find('.cn-condition-group--nested')
		expect(inner.find('[role="alert"]').text()).toBe('Field is not declared.')
		expect(w.findAll('[role="alert"]')).toHaveLength(1)
	})

	it('reads a bare condition as one AND group', () => {
		const w = editor({ field: 'place', operator: 'equals', value: 'Zuiddrecht' })
		const root = w.find('.cn-condition-group')
		expect(connectors(root)).toEqual(['Waarbij'])
		expect(root.find('fieldset').findAllComponents(NcCheckboxRadioSwitch)[0].props('modelValue')).toBe('AND')
	})

	it('says so when the root has no conditions', () => {
		const w = editor({ type: 'AND', children: [] }, { emptyText: 'Nothing yet' })
		expect(w.find('.cn-condition-group__empty').text()).toBe('Nothing yet')
	})

	it('takes a tree the parent replaces', async () => {
		const w = editor({ type: 'AND', children: [] })
		await w.setProps({ modelValue: BOARD_TREE })
		expect(w.findAll('.cn-condition-group--nested')).toHaveLength(1)
	})
})
