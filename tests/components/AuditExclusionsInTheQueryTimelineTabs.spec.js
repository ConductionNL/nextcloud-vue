/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A timeline that shows the audit trail and a tab that counts it leave out
 * actions and actors the way the History card does: they ask the trail to
 * leave them out too (`action[notIn]`, `user[notIn]`, OpenRegister
 * audit-trail-not-in-filter), so the first page they read is not all reads
 * and System bookkeeping. Both keep their own filter as a guard.
 *
 * @spec openspec/changes/audit-card-exclusions-in-the-query/specs/audit-trail/spec.md#requirement-a-timeline-and-a-tab-count-ask-the-trail-to-leave-out-what-they-hide
 */
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const { nextTick } = require('vue')
const CnTimelineWidget = require('../../src/components/CnTimelineWidget/CnTimelineWidget.vue').default
const CnTabsWidget = require('../../src/components/CnTabsWidget/CnTabsWidget.vue').default
const { auditExclusionParams } = require('../../src/utils/auditEntries.js')

async function flush() {
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

describe('audit exclusions in the query', () => {
	afterEach(() => {
		delete global.fetch
		axios.get.mockReset()
	})

	it('names the exclusions as trail parameters, and nothing when there are none', () => {
		expect(auditExclusionParams({ excludeActions: ['read', 'lock'], excludeActors: ['System'] })).toEqual({ 'action[notIn]': 'read,lock', 'user[notIn]': 'System' })
		expect(auditExclusionParams({ excludeActions: ['read'] })).toEqual({ 'action[notIn]': 'read' })
		expect(auditExclusionParams({})).toEqual({})
		expect(auditExclusionParams({ excludeActions: 'read' })).toEqual({})
	})

	it('a timeline asks its audit read to leave out what it hides', async () => {
		axios.get.mockResolvedValue({ data: { results: [] } })
		const w = mount(CnTimelineWidget, { props: { register: 'dossiq', schema: 'case', objectId: 'c1', content: { auditTrail: true, excludeActions: ['read'], excludeActors: ['System'] } } })
		await flushPromises()
		const call = axios.get.mock.calls.find(([url]) => String(url).includes('audit-trails'))
		expect(call[1].params).toEqual(expect.objectContaining({ 'action[notIn]': 'read', 'user[notIn]': 'System' }))
		w.unmount()
	})

	it('a tab that counts the history asks the trail the same', async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) })
		const w = mount(CnTabsWidget, {
			props: {
				content: { tabs: [{ widgetId: 'w-data' }, { widgetId: 'w-history', countFrom: { auditTrail: true, excludeActions: ['read'], excludeActors: ['System'] } }] },
				availableWidgets: [{ id: 'w-data', type: 'data', title: 'Overview' }, { id: 'w-history', type: 'audit-trail', title: 'History' }],
				objectId: 'c1',
				objectData: { id: 'c1' },
				register: 'dossiq',
				schema: 'case',
			},
			global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } } },
		})
		await flush()
		const params = new URLSearchParams(String(global.fetch.mock.calls[0][0]).split('?')[1])
		expect(params.get('limit')).toBe('100')
		expect(params.get('action[notIn]')).toBe('read')
		expect(params.get('user[notIn]')).toBe('System')
		w.unmount()
	})
})
