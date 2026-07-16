/**
 * Tests for CnMassExportDialog.
 *
 * Regression guard: the format NcSelect must receive its options from the
 * `formats` prop. The template previously bound `:options="formatOptions"`,
 * an identifier that was never defined, so the dropdown rendered empty.
 */

import { mount } from '@vue/test-utils'

const CnMassExportDialog = require('../../src/components/CnMassExportDialog/CnMassExportDialog.vue').default

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /><slot name="icon" /></button>' },
	NcLoadingIcon: { template: '<div />' },
	NcNoteCard: { template: '<div />' },
	NcSelect: { name: 'NcSelect', props: ['options', 'modelValue'], template: '<div />' },
	ExportIcon: { template: '<div />' },
}

describe('CnMassExportDialog', () => {
	it('passes the formats prop as the NcSelect options', () => {
		const wrapper = mount(CnMassExportDialog, { stubs })
		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.exists()).toBe(true)
		expect(select.props('options')).toHaveLength(2)
		expect(select.props('options')[0].id).toBe('excel')
	})

	it('defaults selectedFormat to defaultFormat and emits it on confirm', () => {
		const wrapper = mount(CnMassExportDialog, { stubs })
		expect(wrapper.vm.selectedFormat.id).toBe('excel')
		wrapper.vm.executeExport()
		expect(wrapper.emitted('confirm')[0][0]).toEqual({ format: 'excel' })
	})

	it('honours a custom formats list + defaultFormat', () => {
		const formats = [{ id: 'json', label: 'JSON' }, { id: 'xml', label: 'XML' }]
		const wrapper = mount(CnMassExportDialog, {
			stubs,
			propsData: { formats, defaultFormat: 'xml' },
		})
		const select = wrapper.findComponent({ name: 'NcSelect' })
		expect(select.props('options')).toEqual(formats)
		expect(wrapper.vm.selectedFormat.id).toBe('xml')
	})
})

describe('CnMassExportDialog — entities picker (export launcher, Wave 1)', () => {
	const entities = [
		{ id: 'leads', label: 'Leads' },
		{ id: 'requests', label: 'Requests' },
	]

	it('renders no entity picker by default (regression)', () => {
		const wrapper = mount(CnMassExportDialog, { stubs })
		expect(wrapper.find('label[for="cn-mass-export-entity"]').exists()).toBe(false)
		expect(wrapper.vm.selectedEntity).toBeNull()
		// Only the format NcSelect is present.
		expect(wrapper.findAllComponents({ name: 'NcSelect' })).toHaveLength(1)
	})

	it('renders the entity picker with the first entity pre-selected', () => {
		const wrapper = mount(CnMassExportDialog, { stubs, propsData: { entities } })
		expect(wrapper.find('label[for="cn-mass-export-entity"]').exists()).toBe(true)
		expect(wrapper.findAllComponents({ name: 'NcSelect' })).toHaveLength(2)
		expect(wrapper.vm.selectedEntity).toEqual(entities[0])
	})

	it('honours defaultEntity for the pre-selection', () => {
		const wrapper = mount(CnMassExportDialog, {
			stubs,
			propsData: { entities, defaultEntity: 'requests' },
		})
		expect(wrapper.vm.selectedEntity).toEqual(entities[1])
	})

	it('confirm payload carries format + the chosen entity id', () => {
		const wrapper = mount(CnMassExportDialog, { stubs, propsData: { entities } })
		wrapper.vm.selectedEntity = entities[1]
		wrapper.vm.executeExport()
		expect(wrapper.emitted('confirm')[0][0]).toEqual({ format: 'excel', entity: 'requests' })
	})

	it('confirm payload stays format-only without entities (back-compat)', () => {
		const wrapper = mount(CnMassExportDialog, { stubs })
		wrapper.vm.executeExport()
		expect(wrapper.emitted('confirm')[0][0]).toEqual({ format: 'excel' })
	})
})
