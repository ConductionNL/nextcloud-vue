/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `fieldOverrides[key].section` groups the form's fields under translated
 * headings, in field order (board PqTicketBewerken).
 */
const { mount } = require('@vue/test-utils')
const CnFormDialog = require('../../src/components/CnFormDialog/CnFormDialog.vue').default

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: true,
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcTextArea: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
}

const schema = {
	title: 'Ticket',
	properties: {
		title: { type: 'string', title: 'Title' },
		assignee: { type: 'string', title: 'Assignee' },
		requester: { type: 'string', title: 'Requester' },
		visible: { type: 'boolean', title: 'Visible to the client' },
	},
}

const DUTCH = { 'The ticket': 'Het ticket', People: 'Mensen', 'Visible to the client': 'Zichtbaar voor de klant' }

function mountDialog(fieldOverrides) {
	return mount(CnFormDialog, {
		propsData: { schema, item: null, fieldOverrides },
		provide: { cnTranslate: (key) => DUTCH[key] || key },
		stubs,
	})
}

describe('CnFormDialog sections', () => {
	it('puts a translated heading before the first field of each section', () => {
		const wrapper = mountDialog({
			title: { section: 'The ticket', order: 1 },
			assignee: { section: 'People', order: 2 },
			requester: { section: 'People', order: 3 },
			visible: { section: 'Visible to the client', order: 4 },
		})
		const headings = wrapper.findAll('[data-testid="cn-form-dialog-section"]')
		expect(headings.map((h) => h.text())).toEqual(['Het ticket', 'Mensen', 'Zichtbaar voor de klant'])
		const order = wrapper.findAll('[data-testid="cn-form-dialog-section"], [data-cn-field]').map((el) => el.attributes('data-cn-field') || el.text())
		expect(order).toEqual(['Het ticket', 'title', 'Mensen', 'assignee', 'requester', 'Zichtbaar voor de klant', 'visible'])
	})

	it('draws no headings without sections', () => {
		expect(mountDialog({}).findAll('[data-testid="cn-form-dialog-section"]')).toHaveLength(0)
	})
})
