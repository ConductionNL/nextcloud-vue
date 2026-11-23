/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `confirmIcon` names the icon on the Confirm button, so a hand-over, archive,
 * send or decision dialog shows its own verb's icon instead of Plus or Save.
 */
const { mount } = require('@vue/test-utils')
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button class="btn"><slot name="icon" /><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnIcon: { name: 'CnIcon', props: ['name', 'size'], template: '<i class="cn-icon" :data-name="name" />' },
	Plus: { template: '<i class="plus" />' },
	ContentSaveOutline: { template: '<i class="save" />' },
}

const schema = { title: 'Case', properties: { title: { type: 'string', title: 'Title' } } }

function mountDialog(props) {
	return mount(CnFormDialog, { propsData: { schema, ...props }, stubs })
}

describe('CnFormDialog confirmIcon', () => {
	it('shows the named icon on the Confirm button', () => {
		const wrapper = mountDialog({ item: { id: '1', title: 'A' }, confirmIcon: 'Archive', confirmLabel: 'Archive' })
		const icon = wrapper.find('[data-testid="cn-form-dialog-confirm-icon"]')
		expect(icon.exists()).toBe(true)
		expect(icon.attributes('data-name')).toBe('Archive')
		expect(wrapper.find('.save').exists()).toBe(false)
	})

	it('keeps Plus when creating and Save when editing without one', () => {
		expect(mountDialog({ item: null }).find('.plus').exists()).toBe(true)
		const editing = mountDialog({ item: { id: '1', title: 'A' } })
		expect(editing.find('.save').exists()).toBe(true)
		expect(editing.find('[data-testid="cn-form-dialog-confirm-icon"]').exists()).toBe(false)
	})
})
