/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A card that leaves out actions and actors asks the trail to leave them out
 * too (`action[notIn]`, `user[notIn]`, OpenRegister audit-trail-not-in-filter),
 * on its own trail and on each related record's trail, so a busy object's
 * newest pages are not all reads and System bookkeeping (DqSociaalDomein side
 * Historie). The card keeps its own filter as a guard.
 */
const { mount, flushPromises } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

const page = (results) => ({ ok: true, json: () => Promise.resolve({ results }) })
const query = (url) => new URLSearchParams(String(url).split('?')[1] || '')

describe('CnAuditTrailCard exclusions in the query', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('asks the object trail to leave out the excluded actions and actors', async () => {
		global.fetch = jest.fn().mockResolvedValue(page([]))
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', excludeActions: ['read', 'lock'], excludeActors: ['System'] } })
		await flushPromises()
		const params = query(global.fetch.mock.calls[0][0])
		expect(params.get('action[notIn]')).toBe('read,lock')
		expect(params.get('user[notIn]')).toBe('System')
		w.unmount()
	})

	it('asks each related record\'s trail the same', async () => {
		global.fetch = jest.fn((url) => {
			if (String(url).includes('/objects/r/consent?')) {
				return Promise.resolve(page([{ id: 'c1' }]))
			}
			return Promise.resolve(page([]))
		})
		const w = mount(CnAuditTrailCard, {
			propsData: {
				register: 'r',
				schema: 's',
				objectId: 'o',
				excludeActions: ['read'],
				excludeActors: ['System'],
				relatedSources: [{ as: 'consent', register: 'r', schema: 'consent', filter: { case: '@objectId' }, limit: 3 }],
			},
		})
		await flushPromises()
		const trail = global.fetch.mock.calls.map((call) => String(call[0])).find((url) => url.includes('/objects/r/consent/c1/audit-trails'))
		expect(trail).toBeTruthy()
		expect(query(trail).get('action[notIn]')).toBe('read')
		expect(query(trail).get('user[notIn]')).toBe('System')
		w.unmount()
	})

	it('sends no exclusion when it leaves nothing out', async () => {
		global.fetch = jest.fn().mockResolvedValue(page([]))
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o' } })
		await flushPromises()
		const params = query(global.fetch.mock.calls[0][0])
		expect(params.has('action[notIn]')).toBe(false)
		expect(params.has('user[notIn]')).toBe(false)
		w.unmount()
	})

	it('still leaves out what an older trail answers anyway', async () => {
		global.fetch = jest.fn().mockResolvedValue(page([
			{ id: 'r1', action: 'read', user: 'pieter', creationDateTime: '2026-10-14T11:06:00' },
			{ id: 's1', action: 'update', user: 'System', creationDateTime: '2026-10-14T11:05:30' },
			{ id: 'd1', action: 'file.downloaded', user: 'fatma.kaya', creationDateTime: '2026-10-14T11:05:00' },
		]))
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', excludeActions: ['read'], excludeActors: ['System'], maxDisplay: 3 } })
		await flushPromises()
		expect(w.vm.shownEntries.map((entry) => entry.id)).toEqual(['d1'])
		w.unmount()
	})
})
