// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

/**
 * Tests for CnSchemaPropertyActions — the per-property NcActions popover in the
 * schema editor. Covers the wiring fixes for object/related-object references:
 * option normalization (no "undefined" labels), the NcSelect `input` event
 * actually persisting $ref/register, enum values added via the NcActionInput
 * `submit` event, and schema-slug resolution across consumer shapes.
 */
import { shallowMount } from '@vue/test-utils'

const CnSchemaPropertyActions = require('../../src/components/CnSchemaFormDialog/CnSchemaPropertyActions.vue').default

// Consumer schema objects (as CnEditDataModal passes them: raw OR objects with
// slug + properties but NO `label` key) plus the current schema being edited.
const BARN_SCHEMA = {
	id: 4711,
	uuid: 'barn-uuid',
	slug: 'barn',
	title: 'Barn',
	properties: { location: { type: 'string', title: 'Location' }, capacity: { type: 'integer' } },
}

function factory(property, extraProps = {}) {
	const schemaItem = { properties: { field: property }, required: [] }
	return shallowMount(CnSchemaPropertyActions, {
		propsData: {
			propertyKey: 'field',
			property,
			schemaItem,
			availableSchemas: [BARN_SCHEMA],
			availableRegisters: [{ id: 2466, value: 2466, title: 'CowBoy', slug: 'cowboy' }],
			...extraProps,
		},
		mocks: { t: (app, str, vars) => str },
		stubs: { NcActions: true, NcActionButton: true, NcActionCheckbox: true, NcActionInput: true, NcActionCaption: true, NcActionSeparator: true, NcActionText: true },
	})
}

describe('CnSchemaPropertyActions', () => {
	describe('option normalization (no "undefined" labels)', () => {
		it('gives every schema-reference option a readable label + $ref id', () => {
			const w = factory({ type: 'object', objectConfiguration: { handling: 'related-object' } })
			expect(w.vm.schemaRefOptions).toEqual([{ id: '#/components/schemas/barn', label: 'Barn' }])
		})

		it('gives every register option a readable label', () => {
			const w = factory({ type: 'object', objectConfiguration: { handling: 'related-object' } })
			expect(w.vm.registerSelectOptions[0]).toMatchObject({ id: 2466, label: 'CowBoy' })
		})
	})

	describe('reference selection persists via the NcSelect input event', () => {
		it('updateSchemaReference stores the $ref string from the selected option', () => {
			const w = factory({ type: 'object', objectConfiguration: { handling: 'related-object' } })
			w.vm.updateSchemaReference('field', { id: '#/components/schemas/barn', label: 'Barn' })
			expect(w.vm.schema.properties.field.$ref).toBe('#/components/schemas/barn')
		})

		it('updateRegisterReference stores the register id from the selected option', () => {
			const w = factory({ type: 'object', $ref: '#/components/schemas/barn', objectConfiguration: { handling: 'related-object' } })
			w.vm.updateRegisterReference('field', { id: 2466, label: 'CowBoy' })
			expect(w.vm.schema.properties.field.objectConfiguration.register).toBe(2466)
		})

		it('resolves the referenced schema so inversedBy lists its properties', () => {
			const w = factory({ type: 'object', $ref: '#/components/schemas/barn', objectConfiguration: { handling: 'related-object' } })
			const opts = w.vm.getInversedByOptions('field')
			expect(opts).toEqual([
				{ id: 'location', label: 'Location' },
				{ id: 'capacity', label: 'capacity' },
			])
		})
	})

	describe('findSchemaBySlug matches all consumer shapes', () => {
		it('matches by slug, id, uuid, title, and reference tail', () => {
			const w = factory({ type: 'string' })
			expect(w.vm.findSchemaBySlug('barn')).toBe(BARN_SCHEMA)
			expect(w.vm.findSchemaBySlug('4711')).toBe(BARN_SCHEMA)
			expect(w.vm.findSchemaBySlug('barn-uuid')).toBe(BARN_SCHEMA)
			expect(w.vm.findSchemaBySlug('Barn')).toBe(BARN_SCHEMA)
		})
	})

	describe('enum values', () => {
		it('adds a value and clears the input (submit handler)', () => {
			const w = factory({ type: 'string' })
			w.vm.enumInputValue = 'small'
			w.vm.addEnumValueAndClear('field')
			expect(w.vm.schema.properties.field.enum).toEqual(['small'])
			expect(w.vm.enumInputValue).toBe('')
		})

		it('de-duplicates and removes by index', () => {
			const w = factory({ type: 'string', enum: ['small'] })
			w.vm.addEnumValue('field', 'small')
			expect(w.vm.schema.properties.field.enum).toEqual(['small'])
			w.vm.addEnumValue('field', 'big')
			expect(w.vm.schema.properties.field.enum).toEqual(['small', 'big'])
			w.vm.removeEnumValue('field', 0)
			expect(w.vm.schema.properties.field.enum).toEqual(['big'])
		})
	})

	describe('selected-option display mappers', () => {
		it('maps the stored $ref back to its option object for display', () => {
			const w = factory({ type: 'object', $ref: '#/components/schemas/barn', objectConfiguration: { handling: 'related-object' } })
			expect(w.vm.getSchemaRefOption('field')).toEqual({ id: '#/components/schemas/barn', label: 'Barn' })
		})

		it('returns null when nothing is selected', () => {
			const w = factory({ type: 'object', objectConfiguration: { handling: 'related-object' } })
			expect(w.vm.getSchemaRefOption('field')).toBeNull()
			expect(w.vm.getRegisterOption('field')).toBeNull()
		})
	})
})
