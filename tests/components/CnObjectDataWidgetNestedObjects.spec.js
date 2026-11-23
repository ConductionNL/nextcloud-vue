/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectDataWidget's nested-object rendering and the inline-edit
 * guard on structured values (opencatalogi#1932): a per-language map such as
 * publiccode's `description` reads as nested lists, and a click on a value
 * with no inline editor never opens a text field holding "[object Object]".
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const DESCRIPTION = {
	nl: { shortDescription: 'Meldingen openbare ruimte', longDescription: 'Eerste alinea.\n\nTweede alinea.', features: ['Kaart', 'Foto'] },
	en: { shortDescription: 'Public space reports' },
}

function mountWidget(schema, objectData, props = {}, slots = {}, provide = {}) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData, ...props },
		slots,
		provide,
		stubs: {
			CnWidgetWrapper: { template: '<div><slot /></div>' },
			CnFormDialog: true,
			CnObjectMetadataModal: true,
		},
		mocks: { t: (_app, s) => s },
	})
}

function fieldOf(w, key) {
	return w.vm.resolvedFields.find((f) => f.key === key)
}

describe('CnObjectDataWidget — nested objects', () => {
	const schema = { properties: { description: { type: 'object', widget: 'json' } } }

	it('renders a per-language map as a list per language, never compact JSON', () => {
		const w = mountWidget(schema, { description: DESCRIPTION }, { editable: false })
		const nested = w.findAll('.cn-object-data-widget__deflist--nested')
		expect(nested.length).toBe(2)
		expect(nested.at(0).text()).toContain('Short description')
		expect(nested.at(0).text()).toContain('Meldingen openbare ruimte')
		expect(nested.at(1).text()).toContain('Public space reports')
		expect(w.text()).not.toContain('{"')
		expect(w.text()).not.toContain('[object Object]')
	})

	it('keeps the line breaks of a long text and joins a list of scalars', () => {
		const w = mountWidget(schema, { description: DESCRIPTION }, { editable: false })
		const texts = w.findAll('.cn-object-data-widget__deflist-text').map((t) => t.element.textContent)
		expect(texts).toContain('Eerste alinea.\n\nTweede alinea.')
		expect(texts).toContain('Kaart, Foto')
	})

	it('falls back to compact JSON below the second level', () => {
		const w = mountWidget(schema, { description: { nl: { deep: { a: 1 } } } }, { editable: false })
		expect(w.find('.cn-object-data-widget__deflist--nested').text()).toContain('{"a":1}')
	})

	it('labels a nested key with the sub-schema title, and keeps a plain key as written', () => {
		const titled = {
			properties: {
				description: {
					type: 'object',
					widget: 'json',
					additionalProperties: { type: 'object', properties: { shortDescription: { title: 'Short text' } } },
				},
			},
		}
		const w = mountWidget(titled, { description: DESCRIPTION }, { editable: false })
		const nested = w.find('.cn-object-data-widget__deflist--nested')
		expect(nested.text()).toContain('Short text')
		expect(nested.text()).toContain('Long description')
		expect(w.find('.cn-object-data-widget__deflist > dt').text()).toBe('nl')
	})
})

describe('CnObjectDataWidget — no inline edit for structured values', () => {
	it('does not make a json-widget field inline-editable', () => {
		const schema = { properties: { description: { type: 'object', widget: 'json' } } }
		const w = mountWidget(schema, { description: DESCRIPTION }, { editable: true })
		expect(w.vm.isEditable(fieldOf(w, 'description'))).toBe(false)
		expect(w.find('.cn-object-data-widget__value--editable').exists()).toBe(false)
	})

	it('does not open an editor when the json value is clicked or entered', async () => {
		const schema = { properties: { description: { type: 'object', widget: 'json' } } }
		const w = mountWidget(schema, { description: DESCRIPTION }, { editable: true })
		const value = w.find('.cn-object-data-widget__value')
		await value.trigger('click')
		await value.trigger('keydown', { key: 'Enter' })
		expect(w.vm.editingField).toBe(null)
		expect(w.find('.cn-object-data-widget__editor').exists()).toBe(false)
		expect(w.findComponent({ name: 'NcTextField' }).exists()).toBe(false)
		expect(value.attributes('tabindex')).toBe('-1')
		expect(value.attributes('role')).toBeUndefined()
	})

	it('ignores an editable override on a field without an inline editor', () => {
		const schema = { properties: { meta: {} } }
		const w = mountWidget(schema, { meta: { a: 1 } }, { editable: true, overrides: { meta: { editable: true } } })
		expect(w.vm.isEditable(fieldOf(w, 'meta'))).toBe(false)
	})

	it('keeps an empty list-of-objects field out of inline editing', () => {
		const schema = { properties: { contacts: { type: 'array', items: { type: 'object' } } } }
		const w = mountWidget(schema, { contacts: [] }, { editable: true })
		expect(w.vm.isEditable(fieldOf(w, 'contacts'))).toBe(false)
		const empty = mountWidget(schema, { contacts: null }, { editable: true })
		expect(empty.vm.isEditable(fieldOf(empty, 'contacts'))).toBe(false)
	})

	it('keeps a list of objects out of inline editing', () => {
		const schema = { properties: { rows: { type: 'array' } } }
		const w = mountWidget(schema, { rows: [{ a: 1 }] }, { editable: true })
		expect(w.vm.isEditable(fieldOf(w, 'rows'))).toBe(false)
	})

	it('keeps an empty sub-objects field out of inline editing', () => {
		const schema = { properties: { lines: { type: 'array', 'x-widget': 'sub-objects', items: { type: 'object' } } } }
		const w = mountWidget(schema, { lines: [] }, { editable: true })
		expect(fieldOf(w, 'lines').widget).toBe('sub-objects')
		expect(w.vm.isEditable(fieldOf(w, 'lines'))).toBe(false)
	})

	it('keeps an empty file field out of inline editing', () => {
		const schema = { properties: { attachment: { type: 'file' } } }
		const w = mountWidget(schema, { attachment: null }, { editable: true })
		expect(fieldOf(w, 'attachment').widget).toBe('file')
		expect(w.vm.isEditable(fieldOf(w, 'attachment'))).toBe(false)
	})

	it('keeps a formatter field holding an object out of inline editing', () => {
		const schema = { properties: { meta: {} } }
		const w = mountWidget(
			schema,
			{ meta: { a: 1 } },
			{ editable: true, overrides: { meta: { formatter: 'short' } } },
			{},
			{ cnFormatters: { short: () => 'one key' } },
		)
		expect(w.text()).toContain('one key')
		expect(w.vm.isEditable(fieldOf(w, 'meta'))).toBe(false)
	})

	it('still edits inline when the consumer supplies a field slot', () => {
		const schema = { properties: { meta: {} } }
		const w = mountWidget(schema, { meta: { a: 1 } }, { editable: true }, { 'field-meta': '<div />' })
		expect(w.vm.isEditable(fieldOf(w, 'meta'))).toBe(true)
	})

	it('leaves scalar fields editable', () => {
		const schema = { properties: { title: { type: 'string' }, period: { type: 'string', format: 'duration' } } }
		const w = mountWidget(schema, { title: 'A', period: 'P1D' }, { editable: true })
		expect(w.vm.isEditable(fieldOf(w, 'title'))).toBe(true)
		expect(w.vm.isEditable(fieldOf(w, 'period'))).toBe(true)
	})
})
