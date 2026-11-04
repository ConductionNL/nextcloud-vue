/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Row actions as buttons on the row (board DqZaakBesluiten "Route van het
 * besluit": "Goedkeuren" and "Afwijzen" on the step that waits).
 *
 * @spec openspec/changes/record-list-inline-row-actions/specs/record-list-inline-row-actions/spec.md
 */
var mockRequest = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), request: (...a) => mockRequest(...a) } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (url) => `/nc${url}` }))

import { mount } from '@vue/test-utils'
import CnRecordListWidget from '../../src/components/CnRecordListWidget/CnRecordListWidget.vue'

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}

const RECORD = {
	route: [
		{ id: 's1', name: 'Drafted', state: 'done' },
		{ id: 's2', name: 'Team lead initials', state: 'waiting' },
	],
}

const WHEN_WAITING = { field: 'state', value: 'waiting' }

const CONTENT = {
	objectRows: { path: 'route' },
	presentation: 'rows',
	title: '{name}',
	rowActionsInline: true,
	rowActions: [
		{ label: 'Approve', variant: 'primary', ariaLabel: 'Approve: {name}', endpoint: '/apps/x/route/{id}/approve', visibleWhen: WHEN_WAITING },
		{ label: 'Reject', endpoint: '/apps/x/route/{id}/reject', visibleWhen: WHEN_WAITING },
		{ label: 'Read', href: '/apps/x/route/{id}', visibleWhen: { field: 'state', value: 'done' } },
	],
}

const NcButton = {
	name: 'NcButton',
	props: ['variant', 'href', 'target', 'ariaLabel'],
	emits: ['click'],
	template: '<button class="btn" :data-href="href" @click="$emit(\'click\')"><slot /></button>',
}

async function mountList(content = CONTENT) {
	const w = mount(CnRecordListWidget, {
		props: { content, objectId: 'c-1', objectData: RECORD },
		global: { stubs: { NcButton, NcActions: { name: 'NcActions', template: '<div class="menu"><slot /></div>' }, NcActionButton: { template: '<button class="item"><slot /></button>' }, NcActionLink: true } },
	})
	await flush()
	return w
}

describe('CnRecordListWidget rowActionsInline', () => {
	beforeEach(() => mockRequest.mockReset())

	it('draws the visible actions of a row as buttons, and no menu', async () => {
		const w = await mountList()
		const rows = w.findAll('[data-testid="cn-record-list-item"]')
		expect(rows).toHaveLength(2)
		expect(rows[1].findAllComponents(NcButton).map((b) => b.text())).toEqual(['Approve', 'Reject'])
		expect(w.find('.menu').exists()).toBe(false)
	})

	it('sets the variant and fills the accessible name from the row', async () => {
		const w = await mountList()
		const [approve, reject] = w.findAll('[data-testid="cn-record-list-item"]')[1].findAllComponents(NcButton)
		expect(approve.props('variant')).toBe('primary')
		expect(approve.props('ariaLabel')).toBe('Approve: Team lead initials')
		expect(reject.props('variant')).toBe('secondary')
	})

	it('links an entry with an href', async () => {
		const w = await mountList()
		const read = w.findAll('[data-testid="cn-record-list-item"]')[0].findComponent(NcButton)
		expect(read.props('href')).toBe('/apps/x/route/s1')
		await read.trigger('click')
		expect(mockRequest).not.toHaveBeenCalled()
	})

	it('runs the endpoint for that row when pressed', async () => {
		mockRequest.mockResolvedValue({ data: {} })
		const w = await mountList()
		await w.findAll('[data-testid="cn-record-list-item"]')[1].findComponent(NcButton).trigger('click')
		await flush()
		expect(mockRequest).toHaveBeenCalledTimes(1)
		expect(mockRequest.mock.calls[0][0].url).toContain('/apps/x/route/s2/approve')
	})

	it('keeps the menu without the key', async () => {
		const w = await mountList({ ...CONTENT, rowActionsInline: undefined })
		expect(w.find('.menu').exists()).toBe(true)
		expect(w.find('[data-testid="cn-record-list-row-actions-inline"]').exists()).toBe(false)
	})
})
