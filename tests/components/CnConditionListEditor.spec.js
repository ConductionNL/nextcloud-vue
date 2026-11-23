/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnConditionListEditor (condition-list-editor).
 *
 * Guarded: the operators follow the field type; choosing a field, an operator
 * and a value emits the list in both v-model dialects; "is filled in" drops the
 * value; a yes/no field's value is a choice; a condition reads as Dutch rule
 * words, with the value formatted by its field.
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
import CnConditionListEditor from '../../src/components/CnConditionListEditor/CnConditionListEditor.vue'
import { conditionSentence, operatorsForType } from '../../src/components/CnConditionListEditor/conditionOperators.js'

const FIELDS = [
	{ id: 'bouwkosten', label: 'Bouwkosten', type: 'number', format: 'currency' },
	{ id: 'welstandsgebied', label: 'Welstandsgebied', type: 'boolean' },
	{ id: 'soort', label: 'Soort', type: 'string', options: [{ id: 'nieuwbouw', label: 'Nieuwbouw' }] },
	{ id: 'tekening', label: 'Bouwtekening', type: 'presence' },
]

const NcSelect = {
	name: 'NcSelect',
	props: ['modelValue', 'options', 'inputLabel', 'disabled'],
	emits: ['update:modelValue'],
	template: '<div class="nc-select" :data-label="inputLabel" />',
}
const NcTextField = {
	name: 'NcTextField',
	props: ['modelValue', 'label', 'type'],
	emits: ['update:modelValue'],
	template: '<input class="nc-text" :type="type" />',
}
const NcButton = { name: 'NcButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }

/**
 * Mount the editor over the fields.
 *
 * @param {Array} modelValue The conditions.
 * @return {object} The wrapper.
 */
function editor(modelValue = []) {
	return mount(CnConditionListEditor, {
		props: { modelValue, fields: FIELDS },
		global: { stubs: { NcSelect, NcTextField, NcButton, Close: true, Plus: true } },
	})
}

/**
 * The selects of row `i`, by their input label.
 *
 * @param {object} w The wrapper.
 * @param {string} label The input label.
 * @return {object} The select.
 */
function select(w, label) {
	return w.findAllComponents(NcSelect).find((s) => s.props('inputLabel') === label)
}

describe('conditionOperators', () => {
	it('offers the operators that fit the field type', () => {
		expect(operatorsForType('number')).toEqual(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'])
		expect(operatorsForType('boolean')).toEqual(['eq'])
		expect(operatorsForType('presence')).toEqual(['present'])
		expect(operatorsForType('string')).toEqual(['eq', 'neq', 'present'])
	})

	it('reads a condition as the Dutch words of a rule', () => {
		expect(conditionSentence({ field: 'bouwkosten', operator: 'gt', value: 100000 }, FIELDS))
			.toBe('Bouwkosten groter is dan €\u00a0100.000')
		expect(conditionSentence({ field: 'welstandsgebied', operator: 'eq', value: true }, FIELDS))
			.toBe('Welstandsgebied ja is')
		expect(conditionSentence({ field: 'soort', operator: 'neq', value: 'nieuwbouw' }, FIELDS))
			.toBe('Soort niet Nieuwbouw is')
		expect(conditionSentence({ field: 'tekening', operator: 'present' }, FIELDS))
			.toBe('Bouwtekening is ingevuld')
	})
})

describe('CnConditionListEditor', () => {
	it('builds a number comparison and emits it in both dialects', async () => {
		const w = editor()
		await w.find('button:last-of-type').trigger('click')
		select(w, 'Veld').vm.$emit('update:modelValue', { id: 'bouwkosten', label: 'Bouwkosten' })
		await w.vm.$nextTick()

		const operators = select(w, 'Operator').props('options').map((o) => o.id)
		expect(operators).toEqual(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'present'])

		select(w, 'Operator').vm.$emit('update:modelValue', { id: 'gt' })
		await w.vm.$nextTick()
		w.findComponent(NcTextField).vm.$emit('update:modelValue', '100000')
		await w.vm.$nextTick()

		const expected = [{ field: 'bouwkosten', operator: 'gt', value: 100000 }]
		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual(expected)
		expect(w.emitted('input').at(-1)[0]).toEqual(expected)
		expect(w.findComponent(NcTextField).props('type')).toBe('number')
	})

	it('drops the value for "is filled in"', async () => {
		const w = editor([{ field: 'bouwkosten', operator: 'gt', value: 5 }])
		select(w, 'Operator').vm.$emit('update:modelValue', { id: 'present' })
		await w.vm.$nextTick()

		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ field: 'bouwkosten', operator: 'present' }])
		expect(w.findComponent(NcTextField).exists()).toBe(false)
		expect(select(w, 'Waarde')).toBeUndefined()
	})

	it('makes a yes/no value a choice', async () => {
		const w = editor()
		await w.find('button:last-of-type').trigger('click')
		select(w, 'Veld').vm.$emit('update:modelValue', { id: 'welstandsgebied' })
		await w.vm.$nextTick()

		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([{ field: 'welstandsgebied', operator: 'eq', value: true }])
		expect(select(w, 'Waarde').props('options').map((o) => o.label)).toEqual(['Ja', 'Nee'])
		expect(w.findComponent(NcTextField).exists()).toBe(false)
	})

	it('removes a condition', async () => {
		const w = editor([{ field: 'bouwkosten', operator: 'gt', value: 5 }])
		await w.find('button').trigger('click')

		expect(w.emitted('update:modelValue').at(-1)[0]).toEqual([])
		expect(w.text()).toContain('Geen voorwaarden: de regel geldt altijd.')
	})
})
