/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/testing/performance`: the fleet's page budget
 * (hydra ADR-124, "Speed is a test").
 *
 * Every main page of an app must be usable within 300 ms, warm. An app lists
 * its main pages in `tests/performance/budget.json` and adds one spec:
 *
 * ```ts
 * // tests/e2e/performance.spec.ts
 * import { test } from '@playwright/test'
 * import { definePerformanceSpec } from '@conduction/nextcloud-vue/testing/performance'
 *
 * definePerformanceSpec(test)
 * ```
 *
 * Each page is loaded once to prime the caches, then loaded
 * `PERF_PAGE_RUNS` times (default 3). The verdict is the median of the
 * measured loads against `PERF_PAGE_BUDGET_MS` (default 300; the shared CI
 * workflow sets 1000 on pull requests and pushes, because its runners are
 * shared and slower).
 *
 * "Usable" is measured from the start of the navigation to the moment all of
 * these hold, and stay true for a quiet window:
 *  - the document has loaded, so every bundle has run;
 *  - the page's ready selector (default: its `main` landmark) is visible;
 *  - no fetch or XHR request is in flight;
 *  - no loading indicator is visible.
 *
 * Like `testing/playwright`, this module imports nothing from Playwright and
 * is CommonJS, so it loads from `node_modules` in the runner it targets.
 *
 * @module testing/performance
 */

const fs = require('fs')
const path = require('path')
const { seedFirstVisitOverlaysSeen } = require('./playwright.js')

/** Target for a page, in ms, warm. */
const PAGE_TARGET_MS = 300

/** Target for an API request, in ms of server time. */
const API_TARGET_MS = 100

/** Where an app declares its budget, relative to the app root. */
const BUDGET_FILE = path.join('tests', 'performance', 'budget.json')

/** Selector used when a page declares no `ready` selector of its own. */
const DEFAULT_READY = 'main, [role="main"]'

/** Loading indicators that mean the page is not usable yet. */
const BUSY_SELECTOR = '[aria-busy="true"], .loading-icon, .icon-loading, .icon-loading-small'

/** How long the page must stay settled before the measurement ends. */
const QUIET_MS = 100

/**
 * Requests that never settle by design: presence heartbeats and push
 * channels. Everything else a page fetches counts.
 */
const IGNORED_REQUESTS = [
	/\/heartbeat(\?|$)/,
	/\/apps\/user_status\/api\/v1\/heartbeat/,
	/\/apps\/notify_push\//,
]

/**
 * Read a positive integer from the environment.
 *
 * @param {object} env Environment map.
 * @param {string} name Variable name.
 * @param {number} fallback Value when unset or not a positive integer.
 * @return {number}
 */
function envInt(env, name, fallback) {
	const value = Number.parseInt(String(env[name] ?? '').trim(), 10)
	return Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * Today as `YYYY-MM-DD`, in UTC.
 *
 * @param {Date} now Clock.
 * @return {string}
 */
function isoDay(now) {
	return now.toISOString().slice(0, 10)
}

/**
 * Find the budget file: an explicit path, `PERF_BUDGET_FILE`, or
 * `tests/performance/budget.json` in the working directory or a parent.
 *
 * @param {object} [options] Options.
 * @param {string} [options.file] Explicit path.
 * @param {object} [options.env] Environment map.
 * @param {string} [options.cwd] Start directory.
 * @return {string} Absolute path.
 * @throws {Error} When no budget file is found.
 */
function findBudgetFile(options = {}) {
	const env = options.env || process.env
	const explicit = options.file || env.PERF_BUDGET_FILE
	if (explicit) {
		return path.resolve(options.cwd || process.cwd(), explicit)
	}
	let dir = path.resolve(options.cwd || process.cwd())
	for (;;) {
		const candidate = path.join(dir, BUDGET_FILE)
		if (fs.existsSync(candidate)) {
			return candidate
		}
		const parent = path.dirname(dir)
		if (parent === dir) {
			throw new Error('No ' + BUDGET_FILE + ' found from ' + (options.cwd || process.cwd())
				+ '. Declare the app\'s main pages there (hydra ADR-124).')
		}
		dir = parent
	}
}

/**
 * Validate a budget declaration and return the problems found.
 *
 * @param {object} budget Parsed `budget.json`.
 * @return {string[]} One message per problem; empty when valid.
 */
function validateBudget(budget) {
	const problems = []
	if (!budget || typeof budget !== 'object' || Array.isArray(budget)) {
		return ['budget.json must be a JSON object']
	}
	if (typeof budget.app !== 'string' || budget.app.trim() === '') {
		problems.push('"app" must name the app id')
	}
	const pages = Array.isArray(budget.pages) ? budget.pages : []
	if (pages.length === 0) {
		problems.push('"pages" must list at least one main page')
	}
	const names = new Set()
	pages.forEach((page, i) => {
		const where = 'pages[' + i + ']'
		if (!page || typeof page.name !== 'string' || page.name.trim() === '') {
			problems.push(where + ' needs a "name"')
			return
		}
		if (names.has(page.name)) {
			problems.push(where + ' repeats the name "' + page.name + '"')
		}
		names.add(page.name)
		if (typeof page.path !== 'string' || !page.path.startsWith('/')) {
			problems.push(where + ' ("' + page.name + '") needs a "path" starting with /')
		}
		if (page.ready !== undefined && (typeof page.ready !== 'string' || page.ready.trim() === '')) {
			problems.push(where + ' ("' + page.name + '") has an empty "ready" selector')
		}
	})
	const exceptions = budget.exceptions === undefined ? [] : budget.exceptions
	if (!Array.isArray(exceptions)) {
		problems.push('"exceptions" must be a list')
		return problems
	}
	exceptions.forEach((exception, i) => {
		const where = 'exceptions[' + i + ']'
		if (!exception || typeof exception !== 'object') {
			problems.push(where + ' must be an object')
			return
		}
		const kinds = ['page', 'request'].filter((key) => typeof exception[key] === 'string' && exception[key] !== '')
		if (kinds.length !== 1) {
			problems.push(where + ' must name exactly one "page" or "request"')
		}
		if (exception.page !== undefined && !names.has(exception.page)) {
			problems.push(where + ' names page "' + exception.page + '", which is not in "pages"')
		}
		if (!Number.isInteger(exception.budgetMs) || exception.budgetMs <= 0) {
			problems.push(where + ' needs a positive integer "budgetMs"')
		}
		if (typeof exception.reason !== 'string' || exception.reason.trim().length < 10) {
			problems.push(where + ' needs a "reason" that says why')
		}
		if (typeof exception.expires !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(exception.expires)) {
			problems.push(where + ' needs an "expires" date as YYYY-MM-DD')
		}
	})
	return problems
}

/**
 * Load and validate the budget file.
 *
 * @param {object} [options] See {@link findBudgetFile}.
 * @return {object} The budget, with `file` set to its path.
 * @throws {Error} When the file is missing, unreadable or invalid.
 */
function loadBudget(options = {}) {
	const file = findBudgetFile(options)
	const budget = JSON.parse(fs.readFileSync(file, 'utf8'))
	const problems = validateBudget(budget)
	if (problems.length > 0) {
		throw new Error(file + ' is not a valid performance budget:\n  - ' + problems.join('\n  - '))
	}
	return { ...budget, file }
}

/**
 * The limit one page is held to in this run.
 *
 * The run's budget is `PERF_PAGE_BUDGET_MS`. An unexpired exception replaces
 * the 300 ms target with its own `budgetMs`, scaled by the same factor the run
 * applies (1000 / 300 in CI), so an exception means the same thing locally and
 * in CI. An expired exception no longer applies.
 *
 * @param {object} budget Loaded budget.
 * @param {string} pageName Page name.
 * @param {object} [options] Options.
 * @param {object} [options.env] Environment map.
 * @param {Date} [options.now] Clock.
 * @return {{limitMs: number, runBudgetMs: number, exception: object|null, expired: object|null}}
 */
function pageLimit(budget, pageName, options = {}) {
	const env = options.env || process.env
	const today = isoDay(options.now || new Date())
	const runBudgetMs = envInt(env, 'PERF_PAGE_BUDGET_MS', PAGE_TARGET_MS)
	const matches = (budget.exceptions || []).filter((e) => e.page === pageName)
	const exception = matches.find((e) => e.expires >= today) || null
	const expired = exception ? null : (matches[0] || null)
	const limitMs = exception
		? Math.round(exception.budgetMs * runBudgetMs / PAGE_TARGET_MS)
		: runBudgetMs
	return { limitMs, runBudgetMs, exception, expired }
}

/**
 * Median of a list of numbers.
 *
 * @param {number[]} values Values.
 * @return {number}
 */
function median(values) {
	const sorted = [...values].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)
	return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * Whether a request counts as a pending fetch of the page.
 *
 * @param {object} request Playwright `Request`.
 * @return {boolean}
 */
function isTracked(request) {
	const type = request.resourceType()
	if (type !== 'fetch' && type !== 'xhr') {
		return false
	}
	const url = request.url()
	return !IGNORED_REQUESTS.some((pattern) => pattern.test(url))
}

/**
 * Load one URL and measure when it becomes usable.
 *
 * @param {object} page Playwright `Page`.
 * @param {string} url Path or URL to load.
 * @param {object} [options] Options.
 * @param {string} [options.ready] Ready selector.
 * @param {number} [options.timeoutMs] Give up after this long.
 * @param {number} [options.quietMs] Settled window.
 * @param {() => number} [options.clock] Millisecond clock.
 * @return {Promise<{usableMs: number|null, requests: object[], pending: string[]}>}
 *   `usableMs` is null when the page did not become usable within the timeout.
 */
async function measureLoad(page, url, options = {}) {
	const clock = options.clock || (() => Date.now())
	const ready = options.ready || DEFAULT_READY
	const quietMs = options.quietMs ?? QUIET_MS
	const timeoutMs = options.timeoutMs ?? 10000
	const inflight = new Map()
	const requests = []
	let lastSettled

	const onRequest = (request) => {
		if (isTracked(request)) {
			inflight.set(request, clock())
		}
	}
	const onDone = (request) => {
		if (!inflight.has(request)) {
			return
		}
		const end = clock()
		requests.push({ method: request.method(), url: request.url(), ms: end - inflight.get(request) })
		inflight.delete(request)
		lastSettled = end
	}
	page.on('request', onRequest)
	page.on('requestfinished', onDone)
	page.on('requestfailed', onDone)

	const start = clock()
	lastSettled = start
	let usableAt = null
	try {
		await page.goto(url, { waitUntil: 'commit', timeout: timeoutMs })
		let settledSince = null
		let lookedReady = false
		while (clock() - start < timeoutMs) {
			const state = await page.evaluate(([readySelector, busySelector]) => {
				const visible = (el) => {
					const box = el.getBoundingClientRect()
					return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden'
				}
				const root = Array.from(document.querySelectorAll(readySelector)).find(visible)
				const busy = Array.from(document.querySelectorAll(busySelector)).some(visible)
				// Before `load` the bundles are still parsing: nothing has had a chance to fetch yet.
				return { ready: Boolean(root) && document.readyState === 'complete', busy }
			}, [ready, BUSY_SELECTOR]).catch(() => ({ ready: false, busy: true }))
			const now = clock()
			const looksReady = state.ready && !state.busy
			if (looksReady && inflight.size === 0) {
				// Already looking ready while the last request ran: usable when it ended.
				settledSince = settledSince ?? (lookedReady ? lastSettled : now)
				if (now - settledSince >= quietMs && now - lastSettled >= quietMs) {
					usableAt = settledSince
					break
				}
			} else {
				settledSince = null
			}
			lookedReady = looksReady
			await page.waitForTimeout(10)
		}
	} finally {
		page.off('request', onRequest)
		page.off('requestfinished', onDone)
		page.off('requestfailed', onDone)
	}
	return {
		usableMs: usableAt === null ? null : usableAt - start,
		requests,
		pending: Array.from(inflight.keys()).map((request) => request.method() + ' ' + request.url()),
	}
}

/**
 * Prime a page, then measure it `runs` times.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} target Page entry from `budget.json`.
 * @param {object} [options] Options for {@link measureLoad}, plus `runs`.
 * @return {Promise<{name: string, path: string, loads: number[], medianMs: number|null, failure: string|null, slowest: object[]}>}
 */
async function measurePage(page, target, options = {}) {
	const runs = options.runs ?? 3
	const prime = await measureLoad(page, target.path, { ...options, ready: target.ready })
	if (prime.usableMs === null) {
		return {
			name: target.name,
			path: target.path,
			loads: [],
			medianMs: null,
			failure: 'never became usable on the priming load; still pending: ' + (prime.pending.join(', ') || 'none (ready selector "' + (target.ready || DEFAULT_READY) + '" not visible, or a loading indicator stayed up)'),
			slowest: slowest(prime.requests),
		}
	}
	const loads = []
	const seen = []
	for (let i = 0; i < runs; i++) {
		const result = await measureLoad(page, target.path, { ...options, ready: target.ready })
		seen.push(...result.requests)
		if (result.usableMs === null) {
			return {
				name: target.name,
				path: target.path,
				loads,
				medianMs: null,
				failure: 'not usable on warm load ' + (i + 1) + '; still pending: ' + (result.pending.join(', ') || 'none'),
				slowest: slowest(seen),
			}
		}
		loads.push(result.usableMs)
	}
	return { name: target.name, path: target.path, loads, medianMs: median(loads), failure: null, slowest: slowest(seen) }
}

/**
 * The slowest requests seen, slowest first.
 *
 * @param {object[]} requests Measured requests.
 * @param {number} [count] How many.
 * @return {object[]}
 */
function slowest(requests, count = 8) {
	return [...requests].sort((a, b) => b.ms - a.ms).slice(0, count)
}

/**
 * The failure message for a page over its limit, with its request table.
 *
 * @param {object} result From {@link measurePage}.
 * @param {object} limit From {@link pageLimit}.
 * @return {string}
 */
function formatFailure(result, limit) {
	const head = result.failure
		? result.name + ' (' + result.path + ') ' + result.failure
		: result.name + ' (' + result.path + ') was usable in ' + result.medianMs + ' ms (median of '
			+ result.loads.join(', ') + ' ms), over its ' + limit.limitMs + ' ms budget'
	const rows = result.slowest.map((r) => '  ' + String(r.ms).padStart(6) + ' ms  ' + r.method + ' ' + r.url)
	const note = limit.expired
		? '\nAn exception for this page expired on ' + limit.expired.expires + ' and no longer applies.'
		: ''
	return head + note + (rows.length ? '\nSlowest requests during the warm loads:\n' + rows.join('\n') : '')
}

/**
 * Declare one Playwright test per page in the app's budget file.
 *
 * @param {object} test Playwright's `test` function, with its `describe`.
 * @param {object} [options] Options.
 * @param {string} [options.file] Budget file; see {@link findBudgetFile}.
 * @param {object} [options.env] Environment map.
 * @return {object} The loaded budget.
 */
function definePerformanceSpec(test, options = {}) {
	const env = options.env || process.env
	const budget = loadBudget(options)
	const runs = envInt(env, 'PERF_PAGE_RUNS', 3)

	test.describe('performance budget (ADR-124)', () => {
		for (const target of budget.pages) {
			test(target.name + ' is usable within its budget', async ({ page }, testInfo) => {
				const limit = pageLimit(budget, target.name, { env })
				const timeoutMs = Math.max(10000, limit.limitMs * 10)
				test.setTimeout(timeoutMs * (runs + 2))
				await seedFirstVisitOverlaysSeen(page, budget.app).catch(() => {})
				const result = await measurePage(page, target, { runs, timeoutMs })
				testInfo.annotations.push({
					type: 'performance',
					description: result.medianMs === null
						? target.name + ': not usable'
						: target.name + ': ' + result.medianMs + ' ms of ' + limit.limitMs + ' ms',
				})
				await testInfo.attach('performance-' + target.name + '.json', {
					body: JSON.stringify({ ...result, limitMs: limit.limitMs, exception: limit.exception }, null, 2),
					contentType: 'application/json',
				})
				if (result.medianMs === null || result.medianMs > limit.limitMs) {
					throw new Error(formatFailure(result, limit))
				}
			})
		}
	})
	return budget
}

module.exports = {
	PAGE_TARGET_MS,
	API_TARGET_MS,
	BUDGET_FILE,
	DEFAULT_READY,
	BUSY_SELECTOR,
	IGNORED_REQUESTS,
	findBudgetFile,
	validateBudget,
	loadBudget,
	pageLimit,
	median,
	isTracked,
	measureLoad,
	measurePage,
	formatFailure,
	definePerformanceSpec,
}
