/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `scope: "app"` turns the audit-trail widget into the reader's whole feed
 * (the Zuiddrecht dashboard's "Recent activity"): no object needed, the
 * card reads OpenRegister's readable feed narrowed to register and schema.
 * Without it, a widget with no object still renders nothing.
 *
 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-audit-trail-widget-reads-the-app-wide-feed
 */
import { mount, shallowMount } from '@vue/test-utils'

const CnAuditTrailWidget = require('../../src/components/CnAuditTrailWidget/CnAuditTrailWidget.vue').default
const CnAuditTrailCard = require('../../src/components/CnAuditTrailCard/CnAuditTrailCard.vue').default

async function flush() {
	await new Promise((resolve) => setTimeout(resolve))
}

describe('CnAuditTrailWidget — app scope', () => {
	it('renders nothing without an object by default', () => {
		const wrapper = shallowMount(CnAuditTrailWidget, { propsData: { register: 'dossiq', schema: 'case' } })
		expect(wrapper.findComponent({ name: 'CnAuditTrailCard' }).exists()).toBe(false)
	})

	it('renders the card in app scope without an object, from the content blob too', () => {
		const byProp = shallowMount(CnAuditTrailWidget, { propsData: { register: 'dossiq', schema: 'case', scope: 'app' } })
		expect(byProp.findComponent({ name: 'CnAuditTrailCard' }).props()).toMatchObject({ scope: 'app', register: 'dossiq', schema: 'case', objectId: '' })
		const byContent = shallowMount(CnAuditTrailWidget, { propsData: { content: { scope: 'app', title: 'Recent activity' } } })
		expect(byContent.findComponent({ name: 'CnAuditTrailCard' }).props()).toMatchObject({ scope: 'app', title: 'Recent activity' })
	})
})

describe('CnAuditTrailCard — app scope', () => {
	afterEach(() => {
		delete global.fetch
	})

	it('reads the readable feed narrowed to register and schema and lists its rows', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ rows: [{ id: 1, action: 'update', actor: 'pieter', created: '2026-10-05T10:00:00Z' }], nextCursor: null }),
		})
		const wrapper = mount(CnAuditTrailCard, { propsData: { scope: 'app', register: 'dossiq', schema: 'case', maxDisplay: 3 } })
		await flush()
		await wrapper.vm.$nextTick()
		const url = global.fetch.mock.calls[0][0]
		expect(url).toContain('/apps/openregister/api/audit-trails/readable?')
		expect(url).toContain('limit=3')
		expect(url).toContain('register=dossiq')
		expect(url).toContain('schema=case')
		expect(url).not.toContain('/objects/')
		expect(wrapper.findAll('.cn-audit-card__row')).toHaveLength(1)
	})

	it('keeps the object trail for the default scope', async () => {
		global.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results: [] }) })
		mount(CnAuditTrailCard, { propsData: { register: 'dossiq', schema: 'case', objectId: 'o-1' } })
		await flush()
		expect(global.fetch.mock.calls[0][0]).toContain('/objects/dossiq/case/o-1/audit-trail?')
	})
})
