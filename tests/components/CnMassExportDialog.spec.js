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
