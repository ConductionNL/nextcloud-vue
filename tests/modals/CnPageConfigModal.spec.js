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
	it('boolVal treats unset/true as on and explicit false as off', () => {
		const wrapper = mountModal({ id: 'p', type: 'index', config: { showAdd: false } })
		expect(wrapper.vm.boolVal('showViewToggle')).toBe(true) // unset → default on
		expect(wrapper.vm.boolVal('showAdd')).toBe(false) // explicit false
	})

	it('setBool stores false when off and drops the key when on', () => {
		const page = { id: 'p', type: 'index', config: {} }
		const wrapper = mountModal(page)
		wrapper.vm.setBool('selectable', false)
		expect(page.config.selectable).toBe(false)
		wrapper.vm.setBool('selectable', true)
		expect('selectable' in page.config).toBe(false) // back to default → key removed
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

	it('Done persists via the injected editor then closes', async () => {
		const save = jest.fn(() => Promise.resolve())
		const wrapper = mountModal({ id: 'p', type: 'index', config: {} }, { cnManifestEditor: { save } })
		await wrapper.vm.onDone()
		expect(save).toHaveBeenCalled()
		expect(wrapper.emitted('close')).toHaveLength(1)
	})
})
