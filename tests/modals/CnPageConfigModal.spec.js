/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnPageConfigModal — the per-page config editor: default-true toggle
 * handling, type/view-mode writes, and the data-source pickers.
 */
import { mount } from '@vue/test-utils'
import CnPageConfigModal from '../../src/modals/CnPageConfigModal.vue'

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /></div>' })

const DATA_SOURCES = {
	registers: [
		{ value: 'app-prod', label: 'App', schemas: [{ value: 'dog', label: 'Dog', columns: ['name', 'breed'] }] },
	],
}

function mountModal(page, provide = {}) {
	return mount(CnPageConfigModal, {
		propsData: { page },
		provide,
		stubs: {
			NcModal: Stub('NcModal'),
			NcButton: Stub('NcButton', ['type', 'disabled']),
			NcTextField: Stub('NcTextField', ['value', 'label']),
			NcSelect: Stub('NcSelect', ['value', 'options', 'multiple']),
			NcCheckboxRadioSwitch: Stub('NcCheckboxRadioSwitch', ['checked']),
			NcLoadingIcon: Stub('NcLoadingIcon'),
		},
	})
}

describe('CnPageConfigModal', () => {
	it('boolVal honours per-key defaults (showTitle default false, others true)', () => {
		const wrapper = mountModal({ id: 'p', type: 'index', config: { showAdd: false } })
		expect(wrapper.vm.boolVal('showViewToggle')).toBe(true) // unset → default on
		expect(wrapper.vm.boolVal('showTitle')).toBe(false) // unset → default OFF
		expect(wrapper.vm.boolVal('filterMenu')).toBe(false) // unset → default OFF
		expect(wrapper.vm.boolVal('showAdd')).toBe(false) // explicit false
	})

	it('setBool round-trips a default-true toggle (selectable)', () => {
		const page = { id: 'p', type: 'index', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setBool('selectable', false)
		expect(page.config.selectable).toBe(false)
		wrapper.vm.setBool('selectable', true)
		expect('selectable' in page.config).toBe(false) // equals default → key removed
	})

	it('setBool round-trips a default-FALSE toggle (showTitle) — the reappear bug', () => {
		const page = { id: 'p', type: 'index', config: { showTitle: true } }
		const wrapper = mountModal(page)
		wrapper.vm.setBool('showTitle', false) // off → equals default false → drop key
		expect('showTitle' in page.config).toBe(false)
		expect(wrapper.vm.boolVal('showTitle')).toBe(false)
		wrapper.vm.setBool('showTitle', true) // on → differs from default → store true (title reappears)
		expect(page.config.showTitle).toBe(true)
		expect(wrapper.vm.boolVal('showTitle')).toBe(true)
	})

	it('setType / setViewMode write the page + config', () => {
		const page = { id: 'p', type: 'custom', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setType({ value: 'index' })
		expect(page.type).toBe('index')
		wrapper.vm.setViewMode({ value: 'cards' })
		expect(page.config.viewMode).toBe('cards')
		wrapper.vm.setViewMode({ value: 'table' }) // default → key dropped
		expect('viewMode' in page.config).toBe(false)
	})

	it('setRegister writes register and clears schema + columns', () => {
		const page = { id: 'p', type: 'index', config: { register: 'old', schema: 's', columns: ['x'] } }
		const wrapper = mountModal(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setRegister({ value: 'app-prod' })
		expect(page.config.register).toBe('app-prod')
		expect(page.config.schema).toBeUndefined()
		expect(page.config.columns).toBeUndefined()
	})

	it('column options derive from the chosen schema', () => {
		const page = { id: 'p', type: 'index', config: { register: 'app-prod', schema: 'dog' } }
		const wrapper = mountModal(page, { cnDataSources: DATA_SOURCES })
		expect(wrapper.vm.columnOptions.map((o) => o.value)).toEqual(['name', 'breed'])
	})

	it('setConfig writes plain text fields and drops them when blank', () => {
		const page = { id: 'p', type: 'index', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setConfig('description', 'Hello')
		expect(page.config.description).toBe('Hello')
		wrapper.vm.setConfig('description', '')
		expect('description' in page.config).toBe(false)
	})

	it('setNumber coerces to a number and drops blank/NaN', () => {
		const page = { id: 'p', type: 'index', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setNumber('inlineActionCount', '3')
		expect(page.config.inlineActionCount).toBe(3)
		wrapper.vm.setNumber('inlineActionCount', '')
		expect('inlineActionCount' in page.config).toBe(false)
	})

	it('setColFormat maps presets to the right transform channel', () => {
		const page = { id: 'p', type: 'index', config: { register: 'app-prod', schema: 'dog' } }
		const wrapper = mountModal(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setColFormat('name', { value: 'date', channel: 'formatter' })
		expect(page.config.columnOverrides.name).toEqual({ formatter: 'date' })
		wrapper.vm.setColFormat('name', { value: 'currency', channel: 'format' })
		expect(page.config.columnOverrides.name).toEqual({ format: { style: 'currency' } })
		wrapper.vm.setColFormat('name', { value: 'badge', channel: 'widget' })
		expect(page.config.columnOverrides.name).toEqual({ widget: 'badge' })
		// Default clears the override entirely (and prunes the empty map).
		wrapper.vm.setColFormat('name', { value: '', channel: null })
		expect('columnOverrides' in page.config).toBe(false)
	})

	it('setColLabel keeps the format channel and is reflected by selectedFormat', () => {
		const page = { id: 'p', type: 'index', config: { register: 'app-prod', schema: 'dog' } }
		const wrapper = mountModal(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setColFormat('breed', { value: 'badge', channel: 'widget' })
		wrapper.vm.setColLabel('breed', 'Breed')
		expect(page.config.columnOverrides.breed).toEqual({ widget: 'badge', label: 'Breed' })
		expect(wrapper.vm.selectedFormat('breed').value).toBe('badge')
		expect(wrapper.vm.colLabel('breed')).toBe('Breed')
	})

	it('setSortField / setSortOrder write a single-key defaultSort', () => {
		const page = { id: 'p', type: 'index', config: { register: 'app-prod', schema: 'dog' } }
		const wrapper = mountModal(page, { cnDataSources: DATA_SOURCES })
		wrapper.vm.setSortField({ value: 'name' })
		expect(page.config.defaultSort).toEqual([{ field: 'name', order: 'asc' }])
		wrapper.vm.setSortOrder({ value: 'desc' })
		expect(page.config.defaultSort).toEqual([{ field: 'name', order: 'desc' }])
		wrapper.vm.setSortField(null)
		expect('defaultSort' in page.config).toBe(false)
	})

	it('setJson parses valid JSON, flags errors, and clears on blank', () => {
		const page = { id: 'p', type: 'index', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setJson('filter', '{ "status": "open" }')
		expect(page.config.filter).toEqual({ status: 'open' })
		expect(wrapper.vm.hasJsonError).toBe(false)
		wrapper.vm.setJson('filter', '{ bad')
		expect(wrapper.vm.jsonErrors.filter).toBe(true)
		expect(wrapper.vm.hasJsonError).toBe(true)
		wrapper.vm.setJson('filter', '')
		expect('filter' in page.config).toBe(false)
		expect(wrapper.vm.hasJsonError).toBe(false)
	})

	it('Done persists via the injected editor then closes', async () => {
		const save = jest.fn(() => Promise.resolve())
		const wrapper = mountModal({ id: 'p', type: 'index', config: {} }, { cnManifestEditor: { save } })
		await wrapper.vm.onDone()
		expect(save).toHaveBeenCalled()
		expect(wrapper.emitted('close')).toHaveLength(1)
	})
})
