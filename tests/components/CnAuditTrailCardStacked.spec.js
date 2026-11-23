/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqTaak "Historie": a stacked audit row puts the moment and who under the
 * action, and a person reads by name.
 *
 * @spec openspec/changes/audit-card-stacked-rows/specs/audit-trail/spec.md#requirement-an-audit-row-can-put-its-moment-under-the-action
 */
jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: (id) => ({ pieter: 'Pieter Jansen' })[id] || '' }))

const { mount, flushPromises } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

function mountCard(layout) {
	global.fetch = jest.fn().mockResolvedValueOnce({
		ok: true,
		json: () => Promise.resolve({ results: [{ id: '1', action: 'claim', actor: 'pieter', creationDateTime: '2026-10-06T09:05:00' }] }),
	})
	return mount(CnAuditTrailCard, { propsData: { register: 'r', schema: 's', objectId: 'o', layout, actionLabels: { claim: 'Picked up by {actor}' } } })
}

describe('CnAuditTrailCard stacked rows', () => {
	it('puts the moment under the action and names the person', async () => {
		const w = mountCard('stacked')
		await flushPromises()
		expect(w.find('.cn-audit-card__row--stacked').exists()).toBe(true)
		expect(w.find('.cn-audit-card__action').text()).toBe('Picked up by Pieter Jansen')
		const below = w.find('[data-testid="cn-audit-card-when-below"]').text()
		expect(below).toMatch(/09:05/)
		expect(w.find('.cn-audit-card__row-head .cn-audit-card__when').exists()).toBe(false)
		w.unmount()
	})

	it('keeps the moment beside the action by default', async () => {
		const w = mountCard('')
		await flushPromises()
		expect(w.find('.cn-audit-card__row-head .cn-audit-card__when').exists()).toBe(true)
		w.unmount()
	})
})
