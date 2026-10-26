/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A history card can leave entries out by actor (`excludeActors`): the
 * DqSociaalDomein Historie lists what people did, not the System jobs that
 * rewrite a case's derived fields.
 *
 * @spec openspec/changes/audit-card-exclude-actors/specs/audit-trail/spec.md#requirement-a-history-card-can-leave-out-entries-by-actor
 */

const { flushPromises, mount } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default
const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

const ENTRIES = [
	{ id: '1', action: 'update', user: 'System', userName: 'System', creationDateTime: '2026-10-26T11:45:00Z' },
	{ id: '2', action: 'file.downloaded', user: 'fatma', userName: 'Fatma Kaya', creationDateTime: '2026-10-06T10:00:00Z' },
	{ id: '3', action: 'update', user: 'system', userName: 'System', creationDateTime: '2026-10-05T10:00:00Z' },
	{ id: '4', action: 'create', user: 'fatma', userName: 'Fatma Kaya', creationDateTime: '2026-10-03T10:00:00Z' },
]

function serve() {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
}

describe('audit trail excludeActors', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('leaves out the excluded actors, case-insensitive, and reads more than it shows', async () => {
		serve()
		const wrapper = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 'case', objectId: 'c-1', maxDisplay: 3, excludeActors: ['System'] } })
		await flushPromises()
		expect(wrapper.findAll('.cn-audit-card__row')).toHaveLength(2)
		expect(wrapper.text()).not.toContain('System')
		expect(global.fetch.mock.calls[0][0]).toContain('limit=30')
		wrapper.unmount()
	})

	it('the widget hands content.excludeActors to the card', () => {
		const wrapper = mount(CnAuditTrailWidget, {
			propsData: { register: 'r', schema: 'case', objectId: 'c-1', content: { excludeActors: ['System'] } },
			global: { stubs: { CnAuditTrailCard: true } },
		})
		expect(wrapper.findComponent({ name: 'CnAuditTrailCard' }).props('excludeActors')).toEqual(['System'])
	})
})
