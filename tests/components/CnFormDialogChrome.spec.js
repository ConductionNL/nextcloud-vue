/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `noClose` and `cancelIcon` let a host keep the chrome of the `NcDialog` it
 * moves off: a dialog left only through its buttons, and the icon on Cancel.
 */
const { mount } = require('@vue/test-utils')
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default

const stubs = {
	NcDialog: {
		name: 'NcDialog',
		props: ['noClose'],
		template: '<div class="dialog" :data-no-close="String(!!noClose)"><slot /><slot name="actions" /></div>',
	},
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

describe('CnFormDialog noClose', () => {
	it('can be closed outside its buttons by default, except while saving', async () => {
		const wrapper = mountDialog({})
		expect(wrapper.find('.dialog').attributes('data-no-close')).toBe('false')
		wrapper.setData({ loading: true })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.dialog').attributes('data-no-close')).toBe('true')
	})

	it('blocks every close but its buttons when set', () => {
		const wrapper = mountDialog({ noClose: true })
		expect(wrapper.find('.dialog').attributes('data-no-close')).toBe('true')
	})

	it('still closes from Cancel when set', async () => {
		const wrapper = mountDialog({ noClose: true })
		await wrapper.findAll('.btn').at(0).trigger('click')
		expect(wrapper.emitted('close')).toHaveLength(1)
	})
})

describe('CnFormDialog cancelIcon', () => {
	it('draws no icon on Cancel by default', () => {
		const wrapper = mountDialog({})
		expect(wrapper.find('[data-testid="cn-form-dialog-cancel-icon"]').exists()).toBe(false)
	})

	it('draws the named icon on Cancel, and on Close in the result phase', async () => {
		const wrapper = mountDialog({ cancelIcon: 'Cancel' })
		const icon = () => wrapper.find('[data-testid="cn-form-dialog-cancel-icon"]')
		expect(icon().attributes('data-name')).toBe('Cancel')
		wrapper.setData({ result: { error: 'refused' } })
		await wrapper.vm.$nextTick()
		expect(icon().attributes('data-name')).toBe('Cancel')
	})
})
