/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A record's edit form can carry an eyebrow over its title, and the eyebrow,
 * title and subtitle can name the record: PqTicketBewerken draws "Bewerken ·
 * PQ-2026-0417" over "Ticket bewerken" and "PQ-2026-0417 · Verzoek" under it.
 *
 * @spec openspec/changes/detail-edit-form-header-from-record/specs/detail-page/spec.md#requirement-the-edit-forms-header-can-name-the-record
 */
const { mount } = require('@vue/test-utils')

const CnDetailPage = require('../../src/components/CnDetailPage/CnDetailPage.vue').default

const SCHEMA = {
	title: 'Ticket',
	properties: {
		reference: { type: 'string' },
		ticketType: { type: 'string', enum: ['request', 'complaint'], 'x-enum-labels': { request: 'Request', complaint: 'Complaint' } },
	},
}

/**
 * Mount a ticket page with its edit form open.
 *
 * @param {object} extra Props merged over the base set.
 * @return {Promise<object>} The wrapper.
 */
async function mountEdit(extra) {
	const wrapper = mount(CnDetailPage, {
		propsData: {
			title: 'Ticket',
			register: 'pipelinq',
			schema: 'ticket',
			objectId: 't-1',
			objectStore: {
				objects: { 'pipelinq-ticket': { 't-1': { id: 't-1', reference: 'PQ-2026-0417', ticketType: 'request' } } },
				schemas: { 'pipelinq-ticket': SCHEMA },
				objectTypeRegistry: { 'pipelinq-ticket': {} },
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			...extra,
		},
		provide: { cnTranslate: (key) => ({ 'Edit · {reference}': 'Bewerken · {reference}', Request: 'Verzoek' }[key] || key) },
		mocks: { $route: { params: {}, query: {} }, $router: { push: jest.fn(), back: jest.fn() } },
		stubs: { CnFormDialog: { name: 'CnFormDialog', props: ['subtitle', 'dialogTitle', 'eyebrow'], template: '<div />' } },
	})
	await wrapper.setData({ editFormOpen: true })
	return wrapper
}

const dialog = (wrapper) => wrapper.findComponent({ name: 'CnFormDialog' }).props()

describe('CnDetailPage: the edit form header names the record', () => {
	it('gives the edit form the configured eyebrow, translated, with the record filled in', async () => {
		const wrapper = await mountEdit({ editEyebrow: 'Edit · {reference}', editSubtitle: '{reference} · {ticketType}' })
		expect(dialog(wrapper).eyebrow).toBe('Bewerken · PQ-2026-0417')
		expect(dialog(wrapper).subtitle).toBe('PQ-2026-0417 · Verzoek')
	})

	it('keeps a header without tokens as written and shows no eyebrow by default', async () => {
		const wrapper = await mountEdit({ editTitle: 'Edit ticket', editSubtitle: 'The ticket fields.' })
		expect(dialog(wrapper).eyebrow).toBe('')
		expect(dialog(wrapper).dialogTitle).toBe('Edit ticket')
		expect(dialog(wrapper).subtitle).toBe('The ticket fields.')
	})
})
