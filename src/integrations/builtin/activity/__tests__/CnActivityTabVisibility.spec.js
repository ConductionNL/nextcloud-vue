/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/timeline-visibility-controls/tasks.md#task-2
 */
const { flushPromises, mount } = require('@vue/test-utils')
const CnActivityTab = require('../CnActivityTab.vue').default

const PROPS = { objectId: 'o1', register: 'reg', schema: 'sch', legacyFeed: true }
const entry = (id, extra = {}) => ({ id, type: 'comment', subject: `Entry ${id}`, actor_id: 'alice', timestamp: Math.floor(Date.now() / 1000), ...extra })
const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) })

function stubFetch(results) {
	global.fetch = jest.fn((url) => {
		if (url.includes('/integrations/activity/')) {
			return Promise.resolve(ok({ results: [], total: 0 }))
		}
		return Promise.resolve(ok({ results, total: results.length, nextCursor: null }))
	})
}
const entryCalls = () => global.fetch.mock.calls.map((c) => c[0]).filter((u) => !u.includes('/integrations/activity/'))

afterEach(() => {
	delete global.fetch
})

describe('CnActivityTab visibility', () => {
	it('shows no chip, no filter and sends no visibility by default', async () => {
		stubFetch([entry('a')])
		const w = mount(CnActivityTab, { props: PROPS })
		await flushPromises()
		expect(w.find('[data-testid="cn-activity-visibility"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-visibility-chip"]').exists()).toBe(false)
		expect(entryCalls().every((u) => !u.includes('visibility'))).toBe(true)
	})

	it('puts a chip on every row, internal when the entry has no flag', async () => {
		stubFetch([entry('a', { visibility: 'public' }), entry('b')])
		const w = mount(CnActivityTab, { props: { ...PROPS, showVisibility: true } })
		await flushPromises()
		const chips = w.findAll('[data-testid="cn-visibility-chip"]')
		expect(chips.map((c) => c.attributes('data-visibility'))).toEqual(['public', 'internal'])
		expect(chips[0].text()).toBe('Public')
	})

	it('refetches with visibility=public when the filter is set to public', async () => {
		stubFetch([entry('a')])
		const w = mount(CnActivityTab, { props: { ...PROPS, showVisibility: true } })
		await flushPromises()
		await w.get('[data-testid="cn-activity-visibility-select"]').setValue('public')
		await flushPromises()
		expect(entryCalls().at(-1)).toContain('visibility=public')
	})

	it('keeps the other filters when visibility is added', async () => {
		stubFetch([entry('a')])
		const w = mount(CnActivityTab, { props: { ...PROPS, showVisibility: true } })
		await flushPromises()
		await w.setData({ selectedActor: 'alice' })
		await w.get('[data-testid="cn-activity-visibility-select"]').setValue('internal')
		await flushPromises()
		const last = entryCalls().at(-1)
		expect(last).toContain('actor=alice')
		expect(last).toContain('visibility=internal')
	})

	it('fixes the filter at public with the reason for a public-view caller', async () => {
		stubFetch([entry('a', { visibility: 'public' })])
		const w = mount(CnActivityTab, { props: { ...PROPS, showVisibility: true, publicViewOnly: true } })
		await flushPromises()
		expect(w.find('[data-testid="cn-activity-visibility-select"]').exists()).toBe(false)
		expect(w.get('[data-testid="cn-activity-visibility-fixed"]').text()).toContain('You see the public entries only.')
		expect(entryCalls().at(-1)).toContain('visibility=public')
	})
})
