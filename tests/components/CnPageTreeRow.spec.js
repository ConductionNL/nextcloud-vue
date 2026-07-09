/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnPageTreeRow — inline title/type editing and the cog-popover data
 * source (register/schema/columns), including recovery of a config corrupted to
 * an array by the PHP empty-object round-trip.
 */
import { mount } from '@vue/test-utils'
import CnPageTreeRow from '../../src/components/CnPageTreeNode/CnPageTreeRow.vue'

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /><slot name="trigger" :attrs="{}" /></div>' })

const DATA_SOURCES = {
	registers: [
		{ value: 'app-prod', label: 'App (production)', schemas: [{ value: 'dog', label: 'Dog', columns: ['name', 'breed'] }] },
	],
}

function mountRow(page, provide = {}) {
	return mount(CnPageTreeRow, {
		propsData: { page, canAddChild: true },
		provide,
		stubs: {
			NcButton: Stub('NcButton', ['type', 'ariaLabel']),
			NcTextField: Stub('NcTextField', ['value', 'label']),
			NcSelect: Stub('NcSelect', ['value', 'options', 'multiple']),
			NcPopover: Stub('NcPopover', ['shown']),
			Cog: Stub('Cog'),
			Plus: Stub('Plus'),
			Delete: Stub('Delete'),
			DragVertical: Stub('DragVertical'),
		},
	})
}

describe('CnPageTreeRow', () => {
	it('isDataPage is true only for index/detail', () => {
		expect(mountRow({ id: 'a', type: 'index' }).vm.isDataPage).toBe(true)
		expect(mountRow({ id: 'a', type: 'detail' }).vm.isDataPage).toBe(true)
		expect(mountRow({ id: 'a', type: 'dashboard' }).vm.isDataPage).toBe(false)
		expect(mountRow({ id: 'a', type: 'custom' }).vm.isDataPage).toBe(false)
	})

	it('inline edit: startEdit/stopEdit and setTitle/onType mutate the page', () => {
		const page = { id: 'p', type: 'custom', title: 'Old' }
		const wrapper = mountRow(page)
		wrapper.vm.startEdit('name')
		expect(wrapper.vm.editing).toBe('name')
		wrapper.vm.setTitle('Dogs')
		expect(page.title).toBe('Dogs')
		wrapper.vm.onType({ value: 'index' })
		expect(page.type).toBe('index')
		expect(wrapper.vm.editing).toBe(null) // onType closes the inline editor
	})

	it('typeIconComponent maps the page type to an MDI glyph', () => {
		expect(mountRow({ id: 'a', type: 'dashboard' }).vm.typeIconComponent).toBe('ViewDashboardOutline')
		expect(mountRow({ id: 'a', type: 'index' }).vm.typeIconComponent).toBe('FormatListBulletedSquare')
		expect(mountRow({ id: 'a', type: 'detail' }).vm.typeIconComponent).toBe('TextBoxOutline')
		expect(mountRow({ id: 'a', type: 'custom' }).vm.typeIconComponent).toBe('ShapeOutline')
	})

	it('canNavigate is true only for concrete (non-param) routes', () => {
		expect(mountRow({ id: 'a', type: 'index', route: '/dogs' }).vm.canNavigate).toBe(true)
		expect(mountRow({ id: 'a', type: 'detail', route: '/dogs/:id' }).vm.canNavigate).toBe(false)
		expect(mountRow({ id: 'a', type: 'custom', route: '' }).vm.canNavigate).toBe(false)
	})

	it('commitSlug emits a sanitised rename and no-ops when unchanged', () => {
		const wrapper = mountRow({ id: 'page-3', type: 'index' })
		wrapper.vm.slugDraft = 'Dogs Page!'
		wrapper.vm.commitSlug()
		expect(wrapper.emitted('rename')[0]).toEqual(['dogs-page'])
		// unchanged → no further emit + draft reset to current id
		wrapper.vm.slugDraft = 'page-3'
		wrapper.vm.commitSlug()
		expect(wrapper.emitted('rename').length).toBe(1)
	})

	it('setRegister writes config.register and clears schema + columns', () => {
		const page = { id: 'dogs', type: 'index', config: { register: 'old', schema: 's', columns: ['x'] } }
		const wrapper = mountRow(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setRegister({ value: 'app-prod' })
		expect(page.config.register).toBe('app-prod')
		expect(page.config.schema).toBeUndefined()
		expect(page.config.columns).toBeUndefined()
	})

	it('schema + column options derive from the chosen register/schema', () => {
		const page = { id: 'dogs', type: 'index', config: { register: 'app-prod', schema: 'dog' } }
		const wrapper = mountRow(page, { cnDataSources: DATA_SOURCES })
		expect(wrapper.vm.schemaOptions.map((o) => o.value)).toEqual(['dog'])
		expect(wrapper.vm.columnOptions.map((o) => o.value)).toEqual(['name', 'breed'])
		wrapper.vm.setColumns([{ value: 'name' }])
		expect(page.config.columns).toEqual(['name'])
	})

	it('recovers a config corrupted to an array (PHP empty-object round-trip)', () => {
		const page = { id: 'dogs', type: 'index', config: [] }
		const wrapper = mountRow(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setRegister({ value: 'app-prod' })
		expect(Array.isArray(page.config)).toBe(false)
		expect(JSON.parse(JSON.stringify(page.config))).toEqual({ register: 'app-prod' })
	})

	it('free-text fallback: setColumnsText parses a CSV', () => {
		const page = { id: 'dogs', type: 'index' }
		const wrapper = mountRow(page)
		wrapper.vm.setColumnsText(' name , breed ,, ')
		expect(page.config.columns).toEqual(['name', 'breed'])
	})
})
