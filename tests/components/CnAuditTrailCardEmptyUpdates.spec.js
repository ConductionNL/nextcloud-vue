/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An update that changed nothing (a re-save whose `changed` only carries
 * `@self` bookkeeping or equal old and new values) is not an event, so the
 * history leaves it out (DqHandhaving Historie: eight "Advies bijgewerkt ·
 * System" rows where the board lists what happened).
 */
const { mount, flushPromises } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

const ENTRIES = [
	{ id: '1', action: 'update', user: 'System', creationDateTime: '2026-10-26T11:52:52', changed: { inspection: { old: null, new: null }, '@self': { old: { name: 'a' }, new: { name: 'a' } } } },
	{ id: '2', action: 'update', user: 'System', creationDateTime: '2026-10-25T14:55:28', changed: { matrixVersion: { old: 1, new: 2 } } },
	{ id: '3', action: 'update', user: 'System', creationDateTime: '2026-10-25T10:00:00' },
	{ id: '4', action: 'create', user: 'System', creationDateTime: '2026-10-24T13:37:00' },
]

describe('CnAuditTrailCard empty updates', () => {
	it('leaves out an update that changed no field and keeps the rest', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
		const w = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o' } })
		await flushPromises()
		expect(w.vm.shownEntries.map((entry) => entry.id)).toEqual(['2', '3', '4'])
		w.unmount()
	})
})
