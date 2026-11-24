/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof for `@conduction/nextcloud-vue/testing/performance`: the budget file
 * is validated, limits scale with the run's budget, and a load is measured to
 * the moment the page is ready AND its fetches have settled, on a scripted
 * page with a fake clock.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'
import {
	BUDGET_FILE,
	definePerformanceSpec,
	findBudgetFile,
	formatFailure,
	isTracked,
	loadBudget,
	measureLoad,
	measurePage,
	median,
	pageLimit,
	validateBudget,
} from '../../testing/performance.js'

const VALID = {
	app: 'dossiq',
	pages: [
		{ name: 'Cases', path: '/index.php/apps/dossiq/cases' },
		{ name: 'Inbox', path: '/index.php/apps/dossiq/inbox', ready: '[data-testid="inbox"]' },
	],
	exceptions: [
		{ page: 'Inbox', budgetMs: 600, reason: 'Inbox list waits on the mail index (perf-server)', expires: '2026-12-31' },
		{ request: 'GET /index.php/apps/openregister/api/objects/*', budgetMs: 250, reason: 'Unindexed search, fix in flight', expires: '2026-12-31' },
	],
}

/**
 * A fake request.
 *
 * @param {string} url URL.
 * @param {string} [type] Resource type.
 * @return {object}
 */
function request(url, type = 'fetch') {
	return { url: () => url, method: () => 'GET', resourceType: () => type }
}

/**
 * A scripted page on a fake clock. `timeline[t]` is the change at time t:
 * `{ ready, busy, start: [requests], finish: [requests] }`. Every
 * `waitForTimeout` advances the clock and fires the scripted events.
 *
 * @param {object} timeline Changes keyed by ms since navigation.
 * @return {{page: object, clock: () => number}}
 */
function scriptedPage(timeline) {
	let now = 1000
	const handlers = { request: [], requestfinished: [], requestfailed: [] }
	const fire = (event, req) => handlers[event].forEach((h) => h(req))
	const tick = () => {
		const state = timeline[now - 1000] || {}
		;(state.start || []).forEach((r) => fire('request', r))
		;(state.finish || []).forEach((r) => fire('requestfinished', r))
		return state
	}
	let current = {}
	const page = {
		on: (event, h) => handlers[event].push(h),
		off: (event, h) => {
			handlers[event] = handlers[event].filter((x) => x !== h)
		},
		goto: async () => {
			current = tick()
		},
		evaluate: async () => ({ ready: Boolean(current.ready), busy: Boolean(current.busy) }),
		waitForTimeout: async (ms) => {
			now += ms
			current = { ...current, ...tick() }
		},
	}
	return { page, clock: () => now }
}

describe('validateBudget', () => {
	it('accepts a complete declaration', () => {
		expect(validateBudget(VALID)).toEqual([])
	})

	it('requires an app, at least one page and paths that start with /', () => {
		const problems = validateBudget({ app: '', pages: [{ name: 'A', path: 'apps/x' }] })
		expect(problems).toEqual(expect.arrayContaining([
			'"app" must name the app id',
			'pages[0] ("A") needs a "path" starting with /',
		]))
		expect(validateBudget({ app: 'x', pages: [] })).toContain('"pages" must list at least one main page')
	})

	it('refuses an exception without a reason, an expiry, or a known page', () => {
		const problems = validateBudget({
			app: 'x',
			pages: [{ name: 'A', path: '/a' }],
			exceptions: [{ page: 'B', budgetMs: 500, reason: '', expires: 'soon' }],
		})
		expect(problems).toEqual([
			'exceptions[0] names page "B", which is not in "pages"',
			'exceptions[0] needs a "reason" that says why',
			'exceptions[0] needs an "expires" date as YYYY-MM-DD',
		])
	})
})

describe('pageLimit', () => {
	const now = new Date('2026-11-24T12:00:00Z')

	it('holds a page to the run budget, 300 ms by default', () => {
		expect(pageLimit(VALID, 'Cases', { env: {}, now }).limitMs).toBe(300)
		expect(pageLimit(VALID, 'Cases', { env: { PERF_PAGE_BUDGET_MS: '1000' }, now }).limitMs).toBe(1000)
	})

	it('scales an exception by the same factor as the run budget', () => {
		expect(pageLimit(VALID, 'Inbox', { env: {}, now }).limitMs).toBe(600)
		expect(pageLimit(VALID, 'Inbox', { env: { PERF_PAGE_BUDGET_MS: '1000' }, now }).limitMs).toBe(2000)
	})

	it('drops an expired exception and reports it', () => {
		const limit = pageLimit(VALID, 'Inbox', { env: {}, now: new Date('2027-01-01T00:00:00Z') })
		expect(limit.limitMs).toBe(300)
		expect(limit.expired.expires).toBe('2026-12-31')
	})
})

