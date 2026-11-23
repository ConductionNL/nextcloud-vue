/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * One record page for several kinds of record (pipelinq's ticket page serves
 * requests and contact moments): a crumb can show for one kind only, and the
 * "what now" card can take its own steps per kind (`nextStep.variants`).
 *
 * @spec openspec/changes/detail-record-kind-variants/specs/detail-page/spec.md#requirement-a-crumb-can-show-for-one-kind-of-record
 * @spec openspec/changes/detail-record-kind-variants/specs/detail-page/spec.md#requirement-the-next-step-can-differ-per-kind-of-record
 */
import { flushPromises, shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

const BREADCRUMB = [
	{ label: 'Questions and reports', route: 'Tickets', visibleWhen: { field: 'ticketType', op: 'neq', value: 'interaction' } },
	{ label: 'Contact moments', route: 'ContactMoments', currentField: 'reference', visibleWhen: { field: 'ticketType', op: 'eq', value: 'interaction' } },
]

const NEXT_STEP = {
	stages: { in_progress: { title: 'What now? Step 2: in progress', checklist: [{ label: 'A handler is assigned', doneField: 'assignee' }] } },
	variants: [
		{
			when: { field: 'ticketType', op: 'eq', value: 'interaction' },
			stages: { in_progress: { title: 'What now? Step 2: in progress', checklist: [{ label: 'The customer is known', doneField: 'client' }, { label: 'The outcome is noted', doneField: 'outcome' }], after: 'A contact moment has no customer to answer.' } },
		},
	],
}

/**
 * @param {object} ticket The ticket.
 * @return {Promise<import('@vue/test-utils').VueWrapper>} The page.
 */
async function mountPage(ticket) {
	const w = shallowMount(CnDetailPage, {
		props: {
			title: 'Ticket',
			register: 'pipelinq',
			schema: 'ticket',
			objectId: 't-1',
			objectStore: {
				objects: { 'pipelinq-ticket': { 't-1': { id: 't-1', status: 'in_progress', reference: 'PQ-2026-0423', title: 'Telefoongesprek', ...ticket } } },
				schemas: {},
				objectTypeRegistry: {},
				registerObjectType: jest.fn(),
				fetchObject: jest.fn(async () => null),
				fetchSchema: jest.fn(async () => null),
			},
			widgets: [{ id: 'facts', type: 'facts' }],
			layout: [{ id: '0', widgetId: 'facts', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 2 }],
			breadcrumb: BREADCRUMB,
			nextStep: NEXT_STEP,
		},
		global: { mocks: { t: (_a, s) => s, $route: { params: {}, query: {}, name: 'ticket' }, $router: { push: jest.fn(), replace: jest.fn() } } },
	})
	await flushPromises()
	return w
}

describe('CnDetailPage: a crumb for one kind of record', () => {
	it('names the contact moments list and the reference on a contact moment', async () => {
		const crumbs = (await mountPage({ ticketType: 'interaction' })).vm.breadcrumbCrumbs
		expect(crumbs.map((crumb) => crumb.label)).toEqual(['Contact moments', 'PQ-2026-0423'])
		expect(crumbs[0].to).toEqual({ name: 'ContactMoments' })
	})

	it('keeps the requests list on a request', async () => {
		const crumbs = (await mountPage({ ticketType: 'request' })).vm.breadcrumbCrumbs
		expect(crumbs.map((crumb) => crumb.label)).toEqual(['Questions and reports', 'Telefoongesprek'])
	})
})

describe('CnDetailPage: the next step per kind of record', () => {
	it('takes the contact moment\'s own steps', async () => {
		const card = (await mountPage({ ticketType: 'interaction', client: 'c-1' })).vm.nextStepCard
		expect(card.items.map((item) => [item.label, item.done])).toEqual([['The customer is known', true], ['The outcome is noted', false]])
		expect(card.after).toBe('A contact moment has no customer to answer.')
	})

	it('keeps the declared steps for another kind', async () => {
		const card = (await mountPage({ ticketType: 'request' })).vm.nextStepCard
		expect(card.items.map((item) => item.label)).toEqual(['A handler is assigned'])
	})
})
