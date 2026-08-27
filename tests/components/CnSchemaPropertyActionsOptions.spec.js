// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.
//
// The option lists behind the Schema reference / Register pickers.
//
// WHY THIS IS A UNIT TEST AND NOT AN E2E
// --------------------------------------
// `e2e/schema-reference.e2e.js` drives the same thing through the real dialog,
// and the defect it guards — an option list rendering "undefined" instead of a
// schema title — is decided entirely by the mapping below. That mapping takes a
// shape and returns a shape; nothing about it needs layout, and driving it
// through an `NcActionInput type="multiselect"` nested in an `NcActions`
// popover has proved genuinely hard to open reliably from a spec.
//
// So the CONTENT is pinned here, where it is deterministic, and the e2e keeps
// the end-to-end wiring. The two are not duplicates: this one fails when the
// labels are wrong, that one fails when the picker stops being reachable.
//
// The cases that matter are the FALLBACKS. A consumer that passes schemas keyed
// the way Buildiq does — title/slug, no `label`, no `reference` — is exactly the
// input that produced "undefined" in the dropdown.

import { mount } from '@vue/test-utils'
import CnSchemaPropertyActions from '../../src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue'

/**
 * Mount the actions component with a given set of available schemas.
 *
 * @param {object} props Props to override.
 * @return {object} The wrapper.
 */
function mountActions(props = {}) {
	return mount(CnSchemaPropertyActions, {
		props: {
			propertyKey: 'cows',
			property: { type: 'array', items: {} },
			schemaItem: { properties: { cows: { type: 'array', items: {} } }, required: [] },
			availableSchemas: [],
			availableRegisters: [],
			...props,
		},
		global: { stubs: { NcActions: true, NcActionInput: true, NcActionButton: true, NcActionCaption: true, NcActionSeparator: true } },
	})
}

describe('CnSchemaPropertyActions — picker options', () => {
	it('labels an option with the schema title', () => {
		const wrapper = mountActions({
			availableSchemas: [{ id: 100, title: 'Cow', slug: 'cow', reference: '#/components/schemas/cow' }],
		})

		expect(wrapper.vm.schemaRefOptions).toEqual([
			{ id: '#/components/schemas/cow', label: 'Cow', schema: expect.any(Object) },
		])
	})

	/**
	 * ⚠️ THE CASE THAT PRODUCED "undefined" IN THE DROPDOWN.
	 *
	 * Buildiq passes schemas keyed by title/slug with no `label` and no
	 * `reference`. Binding that list straight into the select rendered every
	 * option as `undefined`, because the select reads `label` and there was
	 * none. The mapping has to synthesise both the id and the label.
	 */
	it('never yields an undefined label, whatever the consumer passes', () => {
		const wrapper = mountActions({
			availableSchemas: [
				{ id: 1, title: 'Cow', slug: 'cow' },
				{ id: 2, name: 'Stable', slug: 'stable' },
				{ id: 3, slug: 'barn' },
				{ id: 4 },
			],
		})

		const labels = wrapper.vm.schemaRefOptions.map((o) => o.label)

		expect(labels).toEqual(['Cow', 'Stable', 'barn', 'Schema 4'])
		expect(labels.some((l) => l === undefined || String(l).includes('undefined'))).toBe(false)
	})

	it('synthesises a $ref when the schema carries none', () => {
		const wrapper = mountActions({
			availableSchemas: [{ id: 7, title: 'Cow', slug: 'cow' }],
		})

		// The stored value is the `$ref`, so an undefined id here writes an
		// unresolvable reference into the document.
		expect(wrapper.vm.schemaRefOptions[0].id).toBe('#/components/schemas/cow')
	})

	it('prefers an explicit reference over the synthesised one', () => {
		const wrapper = mountActions({
			availableSchemas: [{ id: 7, title: 'Cow', slug: 'cow', reference: 'https://example.test/cow.json' }],
		})

		expect(wrapper.vm.schemaRefOptions[0].id).toBe('https://example.test/cow.json')
	})

	it('is empty, not broken, when no schemas are available', () => {
		// The control: an empty list is a legitimate state and must not throw
		// or invent an option.
		expect(mountActions({ availableSchemas: [] }).vm.schemaRefOptions).toEqual([])
		expect(mountActions({ availableSchemas: undefined }).vm.schemaRefOptions).toEqual([])
	})

	it('labels register options the same way', () => {
		const wrapper = mountActions({
			availableRegisters: [{ id: 5, title: 'Farm' }, { slug: 'yard' }],
		})

		expect(wrapper.vm.registerSelectOptions.map((o) => o.label))
			.not.toContain(undefined)
	})
})
