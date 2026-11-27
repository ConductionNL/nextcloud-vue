/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/testing/performance`: the fleet's page budget
 * (hydra ADR-124, "Speed is a test").
 *
 * The speed rule (Ruben, 27 Nov 2026, replacing the flat 300 ms): a main page
 * of an app may add at most 150 ms to the Nextcloud floor for a full page
 * load, warm (page total <= floor + 150 ms), and its first useful content (the
 * largest contentful paint inside the page's main region) appears within
 * 300 ms. The floor is the bare Nextcloud Dashboard, measured in the same run
 * on the same stack. An app lists its main pages in
 * `tests/performance/budget.json` and adds one spec:
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
 * `PERF_PAGE_RUNS` times (default 3); the floor page the same way, once per
 * worker. The verdict is the median of the measured loads. The 150 ms
 * allowance and the 300 ms first-content target scale with
 * `PERF_PAGE_BUDGET_MS / 300` (default 300, so factor 1; the shared CI
 * workflow sets 1000 on pull requests and pushes, because its runners are
 * shared and slower). `PERF_FLOOR_PATH` names another floor page;
 * `PERF_FLOOR_MS` supplies a floor measured elsewhere (for example on the
 * same stack with every Conduction app disabled) instead of measuring one.
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

/**
 * The scale the run budget is expressed in: `PERF_PAGE_BUDGET_MS / PAGE_TARGET_MS`
 * is the factor every page target is multiplied by in a run. Also the flat
 * page target used when no floor is known.
 */
const PAGE_TARGET_MS = 300

/** What a page may add to the Nextcloud floor for a full load, in ms, warm. */
const FLOOR_ALLOWANCE_MS = 150

/** Target for the first useful content (main-region LCP), in ms from navigation. */
const FIRST_CONTENT_TARGET_MS = 300

/** The floor page: the bare Nextcloud Dashboard. */
const FLOOR_PATH = '/index.php/apps/dashboard/'

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
 * The limits one page is held to in this run.
 *
 * With a floor (`options.floorMs`, the median full load of the floor page in
 * this run) the page's total may be at most `floorMs + allowanceMs`, where
 * the allowance is 150 ms scaled by the run's factor
 * (`PERF_PAGE_BUDGET_MS / 300`, so 500 ms in CI). An unexpired exception
 * replaces the 150 ms allowance with its own `budgetMs` (ms over the floor, at
 * target scale), scaled the same way. An expired exception no longer applies.
 *
 * Without a floor the page is held to the flat run budget (or the exception's
 * scaled `budgetMs`) as before.
 *
 * The first useful content is held to 300 ms scaled by the same factor; an
 * exception does not change that.
 *
 * @param {object} budget Loaded budget.
 * @param {string} pageName Page name.
 * @param {object} [options] Options.
 * @param {object} [options.env] Environment map.
 * @param {Date} [options.now] Clock.
 * @param {number|null} [options.floorMs] The floor measured in this run.
 * @return {{limitMs: number, runBudgetMs: number, floorMs: number|null, allowanceMs: number|null, firstContentLimitMs: number, exception: object|null, expired: object|null}}
 */
function pageLimit(budget, pageName, options = {}) {
	const env = options.env || process.env
	const today = isoDay(options.now || new Date())
	const runBudgetMs = envInt(env, 'PERF_PAGE_BUDGET_MS', PAGE_TARGET_MS)
	const factor = runBudgetMs / PAGE_TARGET_MS
	const matches = (budget.exceptions || []).filter((e) => e.page === pageName)
	const exception = matches.find((e) => e.expires >= today) || null
	const expired = exception ? null : (matches[0] || null)
	const floorMs = Number.isFinite(options.floorMs) ? options.floorMs : null
	const firstContentLimitMs = Math.round(FIRST_CONTENT_TARGET_MS * factor)
	if (floorMs === null) {
		const limitMs = exception ? Math.round(exception.budgetMs * factor) : runBudgetMs
		return { limitMs, runBudgetMs, floorMs: null, allowanceMs: null, firstContentLimitMs, exception, expired }
	}
	const allowanceMs = Math.round((exception ? exception.budgetMs : FLOOR_ALLOWANCE_MS) * factor)
	return { limitMs: floorMs + allowanceMs, runBudgetMs, floorMs, allowanceMs, firstContentLimitMs, exception, expired }
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
 * Installed before every document of a measured page: records each
 * largest-contentful-paint candidate with its element, so the first useful
 * content can be read for the page's main region after the load.
 */
const PAINT_RECORDER = `(() => {
	if (window.__cnPerfPaint) return
	const store = window.__cnPerfPaint = { lcp: [] }
	try {
		new PerformanceObserver((list) => {
			for (const e of list.getEntries()) store.lcp.push({ t: e.renderTime || e.loadTime || e.startTime, el: e.element || null })
		}).observe({ type: 'largest-contentful-paint', buffered: true })
	} catch (e) {}
})()`

/** Pages that already carry the paint recorder. */
const recording = new WeakSet()

/**
 * Install the paint recorder on a page once. A page without `addInitScript`
 * (a test double, a non-Playwright runner) reports no paint times.
 *
 * @param {object} page Playwright `Page`.
 * @return {Promise<void>}
 */
async function recordPaints(page) {
	if (recording.has(page) || typeof page.addInitScript !== 'function') {
		return
	}
	recording.add(page)
	await page.addInitScript(PAINT_RECORDER)
}

/**
 * Read the paint times of the loaded document, in ms from navigation start.
 * `firstContentMs` is the last LCP candidate inside the visible ready root
 * (the main region), else the last LCP candidate of the page
 * (`firstContentSource` says which); null when the browser reports no LCP
 * (not Chromium) or the recorder is absent. LCP only considers text and
 * images, so a main region holding neither falls back to the page's LCP.
 *
 * @param {object} page Playwright `Page`.
 * @param {string} ready Ready selector.
 * @return {Promise<{firstContentMs: number|null, lcpMs: number|null, fcpMs: number|null}>}
 */
async function readPaints(page, ready) {
	const none = { firstContentMs: null, lcpMs: null, fcpMs: null }
	if (typeof page.addInitScript !== 'function') {
		return none
	}
	const paints = await page.evaluate((readySelector) => {
		const store = window.__cnPerfPaint
		const fcp = performance.getEntriesByName('first-contentful-paint')[0]
		const fcpMs = fcp ? Math.round(fcp.startTime) : null
		if (!store || store.lcp.length === 0) {
			return { firstContentMs: null, lcpMs: null, fcpMs }
		}
		const visible = (el) => {
			const box = el.getBoundingClientRect()
			return box.width > 0 && box.height > 0
		}
		const root = Array.from(document.querySelectorAll(readySelector)).find(visible)
		const inMain = root ? store.lcp.filter((e) => e.el && root.contains(e.el)) : []
		const last = (list) => Math.round(list[list.length - 1].t)
		return {
			firstContentMs: inMain.length ? last(inMain) : last(store.lcp),
			firstContentSource: inMain.length ? 'main' : 'page',
			lcpMs: last(store.lcp),
			fcpMs,
		}
	}, ready).catch(() => none)
	return paints || none
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
 * @return {Promise<{usableMs: number|null, firstContentMs: number|null, lcpMs: number|null, fcpMs: number|null, requests: object[], pending: string[]}>}
 *   `usableMs` (the total full load) is null when the page did not become
 *   usable within the timeout. The paint times are null when the browser
 *   reports none; see {@link readPaints}.
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

	await recordPaints(page)
	const start = clock()
	lastSettled = start
	let usableAt = null
	let paints = { firstContentMs: null, lcpMs: null, fcpMs: null }
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
		if (usableAt !== null) {
			paints = await readPaints(page, ready)
		}
	} finally {
		page.off('request', onRequest)
		page.off('requestfinished', onDone)
		page.off('requestfailed', onDone)
	}
	return {
		usableMs: usableAt === null ? null : usableAt - start,
		...paints,
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
 * @return {Promise<{name: string, path: string, loads: number[], medianMs: number|null, firstContent: number[], firstContentMs: number|null, failure: string|null, slowest: object[]}>}
 *   `medianMs` is the median total full load; `firstContentMs` the median
 *   first useful content, null when the browser reported none.
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
			firstContent: [],
			firstContentMs: null,
			failure: 'never became usable on the priming load; still pending: ' + (prime.pending.join(', ') || 'none (ready selector "' + (target.ready || DEFAULT_READY) + '" not visible, or a loading indicator stayed up)'),
			slowest: slowest(prime.requests),
		}
	}
	const loads = []
	const firstContent = []
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
				firstContent,
				firstContentMs: null,
				failure: 'not usable on warm load ' + (i + 1) + '; still pending: ' + (result.pending.join(', ') || 'none'),
				slowest: slowest(seen),
			}
		}
		loads.push(result.usableMs)
		if (Number.isFinite(result.firstContentMs)) {
			firstContent.push(result.firstContentMs)
		}
	}
	return {
		name: target.name,
		path: target.path,
		loads,
		medianMs: median(loads),
		firstContent,
		firstContentMs: firstContent.length === loads.length ? median(firstContent) : null,
		failure: null,
		slowest: slowest(seen),
	}
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
 * Whether a measured page meets its limits.
 *
 * @param {object} result From {@link measurePage}.
 * @param {object} limit From {@link pageLimit}.
 * @return {boolean}
 */
function withinLimits(result, limit) {
	if (result.failure || result.medianMs === null || result.medianMs > limit.limitMs) {
		return false
	}
	return !(limit.floorMs !== null && limit.floorMs !== undefined
		&& Number.isFinite(result.firstContentMs) && result.firstContentMs > limit.firstContentLimitMs)
}

/**
 * One line per page in the report: floor, total, total minus floor and first
 * useful content, each against its limit.
 *
 * @param {object} result From {@link measurePage}.
 * @param {object} limit From {@link pageLimit}.
 * @return {string}
 */
function formatSummary(result, limit) {
	if (result.medianMs === null) {
		return result.name + ': not usable'
	}
	const content = Number.isFinite(result.firstContentMs)
		? result.firstContentMs + ' ms (limit ' + limit.firstContentLimitMs + ')'
		: 'not reported'
	if (limit.floorMs === null || limit.floorMs === undefined) {
		return result.name + ': ' + result.medianMs + ' ms of ' + limit.limitMs + ' ms, first useful content ' + content
	}
	const over = result.medianMs - limit.floorMs
	return result.name + ': floor ' + limit.floorMs + ' ms, total ' + result.medianMs + ' ms, total - floor '
		+ (over >= 0 ? '+' : '') + over + ' ms (limit +' + limit.allowanceMs + '), first useful content ' + content
}

/**
 * The failure message for a page over its limits, with its request table.
 *
 * @param {object} result From {@link measurePage}.
 * @param {object} limit From {@link pageLimit}.
 * @return {string}
 */
function formatFailure(result, limit) {
	const loadsText = '(median of ' + result.loads.join(', ') + ' ms)'
	const hasFloor = limit.floorMs !== null && limit.floorMs !== undefined
	const problems = []
	if (!result.failure && hasFloor) {
		const over = result.medianMs - limit.floorMs
		if (result.medianMs > limit.limitMs) {
			problems.push('loaded in ' + result.medianMs + ' ms ' + loadsText + ', ' + over + ' ms over the '
				+ limit.floorMs + ' ms Nextcloud floor; a page may add at most ' + limit.allowanceMs + ' ms')
		}
		if (Number.isFinite(result.firstContentMs) && result.firstContentMs > limit.firstContentLimitMs) {
			problems.push('showed its first useful content at ' + result.firstContentMs + ' ms (median of '
				+ result.firstContent.join(', ') + ' ms), over the ' + limit.firstContentLimitMs + ' ms target')
		}
	}
	let head
	if (result.failure) {
		head = result.name + ' (' + result.path + ') ' + result.failure
	} else if (hasFloor) {
		head = result.name + ' (' + result.path + ') ' + problems.join('; and ')
	} else {
		head = result.name + ' (' + result.path + ') was usable in ' + result.medianMs + ' ms ' + loadsText
			+ ', over its ' + limit.limitMs + ' ms budget'
	}
	const rows = result.slowest.map((r) => '  ' + String(r.ms).padStart(6) + ' ms  ' + r.method + ' ' + r.url)
	const note = limit.expired
		? '\nAn exception for this page expired on ' + limit.expired.expires + ' and no longer applies.'
		: ''
	return head + note + (rows.length ? '\nSlowest requests during the warm loads:\n' + rows.join('\n') : '')
}

/** Floor measurements of this worker, by floor path: one per run, shared by every page test. */
const floors = new Map()

/**
 * Where a run keeps its floor, so a worker Playwright restarts after a failed
 * test reuses it instead of measuring again. Null without a cache directory.
 *
 * @param {string|undefined} cacheDir Directory that lives for one run (the project's output dir).
 * @param {string} floorPath Floor page.
 * @return {string|null}
 */
function floorCacheFile(cacheDir, floorPath) {
	return cacheDir ? path.join(cacheDir, '.perf-floor-' + floorPath.replace(/[^a-z0-9]+/gi, '_') + '.json') : null
}

/**
 * The Nextcloud floor for this run: `PERF_FLOOR_MS` when set, else the floor
 * page (`PERF_FLOOR_PATH`, default the Dashboard) primed and measured like an
 * app page, once per run. Within a worker the measurement is shared in
 * memory; across workers (Playwright starts a new one after every failed
 * test) through `options.cacheDir`, which must live for one run only.
 *
 * @param {object} page Playwright `Page`.
 * @param {object} [options] Options.
 * @param {object} [options.env] Environment map.
 * @param {number} [options.runs] Warm loads.
 * @param {number} [options.timeoutMs] Per-load timeout.
 * @param {() => number} [options.clock] Millisecond clock.
 * @param {string} [options.cacheDir] Run-scoped directory to share the floor through.
 * @return {Promise<{path: string, medianMs: number|null, loads: number[], firstContentMs: number|null, source: string, failure: string|null}>}
 */
function measureFloor(page, options = {}) {
	const env = options.env || process.env
	const given = envInt(env, 'PERF_FLOOR_MS', 0)
	const floorPath = String(env.PERF_FLOOR_PATH || '').trim() || FLOOR_PATH
	if (given > 0) {
		return Promise.resolve({ path: floorPath, medianMs: given, loads: [], firstContentMs: null, source: 'PERF_FLOOR_MS', failure: null })
	}
	if (floors.has(floorPath)) {
		return floors.get(floorPath)
	}
	const file = floorCacheFile(options.cacheDir, floorPath)
	if (file) {
		try {
			const stored = JSON.parse(fs.readFileSync(file, 'utf8'))
			if (stored && Number.isFinite(stored.medianMs) && !stored.failure) {
				const shared = Promise.resolve(stored)
				floors.set(floorPath, shared)
				return shared
			}
		} catch {
			// Not measured yet in this run.
		}
	}
	const pending = measurePage(page, { name: 'Nextcloud floor', path: floorPath }, { runs: options.runs, timeoutMs: options.timeoutMs, clock: options.clock })
		.then((result) => ({ path: floorPath, medianMs: result.medianMs, loads: result.loads, firstContentMs: result.firstContentMs, source: 'measured', failure: result.failure }))
	floors.set(floorPath, pending)
	pending.then((floor) => {
		if (floor.failure) {
			// A failed floor is not kept: the next page test tries again.
			floors.delete(floorPath)
			return
		}
		if (file) {
			try {
				fs.mkdirSync(path.dirname(file), { recursive: true })
				fs.writeFileSync(file, JSON.stringify(floor))
			} catch {
				// Sharing is an optimisation; the in-memory floor still holds.
			}
		}
	}, () => floors.delete(floorPath))
	return pending
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
				const runLimit = pageLimit(budget, target.name, { env })
				const timeoutMs = Math.max(10000, runLimit.limitMs * 10)
				test.setTimeout(timeoutMs * (2 * runs + 4))
				await seedFirstVisitOverlaysSeen(page, budget.app).catch(() => {})
				const floor = await measureFloor(page, { env, runs, timeoutMs, cacheDir: testInfo.project && testInfo.project.outputDir })
				if (floor.failure || floor.medianMs === null) {
					throw new Error('The Nextcloud floor page (' + floor.path + ') ' + (floor.failure || 'was not measured')
						+ '; without it no page can be judged. Set PERF_FLOOR_PATH or PERF_FLOOR_MS.')
				}
				const limit = pageLimit(budget, target.name, { env, floorMs: floor.medianMs })
				const result = await measurePage(page, target, { runs, timeoutMs })
				testInfo.annotations.push({ type: 'performance', description: formatSummary(result, limit) })
				await testInfo.attach('performance-' + target.name + '.json', {
					body: JSON.stringify({
						...result,
						floor,
						overFloorMs: result.medianMs === null ? null : result.medianMs - floor.medianMs,
						limitMs: limit.limitMs,
						allowanceMs: limit.allowanceMs,
						firstContentLimitMs: limit.firstContentLimitMs,
						exception: limit.exception,
					}, null, 2),
					contentType: 'application/json',
				})
				if (!withinLimits(result, limit)) {
					throw new Error(formatFailure(result, limit))
				}
			})
		}
	})
	return budget
}

module.exports = {
	PAGE_TARGET_MS,
	FLOOR_ALLOWANCE_MS,
	FIRST_CONTENT_TARGET_MS,
	FLOOR_PATH,
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
	measureFloor,
	withinLimits,
	formatSummary,
	formatFailure,
	definePerformanceSpec,
}