describe('findBudgetFile and loadBudget', () => {
	it('finds tests/performance/budget.json from a subdirectory of the app', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-'))
		fs.mkdirSync(path.join(root, 'tests', 'performance'), { recursive: true })
		fs.mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true })
		fs.writeFileSync(path.join(root, BUDGET_FILE), JSON.stringify(VALID))
		expect(findBudgetFile({ cwd: path.join(root, 'tests', 'e2e'), env: {} })).toBe(path.join(root, BUDGET_FILE))
		expect(loadBudget({ cwd: root, env: {} }).pages).toHaveLength(2)
	})

	it('throws on an invalid file, naming every problem', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-'))
		const file = path.join(root, 'budget.json')
		fs.writeFileSync(file, JSON.stringify({ app: 'x', pages: [] }))
		expect(() => loadBudget({ file, env: {} })).toThrow('"pages" must list at least one main page')
	})
})

describe('isTracked', () => {
	it('counts fetch and XHR, not documents or heartbeats', () => {
		expect(isTracked(request('/apps/dossiq/api/cases'))).toBe(true)
		expect(isTracked(request('/apps/dossiq/api/cases', 'xhr'))).toBe(true)
		expect(isTracked(request('/apps/dossiq/js/main.js', 'script'))).toBe(false)
		expect(isTracked(request('/index.php/apps/user_status/api/v1/heartbeat'))).toBe(false)
	})
})

describe('measureLoad', () => {
	it('ends at the last fetch when the landmark was already visible', async () => {
		const cases = request('/api/cases')
		const { page, clock } = scriptedPage({
			0: { ready: false, start: [cases] },
			50: { ready: true },
			120: { finish: [cases] },
		})
		const result = await measureLoad(page, '/x', { clock, quietMs: 100 })
		expect(result.usableMs).toBe(120)
		expect(result.requests).toEqual([{ method: 'GET', url: '/api/cases', ms: 120 }])
	})

	it('waits for a loading indicator to go away', async () => {
		const { page, clock } = scriptedPage({ 0: { ready: true, busy: true }, 200: { busy: false } })
		const result = await measureLoad(page, '/x', { clock, quietMs: 100 })
		expect(result.usableMs).toBe(200)
	})

	it('restarts the quiet window when a fetch starts inside it', async () => {
		const late = request('/api/late')
		const { page, clock } = scriptedPage({ 0: { ready: true }, 60: { start: [late] }, 300: { finish: [late] } })
		const result = await measureLoad(page, '/x', { clock, quietMs: 100 })
		expect(result.usableMs).toBe(300)
	})

	it('gives up at the timeout and names what is still pending', async () => {
		const stuck = request('/api/stuck')
		const { page, clock } = scriptedPage({ 0: { ready: true, start: [stuck] } })
		const result = await measureLoad(page, '/x', { clock, timeoutMs: 500 })
		expect(result.usableMs).toBeNull()
		expect(result.pending).toEqual(['GET /api/stuck'])
	})
})

describe('measurePage and formatFailure', () => {
	it('primes once, measures each run and reports the median', async () => {
		let loads = 0
		let clockNow = 0
		const durations = [900, 210, 260, 230]
		let readyAt = 0
		const page = {
			on: () => {},
			off: () => {},
			goto: async () => { readyAt = clockNow + durations[loads++] },
			evaluate: async () => ({ ready: clockNow >= readyAt, busy: false }),
			waitForTimeout: async (ms) => { clockNow += ms },
		}
		const result = await measurePage(page, VALID.pages[0], { runs: 3, clock: () => clockNow, quietMs: 0 })
		expect(loads).toBe(4)
		expect(result.loads).toEqual([210, 260, 230])
		expect(result.medianMs).toBe(230)
	})

	it('writes the measured loads and the slowest requests into the failure', () => {
		const text = formatFailure(
			{ name: 'Cases', path: '/c', loads: [410, 380, 420], medianMs: 410, failure: null, slowest: [{ ms: 290, method: 'GET', url: '/api/cases' }] },
			{ limitMs: 300, expired: null },
		)
		expect(text).toContain('usable in 410 ms (median of 410, 380, 420 ms), over its 300 ms budget')
		expect(text).toContain('290 ms  GET /api/cases')
	})
})

describe('median', () => {
	it('takes the middle value, or the mean of the two middle values', () => {
		expect(median([3, 1, 2])).toBe(2)
		expect(median([4, 1, 2, 3])).toBe(3)
	})
})

describe('definePerformanceSpec', () => {
	it('declares one test per page inside one describe block', () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-'))
		const file = path.join(root, 'budget.json')
		fs.writeFileSync(file, JSON.stringify(VALID))
		const titles = []
		const test = (title) => titles.push(title)
		test.describe = (title, body) => {
			titles.push(title)
			body()
		}
		definePerformanceSpec(test, { file, env: {} })
		expect(titles).toEqual([
			'performance budget (ADR-124)',
			'Cases is usable within its budget',
			'Inbox is usable within its budget',
		])
	})
})
