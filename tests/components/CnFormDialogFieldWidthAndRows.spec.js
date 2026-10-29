/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * A field override may ask for the full width of a two-column form
 * (`width: 'full'`) and for the height of a textarea (`rows`). Board
 * PqTicketBewerken draws Titel across both columns above a three-line
 * Omschrijving, and "Bericht aan de klant" two lines high.
 *
 * @spec openspec/changes/form-field-full-width-and-rows/specs/form-dialog/spec.md
 */

import { mount } from '@vue/test-utils'
import CnFormDialog from '@/components/CnFormDialog/CnFormDialog.vue'
import { useObjectStore } from '@/store/useObjectStore.js'

jest.mock('@/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: jest.fn(),
}))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcDialog: { template: '<div><slot /><slot name="actions" /></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcNoteCard: true,
	NcLoadingIcon: true,
	NcTextField: true,
	NcSelect: true,
	NcCheckboxRadioSwitch: true,
	CnResourceSelect: true,
	CnFieldHelper: true,
	CnJsonViewer: true,
}

const schema = {
	title: 'Ticket',
	properties: {
		title: { type: 'string', title: 'Title' },
		description: { type: 'string', title: 'Description' },
		category: { type: 'string', title: 'Category' },
	},
}

function mountForm(propsData = {}) {
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions: jest.fn(() => Promise.resolve([])),
		createObjectTypeSlug: (register, slug) => `${register}/${slug}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
	return mount(CnFormDialog, {
		propsData: { schema, item: null, register: 'pipelinq', columns: 2, ...propsData },
		stubs,
	})
}

describe('CnFormDialog field width and textarea rows', () => {
	it('spans a single-line field over both columns when its override asks for the full width', async () => {
		const wrapper = mountForm({ fieldOverrides: { title: { width: 'full' } } })
		await flush()

		expect(wrapper.find('[data-cn-field="title"]').classes()).toContain('cn-form-dialog__field--wide')
		expect(wrapper.find('[data-cn-field="category"]').classes()).not.toContain('cn-form-dialog__field--wide')
	})

	it('keeps a full-width field in the one column of a single-column form', async () => {
		const wrapper = mountForm({ columns: 1, fieldOverrides: { title: { width: 'full' } } })
		await flush()

		expect(wrapper.find('[data-cn-field="title"]').classes()).not.toContain('cn-form-dialog__field--wide')
	})

	it('draws a textarea as many rows high as its override asks', async () => {
		const wrapper = mountForm({ fieldOverrides: { description: { widget: 'textarea', rows: 3 } } })
		await flush()

		expect(wrapper.find('[data-cn-field="description"] textarea').attributes('rows')).toBe('3')
	})

	it('keeps a textarea four rows high without an override', async () => {
		const wrapper = mountForm({ fieldOverrides: { description: { widget: 'textarea' } } })
		await flush()

		expect(wrapper.find('[data-cn-field="description"] textarea').attributes('rows')).toBe('4')
	})
})
