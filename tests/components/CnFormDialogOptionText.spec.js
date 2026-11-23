/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Audit extra (7 October 2026): dropdown options broke in the middle of a
 * word ("Agricu lture", "Sales P ipeline"). NcSelect's own option renders a
 * label as two spans (NcEllipsisedOption keeps the last characters visible),
 * and the halves wrapped apart. The form pickers render one plain label that
 * wraps at spaces only.
 */

import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import CnFormDialog from '../../src/components/CnFormDialog/CnFormDialog.vue'

// Renders every option through the option slot, and the selection through
// the selected-option slot, the way NcSelect hands them to its slots.
const SelectStub = {
	props: ['options', 'modelValue'],
	template: `<div class="select-stub">
		<div v-for="(o, i) in options" :key="i" class="opt"><slot name="option" v-bind="typeof o === 'object' ? o : { label: o }">DEFAULT</slot></div>
		<div v-for="(o, i) in [].concat(modelValue || [])" :key="'s' + i" class="sel"><slot name="selected-option" v-bind="typeof o === 'object' ? o : { label: o }">DEFAULT</slot></div>
	</div>`,
}

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: SelectStub,
	NcSelectUsers: true,
	NcCheckboxRadioSwitch: true,
	NcDateTimePickerNative: true,
	CnJsonViewer: true,
}

const schema = {
	title: 'Client',
	properties: {
		industry: { type: 'string', title: 'Industry', enum: ['Agriculture', 'Finance and insurance'] },
		sectors: { type: 'array', title: 'Sectors', items: { type: 'string', enum: ['Agriculture', 'Sales Pipeline'] } },
	},
}

describe('CnFormDialog option text', () => {
	it('renders each option as one plain label, not two halves', () => {
		const w = mount(CnFormDialog, { propsData: { schema, item: { sectors: ['Sales Pipeline'] } }, stubs })
		const options = w.findAll('.opt')
		expect(options.length).toBeGreaterThan(0)
		for (const opt of options) {
			expect(opt.text()).not.toBe('DEFAULT')
			expect(opt.findAll('.cn-form-dialog__option')).toHaveLength(1)
		}
		const texts = w.findAll('.opt .cn-form-dialog__option').map((o) => o.text())
		expect(texts).toContain('Agriculture')
		expect(texts).toContain('Sales Pipeline')
		expect(w.find('.sel .cn-form-dialog__option').text()).toBe('Sales Pipeline')
	})

	it('reads the label, then a display name, a name or the id', () => {
		const w = mount(CnFormDialog, { propsData: { schema, item: null }, stubs })
		expect(w.vm.optionText({ id: 'x', label: 'Agriculture' })).toBe('Agriculture')
		expect(w.vm.optionText({ id: 'x', displayName: 'Henk' })).toBe('Henk')
		expect(w.vm.optionText({ id: 'x' })).toBe('x')
		expect(w.vm.optionText('tag')).toBe('tag')
		expect(w.vm.optionText(null)).toBe('')
	})

	it('wraps between words only', () => {
		const sfc = readFileSync(resolve(__dirname, '../../src/components/CnFormDialog/CnFormDialog.vue'), 'utf8')
		const i = sfc.indexOf('.cn-form-dialog__option {')
		const block = sfc.slice(i, sfc.indexOf('}', i))
		expect(block).toMatch(/white-space: normal;/)
		expect(block).toMatch(/word-break: normal;/)
		expect(block).toMatch(/overflow-wrap: normal;/)
	})
})
