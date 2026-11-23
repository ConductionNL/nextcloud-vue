/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The notes, history and appointments cards read a flow task (or any
 * endpoint) instead of an OpenRegister object.
 *
 * @spec openspec/changes/leaf-cards-read-a-source/specs/leaf-cards-read-a-source/spec.md#requirement-a-leaf-card-reads-a-source-or-an-endpoint
 */
jest.mock('../../src/utils/index.js', () => ({
	buildHeaders: () => ({}),
	prefixUrl: (url) => url,
}))

import { flushPromises, mount } from '@vue/test-utils'
import CnAuditTrailCard from '../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue'
import CnAuditTrailWidget from '../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue'
import CnEventsCard from '../../src/components/CnEventsCard/CnEventsCard.vue'
import CnNotesCard from '../../src/components/CnNotesCard/CnNotesCard.vue'
import { leafSourceUrl } from '../../src/utils/leafSourceUrl.js'

const CardStub = { template: '<div class="card"><slot /><slot name="footer" /></div>' }

/**
 * @param {number} status The HTTP status.
 * @param {unknown} body The JSON body.
 * @return {object} A fetch response.
 */
function respond(status, body) {
	return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
}

beforeEach(() => {
	global.fetch = jest.fn(() => respond(200, { results: [] }))
})

describe('leafSourceUrl', () => {
	it('builds the flow-task leaf URL, taking the page record for a missing id or @objectId', () => {
		expect(leafSourceUrl({ source: { kind: 'flow-task', id: 't-1' } }, 'notes')).toBe('/apps/openregister/api/flow-tasks/t-1/notes')
		expect(leafSourceUrl({ source: { kind: 'flow-task', id: '@objectId' }, objectId: 't-2' }, 'audit')).toBe('/apps/openregister/api/flow-tasks/t-2/audit')
		expect(leafSourceUrl({ source: { kind: 'flow-task' }, objectId: '' }, 'events')).toBe('')
	})

	it('prefers an endpoint, and reads nothing of its own without a known source', () => {
		expect(leafSourceUrl({ endpoint: '/apps/x/api/things/{id}/notes', objectId: 'a b' }, 'notes')).toBe('/apps/x/api/things/a%20b/notes')
		expect(leafSourceUrl({ source: { kind: 'unknown' } }, 'notes')).toBeNull()
		expect(leafSourceUrl({}, 'notes')).toBeNull()
	})
})

describe('CnNotesCard with a source', () => {
	it('lists, adds and deletes through the task notes, and lets the author delete their own', async () => {
		global.fetch = jest.fn((url, init) => {
			if (init && init.method === 'POST') {
				return respond(201, { id: 9 })
			}
			if (init && init.method === 'DELETE') {
				return respond(200, {})
			}
			return respond(200, { results: [{ id: 1, message: 'Gebeld', actorId: 'pieter', actorDisplayName: 'Pieter', createdAt: '2026-10-20T10:00:00Z', isCurrentUser: true }] })
		})
		const w = mount(CnNotesCard, { props: { source: { kind: 'flow-task', id: '@objectId' }, objectId: 't-1' }, global: { stubs: { CnDetailCard: CardStub, CnNoteComposer: true, CnUserActionMenu: true } } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/t-1/notes', expect.anything())
		const remove = w.find('[aria-label="Delete note"]')
		expect(remove.exists()).toBe(true)
		await remove.trigger('click')
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/t-1/notes/1', expect.objectContaining({ method: 'DELETE' }))
	})

	it('says a failed read failed instead of showing no notes', async () => {
		global.fetch = jest.fn(() => respond(403, { error: 'Not yours' }))
		const w = mount(CnNotesCard, { props: { source: { kind: 'flow-task' }, objectId: 't-1' }, global: { stubs: { CnDetailCard: CardStub, CnNoteComposer: true } } })
		await flushPromises()
		expect(w.find('[data-testid="cn-notes-card-failed"]').text()).toBe('The notes could not be loaded')
	})
})

describe('CnAuditTrailCard with a source', () => {
	it('reads the task trail oldest first, with the state, the performer and refusals', async () => {
		global.fetch = jest.fn(() => respond(200, { results: [
			{ id: 2, action: 'complete', stateAfter: 'active', actor: 'lars', authorized: false, reason: 'Not the assignee', created: '2026-10-20T11:00:00Z' },
			{ id: 1, action: 'create', stateAfter: 'available', actor: 'flow', performerType: 'flow', onBehalfOf: 'pieter', created: '2026-10-20T09:00:00Z' },
		] }))
		const w = mount(CnAuditTrailCard, { props: { source: { kind: 'flow-task' }, objectId: 't-1' }, global: { stubs: { CnDetailCard: CardStub } } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/t-1/audit', expect.anything())
		const rows = w.findAll('.cn-audit-card__row')
		expect(rows[0].find('.cn-audit-card__action').text()).toBe('create (available)')
		expect(rows[0].find('.cn-audit-card__actor').text()).toBe('flow (flow) on behalf of pieter')
		expect(rows[1].find('[data-testid="cn-audit-card-refused"]').text()).toBe('(refused)')
		expect(rows[1].find('.cn-audit-card__reason').text()).toBe('Not the assignee')
	})

	it('reaches the card through the audit-trail widget content', async () => {
		mount(CnAuditTrailWidget, { props: { objectId: 't-3', content: { source: { kind: 'flow-task' } } }, global: { stubs: { CnDetailCard: CardStub } } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledWith('/apps/openregister/api/flow-tasks/t-3/audit', expect.anything())
	})
})

describe('CnEventsCard', () => {
	it('lists the appointments with their time and place', async () => {
		global.fetch = jest.fn(() => respond(200, { results: [{ id: 'e1', summary: 'Locatiebezoek', dtstart: '2026-10-21T09:00:00Z', dtend: '2026-10-21T10:00:00Z', location: 'Lindelaan 4' }, { id: 'e2' }] }))
		const w = mount(CnEventsCard, { props: { content: { source: { kind: 'flow-task' } }, objectId: 't-1' } })
		await flushPromises()
		const events = w.findAll('[data-testid="cn-events-card-event"]')
		expect(events).toHaveLength(2)
		expect(events[0].text()).toContain('Locatiebezoek')
		expect(events[0].text()).toContain('Lindelaan 4')
		expect(events[1].find('.cn-events-card__summary').text()).toBe('Appointment')
	})

	it('tells empty from failed', async () => {
		const empty = mount(CnEventsCard, { props: { source: { kind: 'flow-task' }, objectId: 't-1', content: { emptyText: 'Nobody booked one' } } })
		await flushPromises()
		expect(empty.find('[data-testid="cn-events-card-empty"]').text()).toBe('Nobody booked one')
		global.fetch = jest.fn(() => respond(500, {}))
		const failed = mount(CnEventsCard, { props: { source: { kind: 'flow-task' }, objectId: 't-1' } })
		await flushPromises()
		expect(failed.find('[data-testid="cn-events-card-failed"]').text()).toBe('The appointments could not be loaded')
	})
})
