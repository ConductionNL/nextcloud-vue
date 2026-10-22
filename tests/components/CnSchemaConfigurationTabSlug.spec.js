// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// The object-slug controls of the schema configuration tab (#1868).
//
// OpenRegister persists `objectSlugField` and `objectSlugSuffix` and enforces
// them on save (openregister#4037). This pins the tab's side of that contract:
// the slug field is a property picker bound to the configuration, the suffix
// switch is only usable once a slug field is chosen, and the freeze note shows
// only when slugs are on.

import { mount } from '@vue/test-utils'
import CnSchemaConfigurationTab from '../../src/components/CnSchemaFormDialog/CnSchemaConfigurationTab.vue'

/**
 * Mount the tab with a given configuration.
 *
 * @param {object} configuration The schema configuration.
 * @return {object} The wrapper.
 */
function mountTab(configuration = {}) {
	return mount(CnSchemaConfigurationTab, {
		props: {
			schemaItem: {
				description: '',
				summary: '',
				slug: '',
				allOf: [],
				oneOf: [],
				anyOf: [],
				configuration: { allowedTags: [], ...configuration },
			},
			propertyOptions: ['title', 'kenmerk'],
		},
		global: {
			stubs: {
				NcTextArea: true,
				NcTextField: true,
				NcSelect: true,
				NcCheckboxRadioSwitch: true,
				NcNoteCard: true,
			},
		},
	})
}

/**
 * Find the stubbed slug-field select.
 *
 * @param {object} wrapper The mounted tab.
 * @return {object|undefined} The select stub.
 */
function slugSelect(wrapper) {
	return wrapper.findAllComponents({ name: 'NcSelect' })
		.find((select) => select.attributes('inputlabel') === 'Object slug field')
}

/**
 * Find the stubbed suffix switch.
 *
 * @param {object} wrapper The mounted tab.
 * @return {object|undefined} The switch stub.
 */
function suffixSwitch(wrapper) {
	return wrapper.findAllComponents({ name: 'NcCheckboxRadioSwitch' })
		.find((toggle) => toggle.text().includes('date-time suffix'))
}

describe('CnSchemaConfigurationTab — object slug controls', () => {
	it('offers the schema properties as the slug field', () => {
		const select = slugSelect(mountTab())

		expect(select).toBeDefined()
		expect(select.props('options') ?? select.attributes('options')).toBeTruthy()
	})

	it('disables the suffix switch while no slug field is chosen', () => {
		const toggle = suffixSwitch(mountTab({ objectSlugField: '' }))

		expect(toggle).toBeDefined()
		expect(toggle.attributes('disabled')).toBe('true')
	})

	it('enables the suffix switch once a slug field is chosen', () => {
		const toggle = suffixSwitch(mountTab({ objectSlugField: 'kenmerk' }))

		// A stub renders a bound boolean as its string value.
		expect(toggle.attributes('disabled')).toBe('false')
	})

	it('shows the freeze note only when slugs are on', () => {
		const notes = (wrapper) => wrapper.findAllComponents({ name: 'NcNoteCard' })
			.filter((note) => note.text().includes('does not change once it is set'))

		expect(notes(mountTab({ objectSlugField: '' }))).toHaveLength(0)
		expect(notes(mountTab({ objectSlugField: 'kenmerk' }))).toHaveLength(1)
	})
})
