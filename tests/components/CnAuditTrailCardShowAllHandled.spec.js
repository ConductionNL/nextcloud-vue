/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A history card offers "Show all" only when its host handles it: the
 * audit-trail widget binds no listener, so on a detail page (DqZaaktype
 * "Historie", PqKassabon "Geschiedenis") the button did nothing.
 *
 * @spec openspec/changes/audit-card-show-all-when-handled/specs/audit-trail/spec.md#requirement-a-history-card-offers-show-all-only-when-its-host-handles-it
 */
jest.mock('../../src/utils/userDisplayName.js', () => ({ userDisplayName: () => '' }))

const { mount, flushPromises } = require('@vue/test-utils')
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default
const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default

const entries = Array.from({ length: 6 }, (_, i) => ({ id: String(i), action: 'update', actor: 'System', creationDateTime: `2026-10-0${i + 1}T09:05:00` }))

beforeEach(() => {
	global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: entries }) })
})

describe('CnAuditTrailCard show all', () => {
	it('draws no show-all footer in the audit-trail widget, which handles none', async () => {
		const w = mount(CnAuditTrailWidget, { props: { content: { register: 'r', schema: 's', objectId: 'o', maxDisplay: 3 } } })
		await flushPromises()
		expect(w.findAll('.cn-audit-card__row')).toHaveLength(3)
		expect(w.find('.cn-audit-card__show-all').exists()).toBe(false)
		expect(w.find('.cn-detail-card__footer').exists()).toBe(false)
		w.unmount()
	})

	it('draws it when the host listens for show-all, and emits on click', async () => {
		const onShowAll = jest.fn()
		const w = mount(CnAuditTrailCard, { props: { register: 'r', schema: 's', objectId: 'o', maxDisplay: 3, onShowAll } })
		await flushPromises()
		const button = w.find('.cn-audit-card__show-all')
		expect(button.exists()).toBe(true)
		await button.trigger('click')
		expect(onShowAll).toHaveBeenCalledTimes(1)
		w.unmount()
	})

	it('draws no footer for a host without a listener', async () => {
		const w = mount(CnAuditTrailCard, { props: { register: 'r', schema: 's', objectId: 'o', maxDisplay: 3 } })
		await flushPromises()
		expect(w.find('.cn-audit-card__show-all').exists()).toBe(false)
		w.unmount()
	})
})
