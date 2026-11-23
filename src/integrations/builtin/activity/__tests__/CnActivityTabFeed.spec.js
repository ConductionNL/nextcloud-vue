/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActivityTab reading openregister's merged feed.
 *
 * The wire names are assumed (activityFeedWire.js); these tests pin the tab to
 * that file, so the measured shape changes one place.
 *
 * @spec openspec/changes/the-activity-tab-reads-the-merged-feed/tasks.md#task-1
 */
const { flushPromises, mount } = require('@vue/test-utils')
const CnActivityTab = require('../CnActivityTab.vue').default
const { activityIntegration } = require('../../activity.js')

const PROPS = { objectId: 'obj-1', register: 'reg', schema: 'schema' }
const now = Date.now()

const row = (overrides) => ({ id: 'r', kind: 'audit', subject: 'Changed status', actor: 'alice', timestamp: new Date(now).toISOString(), ...overrides })
const FEED = {
	results: [
		row({ id: 'a1', kind: 'audit', subject: 'Status changed to Approved' }),
		row({ id: 'f1', kind: 'file', subject: 'report.pdf was attached' }),
		row({ id: 'n1', kind: 'note', subject: 'Called the applicant' }),
		row({ id: 'm1', kind: 'mail', subject: 'Letter sent to the applicant' }),
	],
	cursor: null,
	counts: { audit: 1, file: 1, note: 1, mail: 1, activity: 0 },
}
const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('csv') })

function routed(responder) {
	return jest.fn((url, init) => {
		if (url.includes('/integrations/activity/')) {
			return Promise.resolve(ok({ results: [] }))
		}
		return Promise.resolve(responder(url, init))
	})
}
const feedCalls = () => global.fetch.mock.calls.filter(([url]) => url.includes('/activity-feed?'))
async function mountTab(props = {}, provide = {}) {
	const w = mount(CnActivityTab, { props: { ...PROPS, ...props }, global: { provide } })
	await flushPromises()
	await flushPromises()
	return w
}

describe('CnActivityTab merged feed', () => {
	afterEach(() => {
		delete global.fetch
		localStorage.clear()
	})

	it('shows file, note and mail rows beside the change, newest first, in one list', async () => {
		global.fetch = routed(() => ok(FEED))
		const w = await mountTab()
		expect(feedCalls()).toHaveLength(1)
		expect(feedCalls()[0][0]).toContain('/objects/reg/schema/obj-1/activity-feed?')
		const text = w.text()
		for (const subject of ['Status changed to Approved', 'report.pdf was attached', 'Called the applicant', 'Letter sent to the applicant']) {
			expect(text).toContain(subject)
		}
		expect(w.findAll('.cn-activity-tab__row')).toHaveLength(4)
	})

	it('the single-source mode does not show the file row (mutation guard: the merged read is what shows it)', async () => {
		global.fetch = routed((url) => (url.includes('/activity-feed') ? ok(FEED) : ok({ results: [row({ id: 'x', kind: undefined, subject: 'Only an NC Activity row' })], nextCursor: null })))
		const w = await mountTab({ legacyFeed: true })
		expect(feedCalls()).toHaveLength(0)
		expect(w.text()).not.toContain('report.pdf was attached')
		expect(w.text()).toContain('Only an NC Activity row')
	})

	it('renders a chip per kind with the engine\'s count, and a chip at zero stays', async () => {
		global.fetch = routed(() => ok({ results: [row({ id: 'f1', kind: 'file', subject: 'report.pdf' })], cursor: null, counts: { file: 1, audit: 0, activity: 0, note: 0, mail: 0 } }))
		const w = await mountTab()
		expect(w.findAll('.cn-activity-tab__kind')).toHaveLength(5)
		expect(w.get('[data-testid="cn-activity-kind-count-file"]').text()).toBe('1')
		expect(w.get('[data-testid="cn-activity-kind-note"]').exists()).toBe(true)
		expect(w.get('[data-testid="cn-activity-kind-count-note"]').text()).toBe('0')
	})

	it('choosing a kind narrows the request to it', async () => {
		global.fetch = routed(() => ok(FEED))
		const w = await mountTab()
		await w.get('[data-testid="cn-activity-kind-file"]').trigger('click')
		await flushPromises()
		expect(feedCalls().at(-1)[0]).toContain('kinds=file')
		expect(w.get('[data-testid="cn-activity-kind-file"]').attributes('aria-pressed')).toBe('true')
	})

	it('pages on the feed\'s time cursor', async () => {
		const cursor = '2026-01-01T09:00:00+00:00'
		global.fetch = routed((url) => (url.includes('cursor=')
			? ok({ results: [row({ id: 'p2', subject: 'Second page row' })], cursor: null, counts: {} })
			: ok({ results: [row({ id: 'p1', subject: 'First page row' })], cursor, counts: {} })))
		const w = await mountTab()
		expect(w.vm.hasMore).toBe(true)
		await w.vm.loadMore()
		await flushPromises()
		expect(feedCalls().at(-1)[0]).toContain(`cursor=${encodeURIComponent(cursor)}`)
		expect(w.text()).toContain('First page row')
		expect(w.text()).toContain('Second page row')
	})

	it('falls back to the single-source endpoint when the server has no merged feed', async () => {
		global.fetch = routed((url) => (url.includes('/activity-feed') ? { ok: false, status: 404, json: () => Promise.resolve({}) } : ok({ results: [row({ id: 'x', kind: undefined, subject: 'Legacy row' })], nextCursor: null })))
		const w = await mountTab()
		expect(w.text()).toContain('Legacy row')
		expect(w.vm.legacy).toBe(true)
		expect(w.find('[data-testid="cn-activity-kinds"]').exists()).toBe(false)
	})
})

