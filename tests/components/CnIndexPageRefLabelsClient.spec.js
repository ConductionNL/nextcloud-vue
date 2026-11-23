/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The PqTickets "Klant" column, as pipelinq declares it: the ticket holds the
 * client as a uuid (`format: "uuid"`, `$ref: "client"`, no register of its
 * own), and the column asks for the client's `name`. The batched reference
 * labels of index-ref-column-labels already cover it: one request for every
 * client on the page, in the page's own register, no request per row.
 *
 * @spec openspec/changes/screens-cell-date-parity/specs/cell-date-age/spec.md#requirement-a-reference-column-shows-the-referenced-name-from-one-batched-request
 */
import { flushPromises, mount } from '@vue/test-utils'

const mockSchemas = {}

// The page self-fetches when it has a register, so the store also answers the
// list composable: any other field reads as an empty map, any other method as
// a no-op that resolves.
const mockBase = {
	objects: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(function(slug, schema, register) { this.objectTypeRegistry[slug] = { schema, register } }),
	fetchCollectionForOptions: jest.fn(async () => [{ id: 'k1', name: 'M. de Graaf' }, { id: 'k2', name: 'Buurtvereniging Oost' }]),
	// The ticket schema, as the page fetches it in self-fetch mode.
	fetchSchema: jest.fn(async () => mockSchemas.ticket),
}
const mockStore = new Proxy(mockBase, {
	get(target, key) {
		if (!(key in target) && typeof key === 'string') {
			target[key] = /^(fetch|load|refresh|get|set|clear|save|delete|subscribe|unsubscribe)/.test(key) ? jest.fn(async () => null) : {}
		}
		return target[key]
	},
})
jest.mock('../../src/store/useObjectStore.js', () => ({ __esModule: true, useObjectStore: () => mockStore }))

import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { createRefLabelResolver } from '../../src/composables/useRefLabels.js'

const mockTicketSchema = {
	title: 'Ticket',
	properties: {
		title: { type: 'string' },
		client: { type: 'string', title: 'Client', format: 'uuid', $ref: 'client' },
	},
}
mockSchemas.ticket = mockTicketSchema
const rows = [
	{ id: 't1', title: 'Afvalpas werkt niet bij de container', client: 'k1' },
	{ id: 't2', title: 'Losse stoeptegels op het Kerkplein', client: 'k2' },
	{ id: 't3', title: 'Subsidie voor een straatfeest', client: 'k2' },
]
const stubs = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnRowActions: true, CnIndexSidebar: true }

function mountTickets() {
	return mount(CnIndexPage, {
		props: { title: 'Vragen en meldingen', schema: 'ticket', register: 'pipelinq', objects: rows, columns: [{ key: 'title' }, { key: 'client', label: 'Klant', labelField: 'name' }] },
		global: { stubs, mocks: { $router: { push: jest.fn() } }, provide: { cnManifest: null } },
	})
}

it('reads the client reference off the schema slug and the page register, and renders it through refLabel', async () => {
	const w = mountTickets()
	await flushPromises()
	expect(w.vm.refLabelSpecs).toEqual([{ key: 'client', labelField: 'name', register: 'pipelinq', schema: 'client', route: null, sortByLabel: false }])
	const col = w.vm.renderedColumns.find((c) => c.key === 'client')
	expect(col.widget).toBe('refLabel')
})

it('resolves every client of the page in one request, not one per row', async () => {
	mockBase.fetchCollectionForOptions.mockClear()
	const resolver = createRefLabelResolver(() => mockStore)
	const labels = await resolver.resolve('pipelinq', 'client', rows.map((r) => r.client), 'name')
	expect(mockBase.fetchCollectionForOptions).toHaveBeenCalledTimes(1)
	expect(mockBase.fetchCollectionForOptions.mock.calls[0][1]._ids).toBe('k1,k2')
	expect(labels).toEqual({ k1: 'M. de Graaf', k2: 'Buurtvereniging Oost' })
})
