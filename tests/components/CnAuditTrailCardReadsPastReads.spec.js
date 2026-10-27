/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every page view writes a read to an object's trail, so the newest page can
 * hold reads only. A card that leaves reads out reads on until it has
 * something to show (DqHandhaving Historie read "no changes yet").
 */
const { mount, flushPromises } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

const reads = (count, from) => Array.from({ length: count }, (_, i) => ({ id: `r${from + i}`, action: 'read', user: 'pieter', creationDateTime: '2026-10-27T10:00:00' }))
const page = (results) => ({ ok: true, json: () => Promise.resolve({ results }) })

describe('CnAuditTrailCard past read events', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('reads the next page when the newest holds only reads it leaves out', async () => {
		global.fetch = jest.fn()
			.mockResolvedValueOnce(page(reads(30, 0)))
			.mockResolvedValueOnce(page([...reads(5, 30), { id: 'c', action: 'create', user: 'System', creationDateTime: '2026-10-24T13:37:00' }]))
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', excludeActions: ['read'], maxDisplay: 3 } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledTimes(2)
		expect(global.fetch.mock.calls[1][0]).toContain('offset=30')
		expect(w.vm.shownEntries.map((entry) => entry.id)).toEqual(['c'])
		w.unmount()
	})

	it('stops after a short page, and reads one page when nothing is left out', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce(page(reads(4, 0)))
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', excludeActions: ['read'], maxDisplay: 3 } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		w.unmount()

		global.fetch = jest.fn().mockResolvedValueOnce(page(reads(3, 0)))
		const all = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', maxDisplay: 3 } })
		await flushPromises()
		expect(global.fetch).toHaveBeenCalledTimes(1)
		all.unmount()
	})
})
