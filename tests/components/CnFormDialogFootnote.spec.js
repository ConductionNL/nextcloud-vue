/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A form can close on a note under its fields: board PqTicketBewerken ends the
 * ticket edit form with "De status wijzig je hier niet: ...". A detail page
 * gives its record edit form that note through `editFootnote`.
 *
 * @spec openspec/changes/form-dialog-footnote/specs/form-dialog/spec.md#requirement-a-form-can-close-on-a-note
 */
import { mount } from '@vue/test-utils'
import CnDetailPage from '@/components/CnDetailPage/CnDetailPage.vue'
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

const schema = { title: 'Ticket', properties: { title: { type: 'string', title: 'Title' } } }

function mountForm(propsData = {}) {
	useObjectStore.mockReturnValue({
		fetchCollectionForOptions: jest.fn(() => Promise.resolve([])),
		createObjectTypeSlug: (register, slug) => `${register}/${slug}`,
		registerObjectType: jest.fn(),
		objectTypeRegistry: {},
		fetchObject: jest.fn(() => Promise.resolve(null)),
	})
	return mount(CnFormDialog, { propsData: { schema, item: null, register: 'pipelinq', ...propsData }, stubs })
}

describe('CnFormDialog footnote', () => {
	it('closes the form on the note under the fields', async () => {
		const wrapper = mountForm({ footnote: 'The status changes through the steps.' })
		await flush()
		const note = wrapper.find('[data-testid="cn-form-dialog-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('The status changes through the steps.')
		const fields = wrapper.findAll('[data-cn-field]')
		expect(fields.at(fields.length - 1).element.compareDocumentPosition(note.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	})

	it('draws no note by default', async () => {
		const wrapper = mountForm()
		await flush()
		expect(wrapper.find('[data-testid="cn-form-dialog-footnote"]').exists()).toBe(false)
	})
})

describe('CnDetailPage editFootnote', () => {
	it('gives the record edit form the configured note, translated', async () => {
		const wrapper = mount(CnDetailPage, {
			propsData: {
				title: 'Ticket',
				register: 'pipelinq',
				schema: 'ticket',
				objectId: 't-1',
				editFootnote: 'The status changes through the steps.',
				objectStore: {
					objects: { 'pipelinq-ticket': { 't-1': { id: 't-1' } } },
					schemas: { 'pipelinq-ticket': schema },
					objectTypeRegistry: { 'pipelinq-ticket': {} },
					registerObjectType: jest.fn(),
					fetchObject: jest.fn(async () => null),
					fetchSchema: jest.fn(async () => null),
				},
			},
			provide: { cnTranslate: (key) => ({ 'The status changes through the steps.': 'De status verandert via de stappen.' }[key] || key) },
			mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
			stubs: { CnFormDialog: { name: 'CnFormDialog', props: ['footnote'], template: '<div />' } },
		})
		await wrapper.setData({ editFormOpen: true })
		expect(wrapper.findComponent({ name: 'CnFormDialog' }).props().footnote).toBe('De status verandert via de stappen.')
	})
})