describe('CnActivityTab reads', () => {
	afterEach(() => {
		delete global.fetch
		localStorage.clear()
	})

	const mixed = {
		results: [
			row({ id: 'r1', kind: 'audit', action: 'read', subject: 'Case opened by bob' }),
			row({ id: 'n1', kind: 'note', action: 'read', subject: 'A note whose action is spelled read' }),
			row({ id: 'a1', kind: 'audit', action: 'update', subject: 'Status changed' }),
		],
		cursor: null,
		counts: { audit: 2, note: 1 },
	}

	it('are off by default: not requested, and an audit read is not shown, but a note spelled read is', async () => {
		global.fetch = routed(() => ok(mixed))
		const w = await mountTab()
		expect(feedCalls()[0][0]).not.toContain('reads=')
		expect(w.text()).not.toContain('Case opened by bob')
		expect(w.text()).toContain('A note whose action is spelled read')
		expect(w.text()).toContain('Status changed')
	})

	it('turning them on shows them and asks for them', async () => {
		global.fetch = routed(() => ok(mixed))
		const w = await mountTab()
		await w.get('[data-testid="cn-activity-reads"]').setValue(true)
		await flushPromises()
		expect(feedCalls().at(-1)[0]).toContain('reads=1')
		expect(w.text()).toContain('Case opened by bob')
	})

	it('the choice survives a remount, per user, through the preferences', async () => {
		global.fetch = routed(() => ok(mixed))
		const store = {}
		const prefs = {
			read: jest.fn(async (key, fallback) => (key in store ? store[key] : fallback)),
			write: jest.fn(async (key, value) => {
				store[key] = value
			}),
		}
		const first = await mountTab({}, { cnUserPreferences: prefs })
		await first.get('[data-testid="cn-activity-reads"]').setValue(true)
		await flushPromises()
		expect(prefs.write).toHaveBeenCalledWith('activity.showReads', true)
		first.unmount()

		const second = await mountTab({}, { cnUserPreferences: prefs })
		expect(second.get('[data-testid="cn-activity-reads"]').element.checked).toBe(true)
		expect(second.text()).toContain('Case opened by bob')
	})

	it('without a preference group it remembers in the browser', async () => {
		global.fetch = routed(() => ok(mixed))
		const first = await mountTab()
		await first.get('[data-testid="cn-activity-reads"]').setValue(true)
		first.unmount()
		const second = await mountTab()
		expect(second.get('[data-testid="cn-activity-reads"]').element.checked).toBe(true)
	})
})

describe('CnActivityTab range and export', () => {
	afterEach(() => {
		delete global.fetch
		localStorage.clear()
	})

	it('from and until go to the feed as a range', async () => {
		global.fetch = routed(() => ok(FEED))
		const w = await mountTab()
		await w.get('[data-testid="cn-activity-from"]').setValue('2026-01-05')
		await w.get('[data-testid="cn-activity-until"]').setValue('2026-01-09')
		await flushPromises()
		const query = new URLSearchParams(feedCalls().at(-1)[0].split('?')[1])
		expect(new Date(query.get('from')).getTime()).toBe(new Date('2026-01-05T00:00:00').getTime())
		expect(new Date(query.get('until')).getTime()).toBe(new Date('2026-01-09T23:59:59.999').getTime())
	})

	it('a preset sets from and leaves until open', async () => {
		global.fetch = routed(() => ok(FEED))
		const w = await mountTab()
		const buttons = w.findAll('.cn-activity-tab__range-btn')
		await buttons[1].trigger('click')
		await flushPromises()
		expect(w.get('[data-testid="cn-activity-from"]').element.value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
		expect(w.get('[data-testid="cn-activity-until"]').element.value).toBe('')
		expect(feedCalls().at(-1)[0]).toContain('from=')
	})

	it('the export carries the rows on screen and the filters shown, and re-queries nothing', async () => {
		let exportInit = null
		global.fetch = routed((url, init) => {
			if (url.includes('/export')) {
				exportInit = init
				return ok('csv')
			}
			return ok(FEED)
		})
		global.URL.createObjectURL = jest.fn(() => 'blob:x')
		global.URL.revokeObjectURL = jest.fn()
		const w = await mountTab()
		await w.get('[data-testid="cn-activity-kind-file"]').trigger('click')
		await flushPromises()
		const before = feedCalls().length
		await w.vm.exportFeed()
		await flushPromises()
		const body = JSON.parse(exportInit.body)
		expect(exportInit.method).toBe('POST')
		expect(body.filters.kinds).toEqual(['file'])
		expect(body.rows.map((r) => r.id)).toEqual(['a1', 'f1', 'n1', 'm1'])
		expect(body.filters.cursor).toBeUndefined()
		expect(feedCalls()).toHaveLength(before)
		expect(w.emitted('exported')[0][0]).toBe(4)
		expect(global.URL.createObjectURL).toHaveBeenCalled()
	})

	it('has nothing to export on an empty feed', async () => {
		global.fetch = routed(() => ok({ results: [], cursor: null, counts: {} }))
		const w = await mountTab()
		expect(w.get('[data-testid="cn-activity-export"]').attributes('disabled')).toBeDefined()
	})
})

describe('the activity integration', () => {
	it('places the full merged feed as the expanded widget', () => {
		expect(activityIntegration.widgetExpanded).toBe(activityIntegration.tab)
	})
})
