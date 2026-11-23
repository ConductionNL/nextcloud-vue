/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A history card can leave events out by action (`excludeActions`): the
 * DqZaaktype history card lists what changed, not every time someone opened
 * the case type ("read").
 *
 * @spec openspec/changes/audit-trail-exclude-actions/specs/audit-trail/spec.md#requirement-a-history-card-can-leave-out-events-by-action
 */

const { flushPromises, mount } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default
const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

const ENTRIES = [
	{ id: '1', action: 'read', actor: 'pieter', creationDateTime: '2026-10-03T10:00:00Z' },
	{ id: '2', action: 'update', actor: 'lars', creationDateTime: '2026-10-02T10:00:00Z' },
	{ id: '3', action: 'Read', actor: 'sanne', creationDateTime: '2026-10-01T10:00:00Z' },
	{ id: '4', action: 'create', actor: 'lars', creationDateTime: '2026-09-30T10:00:00Z' },
]

function serve() {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: ENTRIES }) })
}

describe('audit trail excludeActions', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('leaves out the excluded actions, case-insensitive, and counts only what it shows', async () => {
		serve()
		const wrapper = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 'caseType', objectId: 'ct-1', maxDisplay: 5, excludeActions: ['read'] } })
		await flushPromises()
		const rows = wrapper.findAll('.cn-audit-card__row')
		expect(rows).toHaveLength(2)
		expect(wrapper.text()).not.toContain('pieter')
		expect(wrapper.text()).not.toContain('Show all')
		wrapper.unmount()
	})

	it('asks for more rows than it shows when it leaves some out', async () => {
		serve()
		const wrapper = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 'caseType', objectId: 'ct-1', maxDisplay: 5, excludeActions: ['read'] } })
		await flushPromises()
		expect(global.fetch.mock.calls[0][0]).toContain('limit=50')
		wrapper.unmount()
	})

	it('shows every action without excludeActions', async () => {
		serve()
		const wrapper = mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 'caseType', objectId: 'ct-1', maxDisplay: 5 } })
		await flushPromises()
		expect(wrapper.findAll('.cn-audit-card__row')).toHaveLength(4)
		expect(global.fetch.mock.calls[0][0]).toContain('limit=5')
		wrapper.unmount()
	})

	it('the widget hands content.excludeActions to the card', () => {
		const wrapper = mount(CnAuditTrailWidget, {
			propsData: { register: 'r', schema: 'caseType', objectId: 'ct-1', content: { excludeActions: ['read'] } },
			global: { stubs: { CnAuditTrailCard: true } },
		})
		expect(wrapper.findComponent({ name: 'CnAuditTrailCard' }).props('excludeActions')).toEqual(['read'])
	})
})
